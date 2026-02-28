---
name: mandate-2-2-2-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.2.2 (Prevention of Data and Model Poisoning), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.2.2 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.2.2
- Title: Prevention of Data and Model Poisoning

## Mitigates
- ML02 Data Poisoning Attack
- ML08 Model Skewing
- LLM04 Data and Model Poisoning
- ASI06 Memory and Context Poisoning
- MCP03 Memory Poisoning

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
1. Data source trust registry and approval process records.
2. Dataset version lineage/provenance logs.
3. Poisoning test results (red team/adversarial evaluations).
4. Ongoing model drift and quality monitoring reports.

## Minimum User Inputs to Start
- Source-of-truth dataset registry.
- Recent ingestion anomaly reports.
- Model quality and drift dashboards.

## Command Templates (Adapt to User Environment)
- Data source registry export: cat approved_data_sources_<env>.yaml
- Dataset lineage/provenance export: cat dataset_lineage_<dataset>.json
- Ingestion anomaly events: cat ingestion_anomaly_events_<date>.json
- Poisoning test results: cat adversarial_data_test_report_<date>.md
- Model drift metrics: cat model_drift_dashboard_export_<date>.csv

## Final Evaluation Logic
- Pass only if code includes robust validation controls and operational evidence confirms trusted sources and sustained poisoning resistance.
- Fail if either layer shows uncontrolled poisoning exposure.

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
