---
name: mandate-2-2-4-runtime-evidence-intake-guide
description: Gather natural-language context and generate runtime/process evidence collection guidance for Mandate 2.2.4 (Vector Database and Embedding Security), including concrete system command templates and artifact checklists for final compliance evaluation.
---

# Mandate 2.2.4 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.2.4
- Title: Vector Database and Embedding Security

## Mitigates
- LLM08 Vector and Embedding Weaknesses
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
1. Vector DB role/ACL configuration snapshots.
2. Index/namespace partition configuration from production.
3. Access logs demonstrating tenant-isolated query execution.
4. Cross-tenant penetration test or abuse simulation results.

## Minimum User Inputs to Start
- Production vector DB security configuration export.
- Query audit logs with tenant context.
- Security testing evidence for tenant isolation.

## Command Templates (Adapt to User Environment)
- Vector DB access policy export: cat vector_db_acl_<env>.json
- Namespace/index partition config: cat vector_namespace_config_<env>.yaml
- Query audit logs with tenant/session IDs: cat vector_query_audit_<date>.jsonl
- Cross-tenant simulation results: cat cross_tenant_test_report_<date>.md
- Service role mapping: cat vector_service_roles_<env>.csv

## Final Evaluation Logic
- Pass only if code-level tenant enforcement aligns with runtime ACL/namespace isolation evidence.
- Fail if either code or runtime controls allow cross-context retrieval.

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
