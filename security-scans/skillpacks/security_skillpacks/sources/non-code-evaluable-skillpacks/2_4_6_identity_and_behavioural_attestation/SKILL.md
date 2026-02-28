---
name: mandate-2-4-6-runtime-evidence-intake-and-guidance
description: Collect natural-language context and generate evidence collection guidance for Mandate 2.4.6 Identity and Behavioural Attestation, covering agent identity lifecycle, signed manifests, watchdog telemetry, and runtime enforcement proof.
---

# Mandate 2.4.6 Runtime Evidence Intake and Guidance Skill

## Mandate
- ID: 2.4.6
- Title: Identity and Behavioural Attestation

## Mitigates
- ASI10 Rogue Agents

## Objective
Build a complete operational evidence plan proving cryptographic agent identity, signed behavioural manifest enforcement, and independent watchdog monitoring.

## Natural-Language Intake Workflow
1. Ask how agent identities are created, stored, and rotated.
2. Ask how behavioural manifests are authored, approved, signed, and deployed.
3. Ask how runtime verification blocks agents with invalid identity or manifest state.
4. Ask where watchdog agents run and what signals they monitor.
5. Ask how deviation alerts trigger containment and escalation.
6. Ask how attestation logs are retained and audited.
7. Ask whether red-team simulations for rogue-agent behavior are performed.

## Context Normalization Schema
Capture and normalize answers into:
- `identity_lifecycle`: issuance, key storage, rotation, revocation.
- `manifest_governance`: ownership, approvals, signing authority, release process.
- `runtime_enforcement`: attestation verification points and block behavior.
- `watchdog_architecture`: monitoring scope, independence, telemetry paths.
- `deviation_response`: alert thresholds, containment automation, escalation.
- `auditability`: tamper evidence, retention, traceability to agent IDs.
- `security_validation`: simulation and adversarial test outcomes.

## Supporting Documents to Request
1. PKI/identity service architecture and policy.
2. Manifest signing workflow documentation and signing logs.
3. Runtime verification and enforcement logs.
4. Watchdog telemetry, alert rules, and incident response records.
5. Red-team/adversarial simulation outcomes for rogue-agent behavior.

## Guidance to Generate Supporting Evidence
1. Generate identity lifecycle evidence.
   - Export key/certificate issuance, rotation, revocation policies and logs.
2. Generate manifest governance evidence.
   - Export signing workflow docs, approver records, and signature audit logs.
3. Generate runtime enforcement evidence.
   - Export attestation checks and blocked execution events.
4. Generate watchdog behavior evidence.
   - Export watchdog metrics, alerts, and response actions.
5. Generate validation evidence.
   - Export red-team or adversarial simulation reports and remediation plans.

## System Command Templates (Adapt to Environment)
- PKI/certificate inventory (AWS example):
  - `aws acm list-certificates > acm_certificates.json`
  - `aws acm describe-certificate --certificate-arn <arn> > certificate_detail.json`
- KMS key governance (AWS example):
  - `aws kms list-keys > kms_keys.json`
  - `aws kms describe-key --key-id <key-id> > kms_key_detail.json`
  - `aws kms get-key-rotation-status --key-id <key-id> > kms_key_rotation.json`
- Runtime attestation log extraction (Kubernetes example):
  - `kubectl logs deployment/<attestation-service> -n <namespace> --since=168h > attestation_logs.txt`
- Watchdog telemetry extraction:
  - `kubectl logs deployment/<watchdog-agent> -n <namespace> --since=168h > watchdog_logs.txt`
  - `kubectl get events -A --sort-by=.lastTimestamp > cluster_events.txt`
- Manifest signature verification:
  - `cosign verify-blob --key <public-key> --signature <sig-file> <manifest-file>`
- Repository evidence scan (documentation/log references):
  - `rg -n \"attestation|manifest signature|watchdog|rogue\" . > attestation_keyword_hits.txt`

## Evidence Completeness Rules
- Require proof for identity lifecycle, manifest governance, runtime enforcement, watchdog monitoring, and security validation.
- Reject undocumented claims without logs, policy exports, or signed artifacts.
- Mark evidence stale if it does not cover current key/cert/manifest versions.

## Final Assessment Readiness
- Ready only when every control domain has current, verifiable, and correlated operational evidence.
- Not ready when controls are described but not demonstrated via artifacts/logs.

## Output Contract
Return:
- `context_profile`
- `attestation_control_matrix`
- `required_artifacts_checklist`
- `artifact_generation_steps`
- `command_templates`
- `evidence_status_matrix`
- `assessment_readiness`
- `remaining_gaps`

## Guardrails
- Keep commands read-only unless user asks for remediation changes.
- Ask for environment/platform details before issuing final command set.
- Require explicit traceability from agent action to cryptographic identity proof.

