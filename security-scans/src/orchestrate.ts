import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pLimit from "p-limit";

import { createCodexClient, runSkillThread } from "./lib/codex.js";
import {
  cloneTargetRepo,
  ensureScanRoots,
  makeRunId,
  prepareRunFolders
} from "./lib/repo.js";
import { discoverCodeEvalSkills, syncSkillpackRepo } from "./lib/skills.js";
import type { ScanRunConfig, ScanSummary, SkillDescriptor, SkillRunResult } from "./lib/types.js";

const DEFAULT_MODEL = process.env.CODEX_MODEL || "codex-mini-latest";
const DEFAULT_MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || "4");
const DEFAULT_SKILLPACK_REPO_URL =
  "https://github.com/zey-2/security_skillpacks.git";

function usage(): string {
  return [
    "Usage:",
    "  npm run scan -- --repo-url <https://github.com/org/repo.git> [options]",
    "",
    "Options:",
    "  --repo-url <url>           Target repository HTTPS URL (required)",
    "  --max-concurrency <n>      Parallel skill threads (default: 4)",
    "  --model <name>             Codex model name (default: codex-mini-latest)",
    "  --run-id <id>              Explicit run id (default: timestamp)",
    "  --skillpack-url <url>      Skillpack git URL",
    "  --dry-run                  Discover skills and print plan only"
  ].join("\n");
}

function parseArgs(argv: string[]): {
  repoUrl: string;
  maxConcurrency: number;
  model: string;
  runId: string;
  dryRun: boolean;
  skillpackUrl: string;
} {
  let repoUrl = "";
  let maxConcurrency = DEFAULT_MAX_CONCURRENCY;
  let model = DEFAULT_MODEL;
  let runId = makeRunId();
  let dryRun = false;
  let skillpackUrl = DEFAULT_SKILLPACK_REPO_URL;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--repo-url") {
      repoUrl = argv[i + 1] || "";
      i += 1;
      continue;
    }

    if (arg === "--max-concurrency") {
      maxConcurrency = Number(argv[i + 1] || "");
      i += 1;
      continue;
    }

    if (arg === "--model") {
      model = argv[i + 1] || model;
      i += 1;
      continue;
    }

    if (arg === "--run-id") {
      runId = argv[i + 1] || runId;
      i += 1;
      continue;
    }

    if (arg === "--skillpack-url") {
      skillpackUrl = argv[i + 1] || skillpackUrl;
      i += 1;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }

    throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
  }

  if (!repoUrl) {
    throw new Error(`Missing --repo-url\n\n${usage()}`);
  }

  if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
    throw new Error("--max-concurrency must be a positive integer");
  }

  return {
    repoUrl,
    maxConcurrency,
    model,
    runId,
    dryRun,
    skillpackUrl
  };
}

function isRetryableError(errorMessage: string | null): boolean {
  if (!errorMessage) {
    return false;
  }

  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes("rate") ||
    normalized.includes("429") ||
    normalized.includes("timeout") ||
    normalized.includes("temporar") ||
    normalized.includes("econnreset")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runSkillWithRetries(params: {
  config: ScanRunConfig;
  client: Awaited<ReturnType<typeof createCodexClient>>;
  skill: SkillDescriptor;
  maxAttempts?: number;
}): Promise<SkillRunResult> {
  const maxAttempts = params.maxAttempts ?? 3;

  let latest: SkillRunResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    latest = await runSkillThread({
      client: params.client,
      skill: params.skill,
      repoRoot: params.config.targetRepoPath,
      model: params.config.model
    });

    if (latest.status === "success") {
      return latest;
    }

    if (attempt === maxAttempts || !isRetryableError(latest.error)) {
      return latest;
    }

    const backoff = 500 * 2 ** (attempt - 1);
    await delay(backoff);
  }

  return (
    latest ?? {
      skillName: params.skill.name,
      status: "failed",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      outputFile: null,
      error: "Unknown skill execution error.",
      response: null,
      rawResponse: null,
      threadId: null
    }
  );
}

async function writeSkillResult(runResultRoot: string, result: SkillRunResult): Promise<SkillRunResult> {
  const outputPath = path.join(runResultRoot, `${result.skillName}.json`);
  const payload = {
    ...result,
    outputFile: outputPath
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return payload;
}

function printDryRun(config: ScanRunConfig, skillNames: string[]): void {
  console.log("Dry run configuration:");
  console.log(`- runId: ${config.runId}`);
  console.log(`- repoUrl: ${config.repoUrl}`);
  console.log(`- model: ${config.model}`);
  console.log(`- maxConcurrency: ${config.maxConcurrency}`);
  console.log(`- skillpackClonePath: ${config.skillpackClonePath}`);
  console.log(`- targetRepoPath: ${config.targetRepoPath}`);
  console.log(`- resultDir: ${config.resultDir}`);
  console.log("");
  console.log(`Discovered ${skillNames.length} code-eval skills:`);

  for (const name of skillNames) {
    console.log(`- ${name}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.OPENAI_API_KEY && !args.dryRun) {
    throw new Error("OPENAI_API_KEY is required unless --dry-run is used.");
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const scansRoot = path.resolve(__dirname, "..");

  const roots = await ensureScanRoots(scansRoot);
  const skillpackClonePath = path.join(roots.skillpacksRoot, "security_skillpacks");

  await syncSkillpackRepo(args.skillpackUrl, skillpackClonePath);

  const skills = await discoverCodeEvalSkills(skillpackClonePath);
  if (skills.length === 0) {
    throw new Error("No code-eval skills found in cloned skillpack repository.");
  }

  const runPaths = await prepareRunFolders(roots.workspacesRoot, roots.resultsRoot, args.runId);
  await mkdir(runPaths.runResultRoot, { recursive: true });

  const config: ScanRunConfig = {
    repoUrl: args.repoUrl,
    maxConcurrency: args.maxConcurrency,
    runId: args.runId,
    dryRun: args.dryRun,
    model: args.model,
    skillpackRepoUrl: args.skillpackUrl,
    skillpackClonePath,
    targetRepoPath: runPaths.targetRepoPath,
    resultDir: runPaths.runResultRoot
  };

  if (args.dryRun) {
    printDryRun(config, skills.map((skill) => skill.name));
    return;
  }

  await cloneTargetRepo(args.repoUrl, runPaths.targetRepoPath);

  const startedAt = new Date().toISOString();
  const limit = pLimit(args.maxConcurrency);
  const client = await createCodexClient();

  const jobs = skills.map((skill) =>
    limit(async () => {
      const result = await runSkillWithRetries({
        config,
        client,
        skill
      });

      return writeSkillResult(runPaths.runResultRoot, result);
    })
  );

  const settled = await Promise.all(jobs);

  const summary: ScanSummary = {
    runId: args.runId,
    repoUrl: args.repoUrl,
    repoPath: runPaths.targetRepoPath,
    skillpackPath: skillpackClonePath,
    model: args.model,
    skillsDiscovered: skills.length,
    skillsExecuted: settled.length,
    successCount: settled.filter((item) => item.status === "success").length,
    failureCount: settled.filter((item) => item.status === "failed").length,
    startedAt,
    endedAt: new Date().toISOString(),
    results: settled
  };

  const summaryPath = path.join(runPaths.runResultRoot, "summary.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`Run complete: ${args.runId}`);
  console.log(`- skills discovered: ${summary.skillsDiscovered}`);
  console.log(`- skills executed: ${summary.skillsExecuted}`);
  console.log(`- success: ${summary.successCount}`);
  console.log(`- failed: ${summary.failureCount}`);
  console.log(`- summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
