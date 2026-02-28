---
name: mandate-2-2-3-runtime-evidence-intake-guide
description: Collect natural-language environment context and generate evidence collection guidance for Mandate 2.2.3 Secure Training and Fine-Tuning. Use when code is insufficient and operational proof is required for final compliance evaluation.
---

# Mandate 2.2.3 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.2.3
- Title: Secure Training and Fine-Tuning

## Mitigates
- ML02 Data Poisoning Attack
- ML07 Transfer Learning Attack
- LLM04 Data and Model Poisoning

## Objective
Gather natural-language context, convert it into an evidence plan, and guide users to generate supporting operational artifacts for final mandate assessment.

## Natural-Language Intake Workflow
1. Ask for training and production architecture at a high level.
2. Ask where training data originates and how it moves across environments.
3. Ask which identities and roles can access training, model artifacts, and promotion pipelines.
4. Ask how pre-trained models/datasets are approved and verified.
5. Ask how promotion from training to production is approved and logged.
6. Ask how contamination or unauthorized access incidents are detected and handled.

## Context Normalization Schema
Capture and normalize answers into:
- `platform_profile`: cloud/on-prem, orchestrator, regions, env names.
- `training_prod_boundary`: network, identity, storage, compute separation.
- `data_flow_map`: source systems, transfer paths, controls, approvals.
- `access_model`: roles, principals, least-privilege boundaries.
- `artifact_trust_chain`: source verification, signatures, provenance.
- `promotion_governance`: gate checks, approvers, audit logs.
- `monitoring_ir`: alerting, incident workflow, escalation.

## Supporting Documents to Request
1. Environment topology diagrams and network segmentation rules.
2. IAM/RBAC policy exports for training and production.
3. Data movement logs and approval records.
4. Artifact provenance attestations for base models/datasets.
5. Model promotion workflow evidence (tickets/approvals/gates).
6. Incident records and corrective actions related to contamination/access.

## Guidance to Generate Supporting Evidence
1. Generate architecture and segmentation evidence.
   - Export infrastructure diagrams from existing architecture repositories or CMDB.
   - Export active network policies and route constraints.
2. Generate access-control evidence.
   - Export role bindings and policy attachments for both training and production.
   - Compare scope breadth and separation boundaries.
3. Generate data movement evidence.
   - Export transfer logs for training data ingress/egress.
   - Collect corresponding human/system approvals.
4. Generate provenance evidence.
   - Export signatures/checksums/attestations for external base models and datasets.
5. Generate promotion governance evidence.
   - Export release tickets, approval decisions, and gate results for model promotion.
6. Generate monitoring/incident evidence.
   - Export alerts, incidents, and remediation proof tied to contamination/unauthorized access.

## System Command Templates (Adapt to Environment)
- Kubernetes environment boundaries:
  - `kubectl get ns`
  - `kubectl get networkpolicy -A -o yaml > network_policies_export.yaml`
- AWS IAM separation:
  - `aws iam list-roles > iam_roles.json`
  - `aws iam list-attached-role-policies --role-name <role-name> > role_policies_<role-name>.json`
- GCP IAM separation:
  - `gcloud projects get-iam-policy <project-id> --format=json > gcp_iam_policy.json`
- Azure role assignments:
  - `az role assignment list --all --output json > azure_role_assignments.json`
- Data movement/audit trail (example):
  - `aws cloudtrail lookup-events --start-time <start> --end-time <end> > cloudtrail_events.json`
- Artifact provenance checks:
  - `sha256sum <artifact-file> > artifact_sha256.txt`
  - `cosign verify-blob --key <public-key> --signature <sig-file> <artifact-file>`
- Promotion evidence (example from GitHub):
  - `gh pr list --search \"model promotion\" --state merged --limit 100 > promotion_prs.txt`

## Evidence Completeness Rules
- Mark each required artifact as `collected`, `partial`, or `missing`.
- Mark evidence as `stale` if outside agreed assessment window.
- Mark evidence as `insufficient` if it lacks source system metadata, timestamps, or owner identity.

## Final Assessment Readiness
- Ready only when all required evidence types are collected and internally consistent with user-provided context.
- Not ready when any control area lacks verifiable operational artifacts.

## Output Contract
Return:
- `context_profile`
- `required_artifacts_checklist`
- `artifact_generation_steps`
- `command_templates`
- `evidence_status_matrix`
- `assessment_readiness`
- `remaining_gaps`

## Guardrails
- Ask short follow-up questions when context is ambiguous.
- Prefer read-only evidence commands.
- State assumptions explicitly when users provide partial context.

