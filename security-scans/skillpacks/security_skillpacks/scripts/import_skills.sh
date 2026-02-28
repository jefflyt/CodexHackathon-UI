#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/skills"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="$CODEX_HOME/skills"

print_usage() {
  cat <<'USAGE'
Usage:
  scripts/import_skills.sh --list
  scripts/import_skills.sh --all
  scripts/import_skills.sh <skill-name> [<skill-name> ...]

Environment:
  CODEX_HOME   Optional. Defaults to ~/.codex
USAGE
}

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Missing source directory: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"

if [[ $# -eq 0 ]]; then
  print_usage
  exit 1
fi

if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  print_usage
  exit 0
fi

if [[ "$1" == "--list" ]]; then
  find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
  exit 0
fi

if [[ "$1" == "--all" ]]; then
  cp -R "$SOURCE_DIR"/. "$TARGET_DIR"/
  total=$(find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
  echo "Imported $total skills to $TARGET_DIR"
  exit 0
fi

for skill in "$@"; do
  if [[ ! -d "$SOURCE_DIR/$skill" ]]; then
    echo "Skill not found: $skill" >&2
    echo "Use --list to view available skills." >&2
    exit 1
  fi
  cp -R "$SOURCE_DIR/$skill" "$TARGET_DIR"/
  echo "Imported: $skill"
done
