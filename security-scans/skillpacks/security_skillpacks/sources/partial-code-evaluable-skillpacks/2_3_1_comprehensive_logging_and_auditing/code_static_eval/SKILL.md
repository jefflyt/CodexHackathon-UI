---
name: mandate-2-3-1-code-static-eval
description: Evaluate static code indicators for Mandate 2.3.1 (Comprehensive Logging and Auditing). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.3.1 Code Static Evaluation Skill

## Mandate
- ID: 2.3.1
- Title: Comprehensive Logging and Auditing

## Mitigates
- ML08 Model Skewing
- LLM10 Unbounded Consumption
- LLM06 Excessive Agency
- ASI08 Cascading Failures
- ASI10 Rogue Agents

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
1. Identify security-relevant action handlers (tool calls, data writes, external calls, admin actions).
2. Verify each handler emits structured audit events with actor, action, resource, timestamp, and result.
3. Detect missing logs in high-risk paths.
4. Verify correlation identifiers (trace/run/session IDs) for forensic reconstruction.
5. Verify log redaction/masking hooks for sensitive fields.
6. Emit findings for uncovered actions and weak audit schemas.

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
