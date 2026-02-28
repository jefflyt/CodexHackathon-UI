---
name: mandate-2-1-1-code-static-eval
description: Evaluate static code indicators for Mandate 2.1.1 (Authorization and Access Control). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.1.1 Code Static Evaluation Skill

## Mandate
- ID: 2.1.1
- Title: Authorization and Access Control

## Mitigates
- LLM06 Excessive Agency
- ASI01 Agent Goal Hijack
- ASI03 Identity and Privilege Abuse
- MCP01 Tool Poisoning and Rug Pull Attacks

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
1. Enumerate privileged actions exposed by agents/tools.
2. Extract permission scopes/roles from code, configs, and IaC files.
3. Flag wildcard scopes (`*`), admin roles, broad standing credentials, and missing per-action authorization checks.
4. Detect direct calls to sensitive systems without mediation layers.
5. Trace whether privilege assignment is contextual (task-scoped) or static/global.
6. Emit partial findings with file/line evidence and probable abuse path.

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
