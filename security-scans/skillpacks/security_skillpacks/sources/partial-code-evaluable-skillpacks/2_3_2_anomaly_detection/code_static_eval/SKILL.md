---
name: mandate-2-3-2-code-static-eval
description: Evaluate static code indicators for Mandate 2.3.2 (Anomaly Detection). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.3.2 Code Static Evaluation Skill

## Mandate
- ID: 2.3.2
- Title: Anomaly Detection

## Mitigates
- ML08 Model Skewing
- LLM10 Unbounded Consumption
- ASI02 Tool Misuse and Exploitation
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
1. Detect anomaly detection modules and rule definitions.
2. Verify monitored dimensions include behavior, access patterns, performance, and resource consumption.
3. Verify threshold logic and alert trigger paths.
4. Verify suppression/cooldown logic does not disable critical alerts.
5. Verify anomalous event context is logged for investigation.
6. Emit findings for missing detectors and weak alert logic.

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
