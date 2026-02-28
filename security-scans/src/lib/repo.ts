import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

interface CmdResult {
  stdout: string;
  stderr: string;
}

function runCommand(cmd: string, args: string[], cwd?: string): Promise<CmdResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${cmd} ${args.join(" ")} failed (${code}): ${stderr || stdout}`));
    });
  });
}

export function makeRunId(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");

  return `${y}${m}${d}-${hh}${mm}${ss}-utc`;
}

export async function ensureScanRoots(baseDir: string): Promise<{
  skillpacksRoot: string;
  workspacesRoot: string;
  resultsRoot: string;
}> {
  const skillpacksRoot = path.join(baseDir, "skillpacks");
  const workspacesRoot = path.join(baseDir, "workspaces");
  const resultsRoot = path.join(baseDir, "results");

  await mkdir(skillpacksRoot, { recursive: true });
  await mkdir(workspacesRoot, { recursive: true });
  await mkdir(resultsRoot, { recursive: true });

  return { skillpacksRoot, workspacesRoot, resultsRoot };
}

export async function prepareRunFolders(workspacesRoot: string, resultsRoot: string, runId: string): Promise<{
  runWorkspaceRoot: string;
  targetRepoPath: string;
  runResultRoot: string;
}> {
  const runWorkspaceRoot = path.join(workspacesRoot, runId);
  const targetRepoPath = path.join(runWorkspaceRoot, "target-repo");
  const runResultRoot = path.join(resultsRoot, runId);

  await mkdir(runWorkspaceRoot, { recursive: true });
  await mkdir(runResultRoot, { recursive: true });

  return { runWorkspaceRoot, targetRepoPath, runResultRoot };
}

export async function cloneTargetRepo(repoUrl: string, targetRepoPath: string): Promise<void> {
  await mkdir(targetRepoPath, { recursive: true });

  const existing = await readdir(targetRepoPath);
  if (existing.length > 0) {
    throw new Error(`Target repository directory is not empty: ${targetRepoPath}`);
  }

  await runCommand("git", ["clone", "--depth", "1", repoUrl, "."], targetRepoPath);
}
