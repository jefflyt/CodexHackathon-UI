---
name: mandate-2-3-1-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.3.1 (Comprehensive Logging and Auditing), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.3.1 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.3.1
- Title: Comprehensive Logging and Auditing

## Mitigates
- ML08 Model Skewing
- LLM10 Unbounded Consumption
- LLM06 Excessive Agency
- ASI08 Cascading Failures
- ASI10 Rogue Agents

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
1. Log storage immutability configuration (WORM/object lock/tamper-evident controls).
2. Retention and deletion policy configuration.
3. Access controls for log viewing/modification.
4. Periodic audit trail integrity checks and results.

## Minimum User Inputs to Start
- Logging backend policy exports.
- Sample immutable log records.
- Audit process documentation and evidence.

## Command Templates (Adapt to User Environment)
- Log immutability (AWS S3 Object Lock): aws s3api get-object-lock-configuration --bucket <log-bucket>
- Log access policy export: cat log_access_policy_<env>.json
- Retention policy settings: cat log_retention_policy_<env>.yaml
- Audit pipeline integrity checks: cat audit_integrity_checks_<date>.json
- Security event sample export: cat security_audit_events_<date>.jsonl

## Final Evaluation Logic
- Pass only if code instrumentation is complete and runtime storage proves tamper-evident retention.
- Fail if either coverage or immutability controls are insufficient.

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
