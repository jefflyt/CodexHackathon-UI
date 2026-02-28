---
name: mandate-2-2-6-code-evaluation
description: Evaluate compliance for Mandate 2.2.6 (MCP Registry and Tool Integrity Pinning) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.2.6 Code Evaluation Skill

## Mandate
- ID: 2.2.6
- Title: MCP Registry and Tool Integrity Pinning

## Mitigates
- ASI02 Tool Misuse and Exploitation
- ASI04 Agentic Supply Chain Vulnerabilities
- MCP01 Tool Poisoning and Rug Pull Attack

## Inputs
- MCP config files
- Tool manifests
- Tool-loading code
- CI/CD workflows

## Workflow
1. Detect MCP usage.
   - Locate MCP client/server configs and tool registration code paths.
2. Build a tool source inventory.
   - Extract tool name, source URI, version, and manifest path/hash fields.
3. Validate trusted registry policy.
   - Flag direct arbitrary URLs and non-allowlisted domains.
4. Validate strict version pinning.
   - Flag `latest`, wildcard/range versions, or branch-based refs.
5. Validate manifest integrity pinning.
   - Check for cryptographic hash/signature fields in config and verification logic in code.
6. Validate runtime integrity checks.
   - Confirm code blocks activation when hash/signature validation fails.
7. Validate CI drift controls.
   - Confirm CI detects manifest content drift and fails unless approved pin updates are included.
8. Emit findings per tool with exact evidence paths.

## Decision Rules
- Pass if every external MCP tool is trusted-source constrained, version-pinned, and integrity-verified before activation.
- Fail if any tool bypasses one of these controls.

## Severity Rules
- Critical: arbitrary dynamic tool loading with no integrity validation.
- High: source and version controls exist but no manifest integrity verification.
- Medium: controls exist but no CI drift protection.

## Output Template
```json
{
  "mandate_id": "2.2.6",
  "status": "fail",
  "severity": "critical",
  "vulnerability_tags": ["ASI02", "ASI04", "MCP01"],
  "evidence": [
    {"file": "config/mcp.json", "line": 12, "detail": "Untrusted external tool source"},
    {"file": "src/mcp/loader.ts", "line": 77, "detail": "No manifest hash check before activation"}
  ],
  "remediation": "Enforce trusted registry allowlist, exact version pins, and required signature/hash verification."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
