# Security Scans (Codex SDK)

This module runs one Codex thread per security code-eval skill.

## What It Does

- Clones security skillpacks from `https://github.com/zey-2/security_skillpacks.git`
- Discovers code-eval skills only (`*-code-static-eval`, `*-code-evaluation`)
- Clones a repo-of-interest into a run-specific workspace
- Executes each skill in bounded parallelism
- Writes one JSON result per skill and one `summary.json`

## Layout

- `skillpacks/` cloned skillpack repository
- `workspaces/` run-specific cloned target repositories
- `results/` run-specific skill outputs and summary

## Prerequisites

- Node.js 18+
- npm
- git
- `OPENAI_API_KEY` exported in the shell or in `.env`

## Setup

```bash
cd security-scans
npm install
cp .env.example .env
# edit .env and set OPENAI_API_KEY
```

## Dry Run

```bash
npm run scan:dry -- --repo-url https://github.com/example/repo.git
```

## Execute Scan

```bash
npm run scan -- --repo-url https://github.com/example/repo.git
```

Optional flags:

- `--max-concurrency 4`
- `--model gpt-5.3-codex`
- `--run-id my-custom-run-id`
- `--skillpack-url https://github.com/zey-2/security_skillpacks.git`

## Output

Results are written to:

- `results/<run-id>/<skill-name>.json`
- `results/<run-id>/summary.json`

Each per-skill file includes status, timestamps, optional error, and parsed model response.
