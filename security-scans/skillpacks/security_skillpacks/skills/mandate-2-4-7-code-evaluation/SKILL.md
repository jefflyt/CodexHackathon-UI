---
name: mandate-2-4-7-code-evaluation
description: Evaluate compliance for Mandate 2.4.7 (Restricted Execution and Function Banning) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.4.7 Code Evaluation Skill

## Mandate
- ID: 2.4.7
- Title: Restricted Execution and Function Banning

## Mitigates
- ASI05 Unexpected Code Execution (RCE)
- ASI10 Rogue Agents

## Inputs
- Runtime execution modules
- Code generation/execution features
- Serialization/deserialization code
- Security policy wrappers

## Workflow
1. Build banned sink dictionary per language.
   - Include `eval`, `exec`, shell spawning APIs, unsafe deserializers, dynamic code loaders, reflection-based invocation sinks.
2. Scan for sink usage.
   - Locate direct and wrapper-mediated invocations of banned sinks.
3. Trace attacker-influenced inputs.
   - Identify LLM/user/tool-controlled data that can flow into these sinks.
4. Verify safe interpreter policy.
   - Confirm production paths use restricted interpreters/sandboxes instead of raw runtime execution.
5. Verify taint controls.
   - Confirm data reaching execution sinks is blocked or sanitized through allowlist/taint policy checks.
6. Detect environment gating.
   - Confirm dangerous execution features are disabled in production builds/runtime flags.
7. Verify unsafe deserialization protection.
   - Confirm only safe serializers are used, with type allowlists where relevant.
8. Emit findings with sink, data source, and exploitability evidence.

## Decision Rules
- Pass if banned sinks are absent or strictly guarded and attacker-influenced data cannot reach sensitive execution paths.
- Fail if unsafe execution/deserialization is reachable from untrusted inputs.

## Severity Rules
- Critical: untrusted data reaches `eval`/shell/code execution sink.
- High: dangerous sink exists in production path but partial guard present.
- Medium: risky sink exists only in non-production/debug path with strong gating.

## Output Template
```json
{
  "mandate_id": "2.4.7",
  "status": "fail",
  "severity": "critical",
  "vulnerability_tags": ["ASI05", "ASI10"],
  "evidence": [
    {"file": "src/runtime/execute.ts", "line": 57, "detail": "LLM output passed directly into eval"},
    {"file": "src/config/features.ts", "line": 16, "detail": "Dynamic execution enabled in production profile"}
  ],
  "remediation": "Remove dangerous sinks from production paths and enforce safe interpreter plus taint-based blocking."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
