---
name: mandate-2-3-2-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.3.2 (Anomaly Detection), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.3.2 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.3.2
- Title: Anomaly Detection

## Mitigates
- ML08 Model Skewing
- LLM10 Unbounded Consumption
- ASI02 Tool Misuse and Exploitation
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
1. Telemetry coverage map (what is monitored in production).
2. Alerting configuration and on-call routing.
3. Alert quality metrics (precision/false positives/MTTD).
4. Incident tickets showing anomaly-to-response lifecycle.

## Minimum User Inputs to Start
- SIEM/monitoring configuration exports.
- Recent anomaly alert samples with response timestamps.
- Post-incident reports for anomaly-triggered events.

## Command Templates (Adapt to User Environment)
- Alert policy export (CloudWatch/GCP/Prometheus): cat anomaly_alert_policies_<env>.json
- Alert trigger history: cat anomaly_alert_history_<date-range>.csv
- On-call routing config: cat oncall_routing_<env>.yaml
- MTTD/false-positive metrics: cat anomaly_detection_metrics_<date>.csv
- Incident ticket export: cat anomaly_incident_tickets_<date-range>.csv

## Final Evaluation Logic
- Pass only if detection logic exists in code and operations data shows reliable detection plus timely response.
- Fail if detection coverage or operational response evidence is weak.

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
