---
name: mandate-2-3-4-code-static-eval
description: Evaluate static code indicators for Mandate 2.3.4 (Mitigation of Misinformation and Hallucination). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.3.4 Code Static Evaluation Skill

## Mandate
- ID: 2.3.4
- Title: Mitigation of Misinformation and Hallucination

## Mitigates
- LLM09 Misinformation
- LLM08 Vector and Embedding Weaknesses
- ASI08 Cascading Failures
- ASI09 Human-Agent Trust Exploitation

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
1. Detect RAG or grounding pipeline usage in action-oriented workflows.
2. Verify source attribution capture and confidence metadata.
3. Verify pre-action cross-reference checks against trusted sources for critical decisions.
4. Detect execution paths that allow action without grounding/verification.
5. Verify fallback behavior when sources conflict or confidence is low.
6. Emit findings for ungrounded action paths and weak verification logic.

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
