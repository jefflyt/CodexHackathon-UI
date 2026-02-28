---
name: mandate-2-2-4-code-static-eval
description: Evaluate static code indicators for Mandate 2.2.4 (Vector Database and Embedding Security). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.2.4 Code Static Evaluation Skill

## Mandate
- ID: 2.2.4
- Title: Vector Database and Embedding Security

## Mitigates
- LLM08 Vector and Embedding Weaknesses
- ASI06 Memory and Context Poisoning
- MCP03 Memory Poisoning

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
1. Locate vector DB client and retrieval code paths.
2. Verify tenant/session filters are mandatory in every retrieval/update query.
3. Detect shared/global namespaces that bypass tenant boundaries.
4. Verify embedding metadata includes tenant/user ownership tags.
5. Verify authorization checks occur before vector query execution.
6. Emit findings for cross-tenant retrieval risk paths.

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
