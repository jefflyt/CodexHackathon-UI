---
name: mandate-2-1-3-code-static-eval
description: Evaluate static code indicators for Mandate 2.1.3 (Segregation from Critical Systems). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.1.3 Code Static Evaluation Skill

## Mandate
- ID: 2.1.3
- Title: Segregation from Critical Systems

## Mitigates
- LLM06 Excessive Agency
- ASI02 Tool Misuse and Exploitation
- ASI05 Unexpected Code Execution (RCE)
- MCP05 Client Security Considerations
- MCP06 Server Discovery and Verification

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
1. Identify integrations with high-stakes systems (finance, healthcare, infra control).
2. Flag direct database/system connections from agent runtime code.
3. Verify presence of mediated APIs, policy checks, and rate-limiting hooks in integration paths.
4. Detect sandbox or constrained runtime configuration references in IaC/runtime configs.
5. Detect bypass/debug paths that can call critical systems directly.
6. Emit findings mapping each critical system to exposure path.

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
