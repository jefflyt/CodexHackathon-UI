---
name: mandate-2-3-4-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.3.4 (Mitigation of Misinformation and Hallucination), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.3.4 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.3.4
- Title: Mitigation of Misinformation and Hallucination

## Mitigates
- LLM09 Misinformation
- LLM08 Vector and Embedding Weaknesses
- ASI08 Cascading Failures
- ASI09 Human-Agent Trust Exploitation

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
1. Trusted source registry and ownership governance.
2. Accuracy/faithfulness evaluation reports on critical workflows.
3. Human review records for disputed/high-risk outputs.
4. Production incidents involving hallucination and corrective actions.

## Minimum User Inputs to Start
- Approved trusted-source list.
- Recent model quality/evaluation reports.
- Human review workflow records.

## Command Templates (Adapt to User Environment)
- Trusted source registry: cat trusted_sources_registry_<env>.yaml
- Grounding/citation audit samples: cat grounding_audit_samples_<date>.json
- Accuracy/faithfulness eval report: cat rag_quality_eval_<date>.md
- Disputed decision review records: cat critical_decision_reviews_<date-range>.csv
- Hallucination incident summaries: cat hallucination_incidents_<date-range>.md

## Final Evaluation Logic
- Pass only if code enforces grounding and runtime evidence shows trusted-source governance plus acceptable accuracy outcomes.
- Fail if critical actions can proceed on unverified or low-confidence outputs.

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
