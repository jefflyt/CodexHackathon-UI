---
name: mandate-2-3-5-code-evaluation
description: Evaluate compliance for Mandate 2.3.5 (Secure Input and Goal Management) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.3.5 Code Evaluation Skill

## Mandate
- ID: 2.3.5
- Title: Secure Input and Goal Management

## Mitigates
- ML01 Input Manipulation Attack
- LLM01 Prompt Injection
- ASI01 Agent Goal Hijack
- MCP02 Prompt Injection

## Inputs
- Input handling code
- Prompt construction code
- Goal/state management code
- Policy and moderation modules

## Workflow
1. Enumerate input ingress points.
   - User chat, uploaded files, tool outputs, memory retrieval, web/API connectors.
2. Map ingress to model prompts and goal update functions.
   - Identify direct concatenation or untrusted interpolation points.
3. Validate layered filtering.
   - Verify syntactic filters (patterns, token constraints, format rules).
   - Verify semantic/policy filters (classifier/moderation/rule engine).
4. Validate explicit injection defenses.
   - Check for jailbreak/prompt-injection detection and denial flows.
5. Validate goal protection controls.
   - Confirm system-level goals and tool permissions are immutable by default.
   - Confirm significant goal changes require explicit human approval.
6. Validate fallback behavior.
   - Verify unknown/ambiguous inputs trigger safe fallback (block/ask-clarify) rather than execution.
7. Validate logging and traceability.
   - Ensure blocked/allowed decisions and policy rationale are logged for review.
8. Emit findings with ingress point, vulnerable path, and missing control.

## Decision Rules
- Pass if all untrusted ingress points have layered filtering and system-goal mutations are human-gated.
- Fail if any ingress reaches prompts/goal changes without required controls.

## Severity Rules
- Critical: direct unfiltered prompt path to privileged action or goal mutation.
- High: filtering exists but only one layer or easy bypass.
- Medium: controls present but poor observability.

## Output Template
```json
{
  "mandate_id": "2.3.5",
  "status": "fail",
  "severity": "high",
  "vulnerability_tags": ["ML01", "LLM01", "ASI01", "MCP02"],
  "evidence": [
    {"file": "src/agent/promptBuilder.ts", "line": 44, "detail": "User input concatenated without sanitization/policy filter"},
    {"file": "src/agent/goals.ts", "line": 93, "detail": "System goal update endpoint has no approval gate"}
  ],
  "remediation": "Add syntactic and semantic input filters and require explicit human approval for goal changes."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
