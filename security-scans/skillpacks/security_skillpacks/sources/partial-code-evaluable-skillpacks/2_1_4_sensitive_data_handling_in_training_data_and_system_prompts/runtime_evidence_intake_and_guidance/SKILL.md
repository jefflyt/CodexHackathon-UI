---
name: mandate-2-1-4-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.1.4 (Sensitive Data Handling in Training Data and System Prompts), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.1.4 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.1.4
- Title: Sensitive Data Handling in Training Data and System Prompts

## Mitigates
- ML03 Model Inversion Attack
- ML04 Membership Inference Attack
- LLM02 Sensitive Information Disclosure
- LLM07 System Prompt Leakage
- ASI03 Identity and Privilege Abuse
- ASI06 Memory and Context Poisoning

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
1. Data classification inventory and handling policies.
2. DLP scan reports for datasets, prompts, logs, and memory stores.
3. Access logs for sensitive data repositories.
4. Data retention/deletion policy execution logs.

## Minimum User Inputs to Start
- Data catalog with sensitivity labels.
- Latest DLP reports and exception records.
- Logging policy and redaction verification evidence.

## Command Templates (Adapt to User Environment)
- Sensitive pattern checks in templates/configs: rg -n "(api[_-]?key|token|password|BEGIN PRIVATE KEY|ssn)" .
- Log redaction rules discovery: rg -n "redact|mask|pii|sensitive" .
- Dataset inventory hash baseline: sha256sum <dataset-file>
- DLP report collection: cat dlp_scan_report_<date>.json
- Data retention config inspection: rg -n "retention|ttl|delete" infra/ config/

## Final Evaluation Logic
- Pass only if code controls exist and DLP/governance evidence confirms low leakage risk in live data flows.
- Fail if code lacks controls or runtime artifacts show sensitive data exposure.

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
