# Import-Ready Skills

This repository now includes an import-ready `skills/` directory with one folder per skill.

- Total skills: 37
- Source collections:
  - `sources/partial-code-evaluable-skillpacks`
  - `sources/non-code-evaluable-skillpacks`
  - `sources/code-evaluable-skillpacks`
- Import-ready collection: `skills/`

## Directory Layout

```text
security_skillpacks/
  skills/
    mandate-2-1-1-code-static-eval/
      SKILL.md
    ...
  sources/
    partial-code-evaluable-skillpacks/
      <mandate>/<workflow>/SKILL.md
    non-code-evaluable-skillpacks/
      <mandate>/SKILL.md
    code-evaluable-skillpacks/
      <mandate>/SKILL.md
```

## Import Into Your Codex Setup

Run from this repository root:

```bash
scripts/import_skills.sh --all
```

Optional: set `CODEX_HOME` first if your Codex home is not `~/.codex`.

List available skills:

```bash
scripts/import_skills.sh --list
```

Import only one skill (example):

```bash
scripts/import_skills.sh mandate-2-3-2-code-static-eval
```

## Verify Installed Skills

```bash
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
find "$CODEX_HOME/skills" -maxdepth 2 -name SKILL.md | sort
```

## Skill Catalog

See `skills/CATALOG.md` for a mandate-by-mandate list with descriptions and source paths.
