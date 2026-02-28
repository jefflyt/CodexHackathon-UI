---
name: mandate-2-3-6-code-evaluation
description: Evaluate compliance for Mandate 2.3.6 (UI Transparency and Manifest Validation) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.3.6 Code Evaluation Skill

## Mandate
- ID: 2.3.6
- Title: UI Transparency and Manifest Validation

## Mitigates
- MCP01 Tool Poisoning and Rug Pull Attack

## Inputs
- Frontend UI code
- Tool activation workflows
- Manifest rendering components
- CI/CD workflows

## Workflow
1. Identify tool activation flows.
   - Find UI routes/components where tools are enabled, connected, or approved.
2. Verify full manifest display.
   - Confirm UI renders complete manifest fields (name, description, parameters, permissions, source/version) before activation.
3. Detect hidden/truncated manifest behavior.
   - Flag summary-only views, collapsed critical fields, or omitted permission scopes.
4. Verify explicit user acknowledgment.
   - Confirm activation requires user confirmation after full manifest render.
5. Verify automated manifest scanning integration.
   - Detect `mcp-scan` or equivalent checks in CI/pre-activation workflows.
6. Verify scanner enforcement.
   - Confirm builds/activations fail on malicious keywords, hidden instructions, or policy violations.
7. Emit findings with affected UI path and manifest field gaps.

## Decision Rules
- Pass if full manifest is always shown pre-activation and scanner checks are enforced.
- Fail if activation can occur without complete transparency and scan enforcement.

## Severity Rules
- High: activation allowed with hidden or truncated critical manifest details.
- Medium: full display exists but automated scanning is absent/non-blocking.

## Output Template
```json
{
  "mandate_id": "2.3.6",
  "status": "fail",
  "severity": "high",
  "vulnerability_tags": ["MCP01"],
  "evidence": [
    {"file": "web/src/components/ToolConnectModal.tsx", "line": 88, "detail": "Permissions field omitted from pre-activation view"},
    {"file": ".github/workflows/ci.yml", "line": 59, "detail": "No manifest scanner step"}
  ],
  "remediation": "Render complete manifest and enforce blocking manifest scan before tool activation."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
