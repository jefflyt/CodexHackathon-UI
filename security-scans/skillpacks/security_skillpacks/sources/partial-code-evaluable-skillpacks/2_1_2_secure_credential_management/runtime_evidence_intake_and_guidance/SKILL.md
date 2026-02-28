---
name: mandate-2-1-2-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.1.2 (Secure Credential Management), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.1.2 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.1.2
- Title: Secure Credential Management

## Mitigates
- LLM07 System Prompt Leakage
- ASI03 Identity and Privilege Abuse

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
1. Secret manager policy and access control configuration.
2. Credential rotation logs (automated/manual), including last rotation timestamps.
3. Secret access audit logs with actor identity and scope.
4. Incident response records for leaked credential handling.

## Minimum User Inputs to Start
- Secret vault configuration export.
- Rotation policy documents and execution logs.
- Recent secret access audit events.

## Command Templates (Adapt to User Environment)
- Secret scan baseline: trufflehog filesystem . OR gitleaks detect --source .
- Vault path metadata: vault kv metadata get <secret-path>
- AWS Secrets Manager metadata: aws secretsmanager describe-secret --secret-id <secret-id>
- Rotation evidence (AWS): aws secretsmanager list-secret-version-ids --secret-id <secret-id>
- CI secret scanning workflow: rg -n "gitleaks|trufflehog|secret" .github/workflows

## Final Evaluation Logic
- Pass only if no hardcoded secret exposure is found and vault/rotation evidence confirms active controls.
- Fail if code or operations show unmanaged credentials or stale rotation.

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
