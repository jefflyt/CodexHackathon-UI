---
name: mandate-2-3-7-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.3.7 (UI/UX Behavioural Safeguards and Trust Calibration), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.3.7 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.3.7
- Title: UI/UX Behavioural Safeguards and Trust Calibration

## Mitigates
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
1. UX review artifacts focused on automation bias/trust calibration.
2. Usability test results for high-risk decision flows.
3. Content governance policy for safety-critical phrasing.
4. Production feedback and incident records tied to misleading UI behavior.

## Minimum User Inputs to Start
- UX testing reports and sample participant outcomes.
- Content policy and sign-off records.
- Screenshots/recordings of production high-risk flows.

## Command Templates (Adapt to User Environment)
- UX content policy artifacts: cat ui_safety_content_policy_<version>.md
- UI component language scan: rg -n "confidence|risk|certain|guarantee|must|urgent" web/ ui/
- High-risk flow screenshots inventory: ls -1 evidence/ui/high_risk_flows/
- Usability test outcomes: cat usability_results_high_risk_<date>.csv
- Incident/feedback export: cat ui_trust_feedback_<date-range>.csv

## Final Evaluation Logic
- Pass only if code-level safeguards exist and UX evidence confirms users are not misled into over-trusting outputs.
- Fail if either code lacks safeguards or UX validation shows unsafe trust behavior.

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
