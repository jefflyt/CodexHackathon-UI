---
name: mandate-2-1-5-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.1.5 (Just-in-Time (JIT) and Identity-Based MCP Authentication), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.1.5 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.1.5
- Title: Just-in-Time (JIT) and Identity-Based MCP Authentication

## Mitigates
- ASI03 Identity and Privilege Abuse
- MCP05 Client Security Considerations
- MCP06 Server Discovery and Verification

## Purpose
Collect user-provided context in natural language, convert it into an evidence plan, and produce actionable steps and commands to generate runtime/process evidence for final assessment.

## Step-by-Step Workflow
1. Elicit context in natural language.
   Ask for environment stack, deployment model, cloud/on-prem platform, logging/identity/security tooling, and data sensitivity profile.
2. Normalize context.
   Convert user responses into a structured environment profile: systems, owners, data stores, auth layers, monitoring tools.
3. Build mandate evidence matrix.
   Map required evidence types to concrete systems and responsible owners.
4. Generate evidence collection plan.
   Provide ordered steps to extract artifacts, expected output formats, and validation checks.
5. Generate system command pack.
   Produce commands with placeholders for the user environment and explain expected outputs.
6. Validate completeness.
   Mark each required artifact as collected, partial, or missing.
7. Produce final readiness report.
   Summarize what is sufficient for final pass/fail and what gaps remain.

## Runtime/Process Evidence Required
1. Identity provider client configuration (grant type, PKCE, token TTL).
2. Token issuance/revocation logs with latency evidence.
3. Scope assignment policy and approval workflow.
4. Failed auth/access anomaly logs for MCP interactions.

## Minimum User Inputs to Start
- IdP application configuration export.
- Token lifecycle metrics and revocation audit logs.
- MCP access scope policy documents.

## Command Templates (Adapt to User Environment)
- OAuth/OIDC settings evidence (provider export): cat idp_client_config_<env>.json
- Token TTL/scope evidence logs: cat token_issuance_audit_<date>.json
- Revocation endpoint test (example): curl -X POST <revocation-endpoint> -d 'token=<token>'
- MCP auth flow traces: rg -n "oauth|oidc|pkce|revocation|scope" .
- Access anomaly logs: cat mcp_auth_anomalies_<date>.log

## Final Evaluation Logic
- Pass only if code implements modern auth flow and runtime evidence confirms short-lived JIT scoped access with fast revocation.
- Fail if either static analysis or IdP evidence indicates standing/broad access.

## Output Contract
Return:
- context_profile: normalized system context
- evidence_requirements: checklist by artifact
- command_plan: runnable command templates with placeholders
- collection_status: per-artifact status
- assessment_readiness: ready|not_ready
- remaining_gaps: missing evidence blocking final verdict

## Guardrails
- Ask concise follow-up questions when context is ambiguous.
- Keep commands read-only by default.
- Call out commands requiring elevated privileges before execution.
