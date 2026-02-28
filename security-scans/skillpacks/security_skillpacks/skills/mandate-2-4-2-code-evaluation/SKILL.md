---
name: mandate-2-4-2-code-evaluation
description: Evaluate compliance for Mandate 2.4.2 (Secure Output Handling) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.4.2 Code Evaluation Skill

## Mandate
- ID: 2.4.2
- Title: Secure Output Handling

## Mitigates
- ML09 Output Integrity Attack
- LLM05 Improper Output Handling
- ASI05 Unexpected Code Execution (RCE)
- MCP01 Tool Poisoning and Rug Pull Attack

## Inputs
- Agent/model output handling code
- Downstream adapters (DB, shell, HTTP, template, file)
- Validation/sanitization libraries
- Security tests

## Workflow
1. Identify untrusted output sources.
   - Model completions, tool-generated text, RAG responses, chain-of-thought-derived instructions.
2. Identify sensitive sinks.
   - SQL queries, shell/command execution, HTML rendering, template rendering, deserialization, file paths, dynamic code execution.
3. Build source-to-sink dataflow.
   - Trace where model output reaches each sink directly or indirectly.
4. Validate context-specific protections.
   - SQL: parameterized queries.
   - HTML/UI: context-aware escaping.
   - Shell: allowlisted commands and argument escaping.
   - File paths: canonicalization and path traversal checks.
5. Validate strict schema checks.
   - Confirm output must match expected structured schema before action.
6. Detect unsafe shortcuts.
   - Flag direct string interpolation into sinks and bypass flags that skip validation.
7. Verify negative tests.
   - Confirm tests include malicious payloads and assert blocked/sanitized behavior.
8. Emit findings with source, sink, missing control, and exploit path.

## Decision Rules
- Pass if all untrusted outputs are validated/sanitized/encoded before every sensitive sink.
- Fail if any sink receives untrusted output without required controls.

## Severity Rules
- Critical: untrusted output reaches shell/code/SQL execution unsafely.
- High: unsafe UI rendering or template injection path.
- Medium: sanitization exists but inconsistent coverage.

## Output Template
```json
{
  "mandate_id": "2.4.2",
  "status": "fail",
  "severity": "critical",
  "vulnerability_tags": ["ML09", "LLM05", "ASI05", "MCP01"],
  "evidence": [
    {"file": "src/exec/runCommand.ts", "line": 31, "detail": "Model output passed directly to shell command"},
    {"file": "src/db/queryBuilder.ts", "line": 54, "detail": "String interpolation used in SQL query"}
  ],
  "remediation": "Add strict schema validation and context-safe sink handling before execution/rendering."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
