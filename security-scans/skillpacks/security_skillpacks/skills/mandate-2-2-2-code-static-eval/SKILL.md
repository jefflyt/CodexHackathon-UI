---
name: mandate-2-2-2-code-static-eval
description: Evaluate static code indicators for Mandate 2.2.2 (Prevention of Data and Model Poisoning). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.2.2 Code Static Evaluation Skill

## Mandate
- ID: 2.2.2
- Title: Prevention of Data and Model Poisoning

## Mitigates
- ML02 Data Poisoning Attack
- ML08 Model Skewing
- LLM04 Data and Model Poisoning
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
1. Locate training/fine-tuning/RAG ingestion pipelines.
2. Detect schema validation, content filtering, and anomaly scoring logic.
3. Verify quarantine/reject handling for suspicious data.
4. Detect provenance metadata handling (source IDs, signatures, trust labels).
5. Detect safeguards against memory poisoning in retrieval/memory updates.
6. Emit findings for missing validation stages and weak reject logic.

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
