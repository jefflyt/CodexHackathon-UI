---
name: mandate-2-4-1-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.4.1 (Resource Consumption Limits), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.4.1 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.4.1
- Title: Resource Consumption Limits

## Mitigates
- LLM10 Unbounded Consumption
- ASI02 Tool Misuse and Exploitation
- MCP04 Tool Interference

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
1. Runtime quota/rate-limit configuration from gateway/orchestrator.
2. Enforcement logs showing blocked/throttled events.
3. Capacity monitoring dashboards and alert thresholds.
4. Cost anomaly and abuse incident records.

## Minimum User Inputs to Start
- Production limit configs (API gateway, job scheduler, container runtime).
- Recent throttle/rejection event logs.
- Monitoring and alerting snapshots.

## Command Templates (Adapt to User Environment)
- Kubernetes limits/quotas: kubectl get limitrange -A && kubectl get resourcequota -A
- API gateway throttling settings: cat api_rate_limit_config_<env>.yaml
- Runtime rejection/throttle logs: cat throttle_events_<date-range>.jsonl
- Resource monitoring snapshots: cat resource_utilization_<date-range>.csv
- Cost anomaly events: cat cost_anomalies_<date-range>.json

## Final Evaluation Logic
- Pass only if code-defined controls exist and runtime evidence shows consistent enforcement across all entry points.
- Fail if any major path lacks proven runtime quota enforcement.

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
