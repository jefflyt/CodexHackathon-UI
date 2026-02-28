---
name: mandate-2-1-3-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.1.3 (Segregation from Critical Systems), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.1.3 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.1.3
- Title: Segregation from Critical Systems

## Mitigates
- LLM06 Excessive Agency
- ASI02 Tool Misuse and Exploitation
- ASI05 Unexpected Code Execution (RCE)
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
1. Network segmentation diagrams and firewall/security-group rules.
2. Sandbox/container isolation policy and runtime profiles.
3. API gateway policies (authn/authz, rate limiting, schema validation).
4. Penetration test evidence for lateral movement resistance.

## Minimum User Inputs to Start
- Current deployment architecture diagrams.
- Network policy exports.
- Gateway configuration and recent enforcement logs.

## Command Templates (Adapt to User Environment)
- Kubernetes network segmentation: kubectl get networkpolicy -A
- Pod security context check: kubectl get pod <pod> -n <ns> -o yaml
- AWS security groups: aws ec2 describe-security-groups --group-ids <sg-id>
- API gateway policy export: aws apigateway get-rest-api --rest-api-id <id>
- Route/control-plane topology docs: ls -1 docs/architecture*

## Final Evaluation Logic
- Pass only if code indicates mediated access and runtime evidence proves hard isolation.
- Fail if direct access exists in code or if runtime network controls are weak/missing.

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
