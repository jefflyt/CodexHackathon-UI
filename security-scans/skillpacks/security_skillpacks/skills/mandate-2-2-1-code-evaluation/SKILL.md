---
name: mandate-2-2-1-code-evaluation
description: Evaluate compliance for Mandate 2.2.1 (AI Supply Chain Security) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.2.1 Code Evaluation Skill

## Mandate
- ID: 2.2.1
- Title: AI Supply Chain Security

## Mitigates
- ML06 AI Supply Chain Attacks
- LLM03 Supply Chain
- ASI04 Agentic Supply Chain Vulnerabilities
- MCP06 Server Discovery and Verification

## Inputs
- Repository root
- Build manifests and lockfiles
- CI/CD workflow files
- Dependency/security policy files

## Workflow
1. Discover all dependency ecosystems in the repo.
   - Locate `package*.json`, `pnpm-lock.yaml`, `requirements*.txt`, `poetry.lock`, `Pipfile.lock`, `go.mod`, `go.sum`, `Cargo.toml`, `Cargo.lock`, `pom.xml`, `build.gradle*`, `Gemfile.lock`, `.csproj`, `packages.lock.json`.
2. Build a normalized dependency inventory.
   - Record package name, version constraint, source registry, environment (`prod`/`dev`), and lockfile status.
3. Detect pinning weaknesses.
   - Flag floating versions (`*`, `latest`, open ranges), mutable Git refs, and direct URL installs in production dependencies.
4. Verify inventory artifact generation.
   - Detect SBOM/AIBOM generation (CycloneDX/SPDX tools or scripts) in CI workflows or release scripts.
5. Verify automated vulnerability scans.
   - Detect scanners (`osv-scanner`, `npm audit`, `pip-audit`, `trivy`, `grype`, `snyk`, Dependabot, equivalent).
6. Verify policy enforcement.
   - Confirm CI fails builds on High/Critical findings; flag advisory-only scans.
7. Verify AI/MCP dependency tracking.
   - Confirm MCP servers/plugins/tools appear in inventory and scanning scope.
8. Emit findings with file/line evidence and concrete remediation.

## Decision Rules
- Pass if all production dependencies are pinned/locked, SBOM/AIBOM is generated, vulnerability scans run automatically, and policy gates enforce failure thresholds.
- Fail if any required control is missing or weak.

## Severity Rules
- Critical: no automated scanning and no lock/pin controls.
- High: scanning exists but not enforced, or multiple unpinned production dependencies.
- Medium: partial ecosystem coverage.

## Output Template
```json
{
  "mandate_id": "2.2.1",
  "status": "fail",
  "severity": "high",
  "vulnerability_tags": ["ML06", "LLM03", "ASI04", "MCP06"],
  "evidence": [
    {"file": ".github/workflows/ci.yml", "line": 38, "detail": "No dependency vulnerability scan step"},
    {"file": "package.json", "line": 19, "detail": "Production dependency uses floating version"}
  ],
  "remediation": "Pin production dependencies and enforce CI vulnerability scan gate."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
