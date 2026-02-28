---
name: mandate-2-1-4-code-static-eval
description: Evaluate static code indicators for Mandate 2.1.4 (Sensitive Data Handling in Training Data and System Prompts). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.1.4 Code Static Evaluation Skill

## Mandate
- ID: 2.1.4
- Title: Sensitive Data Handling in Training Data and System Prompts

## Mitigates
- ML03 Model Inversion Attack
- ML04 Membership Inference Attack
- LLM02 Sensitive Information Disclosure
- LLM07 System Prompt Leakage
- ASI03 Identity and Privilege Abuse
- ASI06 Memory and Context Poisoning

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
1. Detect training/RAG ingestion pipelines and prompt template locations.
2. Verify PII/secret sanitization and redaction functions in ingestion and logging paths.
3. Flag prompt files containing sensitive patterns (credentials, secrets, proprietary artifacts).
4. Verify logging middleware excludes or masks sensitive fields.
5. Detect test fixtures/sample datasets containing unredacted sensitive data.
6. Emit findings by data flow stage: ingestion, prompting, storage, logging.

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
