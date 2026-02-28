---
name: mandate-2-2-5-runtime-evidence-intake-and-guidance
description: Collect natural-language context and generate supporting evidence guidance for Mandate 2.2.5 Model Asset Protection. Use when evaluating operational controls such as encryption, key management, access governance, and exfiltration protections.
---

# Mandate 2.2.5 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.2.5
- Title: Model Asset Protection

## Mitigates
- ML05 Model Theft
- ML10 Model Poisoning
- ML03 Model Inversion Attack
- LLM10 Unbounded Consumption

## Objective
Transform user-provided operational context into an actionable evidence collection plan for model confidentiality, integrity, and access governance controls.

## Natural-Language Intake Workflow
1. Ask where model artifacts are stored, served, and backed up.
2. Ask which users/services can read, write, export, or deploy model assets.
3. Ask how encryption at rest/in transit is implemented and audited.
4. Ask how keys are generated, rotated, and access-controlled.
5. Ask how data/model exfiltration is detected and blocked.
6. Ask how model integrity/signing is verified in delivery pipelines.
7. Ask for incident response process for theft/tampering events.

## Context Normalization Schema
Capture and normalize answers into:
- `asset_inventory`: registry locations, buckets, artifact types, endpoints.
- `access_surface`: principals, roles, permissions, boundary controls.
- `crypto_controls`: encryption modes, TLS posture, key ownership.
- `key_management`: KMS/HSM usage, rotation cadence, key policy.
- `exfiltration_controls`: egress restrictions, anomaly detection, DLP hooks.
- `integrity_chain`: signing, checksum validation, attestation in pipeline.
- `ir_readiness`: runbooks, drills, escalation, forensic logging.

## Supporting Documents to Request
1. Model registry/storage security configurations.
2. KMS/HSM policy and key rotation evidence.
3. Access and egress audit logs.
4. Deployment pipeline attestation/signing records.
5. Incident response runbooks and exercise evidence.

## Guidance to Generate Supporting Evidence
1. Generate model asset inventory.
   - Export registry metadata and storage object inventories.
2. Generate encryption and key-management evidence.
   - Export bucket/volume encryption configs and key policy details.
   - Export key rotation status and access logs.
3. Generate access governance evidence.
   - Export IAM/RBAC bindings and recent read/export activity.
4. Generate exfiltration monitoring evidence.
   - Export egress logs, anomaly alerts, and blocked events.
5. Generate integrity evidence.
   - Export signature verification artifacts and pipeline attestations.
6. Generate incident readiness evidence.
   - Export runbooks, tabletop results, and post-incident reviews.

## System Command Templates (Adapt to Environment)
- AWS model storage encryption:
  - `aws s3api get-bucket-encryption --bucket <model-bucket> > bucket_encryption.json`
- AWS KMS key posture:
  - `aws kms describe-key --key-id <key-id> > kms_key_details.json`
  - `aws kms get-key-rotation-status --key-id <key-id> > kms_rotation_status.json`
- IAM and access policy export:
  - `aws iam list-roles > iam_roles.json`
  - `gcloud projects get-iam-policy <project-id> --format=json > gcp_iam_policy.json`
  - `az role assignment list --all --output json > azure_role_assignments.json`
- Access activity logs (example):
  - `aws cloudtrail lookup-events --start-time <start> --end-time <end> > cloudtrail_model_access.json`
- Container/image signing checks:
  - `cosign verify --key <public-key> <image-ref>`
  - `cosign verify-blob --key <public-key> --signature <sig-file> <artifact-file>`
- Kubernetes egress/network controls:
  - `kubectl get networkpolicy -A -o yaml > network_policy_export.yaml`

## Evidence Completeness Rules
- Require direct evidence for confidentiality, integrity, and access controls.
- Reject evidence without timestamps, owner/service identity, or environment scope.
- Flag evidence as stale if outside the assessment period.

## Final Assessment Readiness
- Ready only when storage, crypto, key, access, egress, integrity, and incident-readiness evidence are all present and consistent.
- Not ready if any control domain is missing or weakly evidenced.

## Output Contract
Return:
- `context_profile`
- `asset_control_matrix`
- `required_artifacts_checklist`
- `artifact_generation_steps`
- `command_templates`
- `evidence_status_matrix`
- `assessment_readiness`
- `remaining_gaps`

## Guardrails
- Keep command guidance read-only unless user explicitly asks for changes.
- Ask follow-up questions for unclear ownership or environment boundaries.
- Avoid final pass/fail until evidence completeness reaches ready state.

