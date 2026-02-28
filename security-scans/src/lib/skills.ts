import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import type { SkillDescriptor } from "./types.js";

const CODE_EVAL_PATTERN = /(code-static-eval|code-evaluation)$/;

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

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function syncSkillpackRepo(repoUrl: string, clonePath: string): Promise<void> {
  const gitDir = path.join(clonePath, ".git");
  if (await pathExists(gitDir)) {
    await runCommand("git", ["-C", clonePath, "pull", "--ff-only"]);
    return;
  }

  const parent = path.dirname(clonePath);
  await mkdir(parent, { recursive: true });
  await runCommand("git", ["clone", "--depth", "1", repoUrl, clonePath]);
}

export async function discoverCodeEvalSkills(skillpackClonePath: string): Promise<SkillDescriptor[]> {
  const skillRoot = path.join(skillpackClonePath, "skills");
  const entries = await readdir(skillRoot, { withFileTypes: true });

  const selected = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => CODE_EVAL_PATTERN.test(name))
    .sort();

  const skills: SkillDescriptor[] = [];

  for (const name of selected) {
    const skillMdPath = path.join(skillRoot, name, "SKILL.md");
    const skillMdContent = await readFile(skillMdPath, "utf8");
    skills.push({ name, skillMdPath, skillMdContent });
  }

  return skills;
}
