---
name: mandate-2-4-5-code-evaluation
description: Evaluate compliance for Mandate 2.4.5 (Context Isolation and Memory TTL) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.4.5 Code Evaluation Skill

## Mandate
- ID: 2.4.5
- Title: Context Isolation and Memory TTL

## Mitigates
- ASI03 Identity and Privilege Abuse
- ASI06 Memory and Context Poisoning
- MCP03 Memory Poisoning
- MCP04 Tool Interference

## Inputs
- Session/context management code
- Memory store adapters
- Data access layer for memory retrieval
- Cleanup/retention jobs

## Workflow
1. Identify context and memory stores.
   - Locate in-memory session state, vector memory, cache layers, and persistent history stores.
2. Verify context reset boundaries.
   - Confirm context reset occurs between distinct tool executions or task boundaries.
3. Verify tenant/session scoping.
   - Confirm retrieval queries require `tenant_id`/`user_id`/`session_id` filters and cannot fallback to global scope.
4. Verify TTL enforcement.
   - Confirm explicit TTL fields/configs exist for long-term memory records.
   - Confirm expiry is enforced by cleanup job, DB TTL index, or retrieval-time hard cutoff.
5. Detect stale-memory reuse.
   - Flag code paths that load historical memory without scoping or TTL checks.
6. Verify deletion lifecycle.
   - Confirm session termination or account deletion triggers memory cleanup where applicable.
7. Verify security tests.
   - Confirm tests assert no cross-session retrieval and expired memory rejection.
8. Emit findings with vulnerable retrieval/update path evidence.

## Decision Rules
- Pass if context is isolated per execution/session/tenant and TTL is consistently enforced on memory.
- Fail if any cross-context retrieval or unbounded retention path exists.

## Severity Rules
- Critical: cross-tenant/session memory leakage path.
- High: missing TTL in long-term memory.
- Medium: TTL exists but not consistently enforced.

## Output Template
```json
{
  "mandate_id": "2.4.5",
  "status": "fail",
  "severity": "high",
  "vulnerability_tags": ["ASI03", "ASI06", "MCP03", "MCP04"],
  "evidence": [
    {"file": "src/memory/retrieve.ts", "line": 48, "detail": "Query missing session/tenant filter"},
    {"file": "src/memory/store.ts", "line": 22, "detail": "No TTL set for persisted memory records"}
  ],
  "remediation": "Enforce strict session/tenant scoping and mandatory TTL for all persisted memory."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
