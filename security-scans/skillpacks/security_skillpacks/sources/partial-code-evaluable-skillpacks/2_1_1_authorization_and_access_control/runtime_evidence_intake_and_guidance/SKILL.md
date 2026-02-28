---
name: mandate-2-1-1-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.1.1 (Authorization and Access Control), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.1.1 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.1.1
- Title: Authorization and Access Control

## Mitigates
- LLM06 Excessive Agency
- ASI01 Agent Goal Hijack
- ASI03 Identity and Privilege Abuse
- MCP01 Tool Poisoning and Rug Pull Attacks

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
1. IAM policy exports (cloud IAM/RBAC definitions currently enforced).
2. Access token issuance logs with scopes and TTL.
3. Revocation logs and deprovisioning SLAs.
4. Periodic access review artifacts (human approvals and remediation actions).

## Minimum User Inputs to Start
- Current IAM/RBAC policy snapshots.
- Last 30-90 days of authz audit logs.
- Evidence of access review cadence and outcomes.

## Command Templates (Adapt to User Environment)
- AWS IAM role scopes: aws iam list-attached-role-policies --role-name <role-name>
- GCP IAM policy: gcloud projects get-iam-policy <project-id>
- Kubernetes service-account privilege check: kubectl auth can-i --as=system:serviceaccount:<ns>:<sa> --list
- Azure role assignments: az role assignment list --assignee <principal-id>
- Access review export (example): cat access_review_results_<date>.csv

## Final Evaluation Logic
- Pass only if code signals are clean and runtime IAM artifacts confirm least-privilege + timely revocation.
- Fail if either code paths or runtime evidence show broad/standing privilege patterns.

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
