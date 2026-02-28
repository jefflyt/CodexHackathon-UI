---
name: mandate-2-1-5-code-static-eval
description: Evaluate static code indicators for Mandate 2.1.5 (Just-in-Time (JIT) and Identity-Based MCP Authentication). Use when assessing partial code-evaluable controls and producing a confidence-scored static finding package before requesting runtime/process evidence.
---

# Mandate 2.1.5 Code Static Evaluation Skill

## Mandate
- ID: 2.1.5
- Title: Just-in-Time (JIT) and Identity-Based MCP Authentication

## Mitigates
- ASI03 Identity and Privilege Abuse
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
1. Locate MCP auth flows and token exchange logic.
2. Verify OAuth 2.1/OIDC/PKCE usage patterns in user-driven authorization paths.
3. Verify scope minimization in token request/usage code.
4. Flag static credentials or long-lived tokens used for MCP server access.
5. Verify code paths for token revocation and session termination.
6. Emit findings by server integration and auth flow weakness.

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
