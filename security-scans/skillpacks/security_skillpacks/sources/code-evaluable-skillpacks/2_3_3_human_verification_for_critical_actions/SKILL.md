---
name: mandate-2-3-3-code-evaluation
description: Evaluate compliance for Mandate 2.3.3 (Human Verification for Critical Actions) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.3.3 Code Evaluation Skill

## Mandate
- ID: 2.3.3
- Title: Human Verification for Critical Actions

## Mitigates
- LLM01 Prompt Injection
- LLM06 Excessive Agency
- ASI01 Agent Goal Hijack
- ASI02 Tool Misuse and Exploitation
- ASI09 Human-Agent Trust Exploitation
- MCP04 Tool Interference

## Inputs
- Agent orchestration code
- Action execution handlers
- Approval workflow modules
- Audit logging modules

## Workflow
1. Identify critical action sinks.
   - Include irreversible delete, fund transfer, access grants, production config changes, and other high-impact operations.
2. Build source-to-sink paths.
   - Trace AI decision/output paths that can invoke each critical sink.
3. Locate approval gate controls.
   - Verify a mandatory gate function exists before each sink (not after).
4. Validate gate strictness.
   - Confirm gate requires explicit user identity, approval decision, timestamp, and action scope.
5. Detect bypass paths.
   - Flag feature flags, debug modes, or alternate code paths that can call critical sinks without approval.
6. Validate fail-safe behavior.
   - Confirm default on gate errors/timeouts is deny/block, not allow.
7. Validate audit evidence.
   - Confirm approval decisions and execution linkage are logged with immutable identifiers.
8. Emit findings per sink with direct call-path evidence.

## Decision Rules
- Pass if every AI-reachable critical sink has a mandatory, non-bypassable pre-execution human approval gate.
- Fail if any sink lacks one or allows bypass.

## Severity Rules
- Critical: any high-impact sink reachable without approval.
- High: approval exists but bypassable or fail-open.
- Medium: approval exists but weak audit linkage.

## Output Template
```json
{
  "mandate_id": "2.3.3",
  "status": "fail",
  "severity": "critical",
  "vulnerability_tags": ["LLM01", "LLM06", "ASI01", "ASI02", "ASI09", "MCP04"],
  "evidence": [
    {"file": "src/actions/deleteAccount.ts", "line": 63, "detail": "Critical delete action executes without approval check"},
    {"file": "src/agent/router.ts", "line": 111, "detail": "AI output can directly invoke delete action"}
  ],
  "remediation": "Require explicit human approval gate before all critical action handlers and remove bypass paths."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
