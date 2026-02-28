---
name: mandate-2-4-3-code-evaluation
description: Evaluate compliance for Mandate 2.4.3 (Prevention of Unintended Consequences) using repository code and configuration analysis. Use when producing deterministic pass/fail findings with severity, mapped mitigated vulnerabilities, and file-level evidence.
---

# Mandate 2.4.3 Code Evaluation Skill

## Mandate
- ID: 2.4.3
- Title: Prevention of Unintended Consequences

## Mitigates
- LLM06 Excessive Agency
- ASI08 Cascading Failures
- ASI10 Rogue Agents

## Inputs
- Agent orchestration loops
- KPI/health monitoring hooks
- Circuit breaker modules
- Fallback/kill-switch handlers

## Workflow
1. Identify autonomous execution loops.
   - Locate schedulers, planners, retry loops, multi-step agent runners.
2. Verify hard-coded boundaries.
   - Check max iterations, max tool calls, max runtime, max spend/token budget, max side-effect count.
3. Verify system KPI guard checks.
   - Confirm critical KPI thresholds are evaluated before continuing autonomous execution.
4. Verify circuit breaker trigger logic.
   - Confirm threshold breaches trigger immediate halt or degrade-to-safe mode.
5. Verify fail-closed behavior.
   - On missing metrics/errors/timeouts, execution should stop or require human intervention.
6. Verify manual override path.
   - Confirm emergency kill switch can halt active runs.
7. Verify post-trigger handling.
   - Confirm alerting/logging captures trigger reason and execution context.
8. Emit findings per loop with missing boundary or breaker controls.

## Decision Rules
- Pass if all autonomous loops have enforceable hard limits and fail-closed circuit breakers tied to system health/KPIs.
- Fail if any autonomous path can run without these controls.

## Severity Rules
- Critical: no circuit breaker for high-impact autonomous loop.
- High: boundaries exist but fail-open behavior.
- Medium: controls exist but weak observability.

## Output Template
```json
{
  "mandate_id": "2.4.3",
  "status": "fail",
  "severity": "critical",
  "vulnerability_tags": ["LLM06", "ASI08", "ASI10"],
  "evidence": [
    {"file": "src/agent/runner.ts", "line": 102, "detail": "Autonomous loop has no max-iteration boundary"},
    {"file": "src/agent/circuitBreaker.ts", "line": 44, "detail": "Breaker defaults to allow on KPI read failure"}
  ],
  "remediation": "Add hard execution limits and fail-closed breaker logic with mandatory halt on KPI anomalies."
}
```

## Guardrails
- Use code and repo configuration evidence only.
- Always include file-level evidence for each finding.
- If required evidence is missing in code, mark control as not implemented.
