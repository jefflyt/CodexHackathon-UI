---
name: mandate-2-4-1-code-static-eval
description: Evaluate static code indicators for Mandate 2.4.1 (Resource Consumption Limits). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.4.1 Code Static Evaluation Skill

## Mandate
- ID: 2.4.1
- Title: Resource Consumption Limits

## Mitigates
- LLM10 Unbounded Consumption
- ASI02 Tool Misuse and Exploitation
- MCP04 Tool Interference

## Inputs
- Repository root path.
- Tech stack/language map.
- Optional architecture notes if provided.

## Workflow
1. Scope relevant code surfaces tied to this mandate.
2. Run mandate-specific static checks and trace source-to-sink/control paths.
3. Extract exact evidence with file/line references.
4. Classify each control as implemented, partial, or missing.
5. Produce partial-confidence findings and list required runtime/process evidence for closure.

## Mandate-Specific Static Method
1. Identify all resource-intensive execution paths (agent loops, tool calls, generation endpoints).
2. Verify per-request and per-user limits (time, token, memory, request rate) in code/config.
3. Verify early warning and alert trigger code for near-threshold events.
4. Verify fail-safe behavior when limits are exceeded (throttle/reject/halt).
5. Detect bypass paths (internal APIs, debug routes, batch jobs) without limits.
6. Emit findings for uncovered paths and weak limit handling.

## Output Contract
Return a single structured result with:
- mandate_id, mandate_title
- static_status: implemented|partial|missing
- confidence: low|medium|high (static-only confidence)
- evidence: list of file/line findings
- gaps: unresolved items requiring operational proof
- next_evidence_requests: runtime/process artifacts needed

## Guardrails
- Avoid final compliance pass/fail using code alone.
- Mark assumptions explicitly.
- Prefer deterministic checks over heuristics when possible.
