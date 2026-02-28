---
name: mandate-2-1-2-code-static-eval
description: Evaluate static code indicators for Mandate 2.1.2 (Secure Credential Management). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.1.2 Code Static Evaluation Skill

## Mandate
- ID: 2.1.2
- Title: Secure Credential Management

## Mitigates
- LLM07 System Prompt Leakage
- ASI03 Identity and Privilege Abuse

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
1. Run secret scanning over source, config, prompts, and test fixtures.
2. Detect credential loading patterns (`env`, vault SDK, secret manager APIs).
3. Flag hardcoded tokens, embedded API keys, and credentials in prompt templates.
4. Detect static long-lived tokens in configs and missing refresh logic.
5. Check CI workflow for secret scanning and secret-leak blocking.
6. Emit findings by secret type, exposure surface, and exploitability.

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
