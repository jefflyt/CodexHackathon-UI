import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const securityScansRoot = path.join(repoRoot, "security-scans");

loadEnvFiles([
  path.join(repoRoot, ".env"),
  path.join(securityScansRoot, ".env")
]);

const defaultPort = Number.parseInt(process.env.PORT || "8080", 10);
const port = Number.isFinite(defaultPort) ? defaultPort : 8080;

const sessions = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const SECURITY_SCAN_RESULTS_DIR = path.join(securityScansRoot, "results");
const SECURITY_SCAN_REPORT_FALLBACK_FRAMEWORKS = [
  { name: "NIST AI RMF", enabled: true },
  { name: "EU AI Act", enabled: true },
  { name: "ISO 42001", enabled: true },
  { name: "GDPR", enabled: false }
];

function clampRate(value) {
  if (!Number.isFinite(value)) {
    return NaN;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function resolveScanReportSession(sessionId = "") {
  const candidates = await getScanResultFolders(sessionId);
  if (candidates.length > 0) {
    return candidates[0];
  }
  return "";
}

async function getScanResultFolders(sessionId = "") {
  const entries = await readdir(SECURITY_SCAN_RESULTS_DIR, { withFileTypes: true }).catch(() => []);
  const target = String(sessionId || "").trim();
  const allFolders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^\d{8,}\-/.test(name))
    .sort()
    .reverse();

  if (isFilled(target)) {
    const exact = allFolders.filter((folder) => folder.endsWith(`-${target}`));
    if (exact.length > 0) {
      return exact;
    }
  }

  return allFolders;
}

function parseScanResultFileText(raw) {
  try {
    return JSON.parse(String(raw || ""));
  } catch (_error) {
    return null;
  }
}

function toScanReportSeverity(item) {
  const token = String(item?.static_status || item?.severity || "").toLowerCase();
  const evidence = Array.isArray(item?.evidence) ? item.evidence : [];

  if (token.includes("critical") || token.includes("missing") || token.includes("failure") || token.includes("failed")) {
    return "critical";
  }

  if (evidence.some((entry) => {
    const status = String(entry?.status || "").toLowerCase();
    return status.includes("missing") || status.includes("critical") || status.includes("failed") || status.includes("failure");
  })) {
    return "critical";
  }

  if (token.includes("partial")) {
    return "warning";
  }

  if (token.includes("high") || token.includes("warning")) {
    return "warning";
  }

  if (evidence.some((entry) => {
    const status = String(entry?.status || "").toLowerCase();
    return status.includes("partial") || status.includes("high") || status.includes("warning");
  })) {
    return "warning";
  }

  if (token.includes("implemented") || token.includes("pass") || token.includes("success")) {
    return "success";
  }

  if (evidence.some((entry) => String(entry?.status || "").toLowerCase() === "implemented")) {
    return "success";
  }

  return "warning";
}

function isScanResultPassing(item) {
  const response = item || {};
  const status = String(response?.status || "").toLowerCase();
  const staticStatus = String(response?.static_status || "").toLowerCase();
  const evidence = Array.isArray(response?.evidence) ? response.evidence : [];
  const hasMissing = evidence.some((entry) => {
    const token = String(entry?.status || "").toLowerCase();
    return token.includes("missing") || token.includes("critical") || token.includes("failed") || token.includes("failure");
  });
  const hasPartial = evidence.some((entry) => String(entry?.status || "").toLowerCase() === "partial");

  if (status === "pass" || status === "passed") {
    return true;
  }
  if (["failed", "failure", "error", "blocked"].includes(status)) {
    return false;
  }
  if (hasMissing || hasPartial) {
    return false;
  }
  if (status === "success") {
    return staticStatus.includes("implemented") || staticStatus.includes("pass") || staticStatus.includes("success");
  }
  if (staticStatus.includes("implemented") || staticStatus.includes("pass") || staticStatus.includes("success")) {
    return true;
  }
  if (evidence.length === 0) {
    return false;
  }

  return evidence.every((entry) => String(entry?.status || "").toLowerCase() === "implemented");
}

function extractScanReportViolation(item) {
  const response = item || {};
  const evidence = Array.isArray(response.evidence) ? response.evidence : [];
  const firstFinding = evidence.find((entry) =>
    isFilled(entry?.finding) || isFilled(entry?.detail) || isFilled(entry?.description) || isFilled(entry?.issue)
  );
  const firstRemediation = evidence.find((entry) =>
    isFilled(entry?.probable_abuse_path) || isFilled(entry?.required)
  );
  const finding =
    firstFinding?.finding ||
    firstFinding?.detail ||
    firstFinding?.description ||
    firstFinding?.issue ||
    "Open finding detected, see raw evidence for details.";
  const remediation = firstRemediation?.probable_abuse_path || firstRemediation?.required || response.remediation || response.required || response.gap;

  const fallbackRemediation = Array.isArray(response.gaps) ? String(response.gaps?.[0] || "") : "";

  return {
    finding: isFilled(finding) ? String(finding) : "Open finding detected, see raw evidence for details.",
    remediation: isFilled(remediation)
      ? String(remediation)
      : isFilled(fallbackRemediation)
        ? fallbackRemediation
        : "Manual review required."
  };
}

function summarizeScanResultsFromFolder(sessionDir, sessionId, repoName) {
  const sessionName = String(sessionDir || "").trim();
  const normalizedSessionId = String(sessionId || "").trim();

  if (!sessionName) {
    return {
      status: "IDLE",
      severity: "unknown",
      result: "AWAITING_SCAN_SESSION",
      action: "WAITING_FOR_SESSION",
      fail: 0,
      pass: 0,
      passRate: NaN,
      reportId: "NONE",
      refreshMs: 30000,
      systemStatus: "IDLE",
      health: 0,
      cpu: "--",
      memory: "--",
      frameworks: SECURITY_SCAN_REPORT_FALLBACK_FRAMEWORKS,
      repo: String(repoName || "").trim(),
      sessionId: normalizedSessionId,
      ref: "HEAD:main",
      scanSessionFolder: "NONE",
      severityIndex: [
        { label: "CRITICAL_VULN", count: 0, percent: 0, severity: "critical" },
        { label: "HIGH_VULN", count: 0, percent: 0, severity: "warning" },
        { label: "LOW_VULN", count: 0, percent: 0, severity: "success" }
      ],
      failedMandates: [],
      passedChecks: [],
      passedOverflow: 0,
      notApplicable: [],
      scanResultFiles: [],
      scanResultFileCount: 0,
      sessionToken: normalizedSessionId || "N/A",
      node: "SG-BETA-01"
    };
  }

  return readFileListForDirectory(path.join(SECURITY_SCAN_RESULTS_DIR, sessionName), sessionName, normalizedSessionId, repoName);
}

async function readFileListForDirectory(folderPath, sessionName, sessionId, repoName) {
  const entries = await readdir(folderPath, { withFileTypes: true }).catch(() => []);
  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort()
    .map((name) => String(name));

  const files = fileNames.map((name) => path.join(folderPath, name));

  const failedMandates = [];
  const passedChecks = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf8").catch(() => "");
    const payload = parseScanResultFileText(raw);
    if (!payload || typeof payload !== "object") {
      continue;
    }

    const response = payload.response && typeof payload.response === "object" ? payload.response : {};
    const code = String(response.mandate_id || payload.skillName || "unknown").trim();
    const title = String(response.mandate_title || response.title || "Untitled mandate").trim();
    const isPassing = isScanResultPassing(response);

    if (!code) {
      continue;
    }

    const severity = toScanReportSeverity(response);
    const { finding, remediation } = extractScanReportViolation(response);

    if (isPassing) {
      passedChecks.push({
        code: code.toUpperCase(),
        title
      });
      continue;
    }

    failedMandates.push({
      severity,
      code: code.toUpperCase(),
      title,
      violation: `MANDATE EVIDENCE: ${finding}`,
      required: `REMEDIATION: ${remediation}`,
      document: response.doc || response.document || "Unknown",
      section: response.section || response.standard_section || "N/A",
      reference: payload.skillName || code
    });
  }

  const fail = failedMandates.length;
  const success = passedChecks.length;
  const totalChecks = Math.max(0, success + fail);
  const passRate = totalChecks > 0 ? clampRate((success / totalChecks) * 100) : 0;
  const severityCounts = {
    critical: 0,
    warning: 0,
    success: 0
  };

  for (const item of failedMandates) {
    if (item.severity === "critical") {
      severityCounts.critical += 1;
    } else if (item.severity === "warning") {
      severityCounts.warning += 1;
    } else {
      severityCounts.success += 1;
    }
  }

  const totalFailed = Math.max(1, fail);
  const severityIndex = [
    {
      label: "CRITICAL_VULN",
      count: severityCounts.critical,
      percent: clampRate((severityCounts.critical / totalFailed) * 100),
      severity: "critical"
    },
    {
      label: "HIGH_VULN",
      count: severityCounts.warning,
      percent: clampRate((severityCounts.warning / totalFailed) * 100),
      severity: "warning"
    },
    {
      label: "LOW_VULN",
      count: severityCounts.success,
      percent: clampRate((severityCounts.success / totalFailed) * 100),
      severity: "success"
    }
  ];

  const majorStatus = fail > 0 ? "critical" : "success";

  return {
    refreshMs: 3000,
    systemStatus: "ONLINE",
    health: majorStatus === "critical" ? 88 : 100,
    cpu: "31%",
    memory: "63%",
    frameworks: SECURITY_SCAN_REPORT_FALLBACK_FRAMEWORKS,
    repo: String(repoName || "").trim() || "neural-net-v2",
    ref: "HEAD:main",
    reportId: sessionName,
    sessionId: sessionId || sessionName.split("-").slice(1).join("-"),
    scanSessionFolder: sessionName,
    status: majorStatus === "critical" ? "CRITICAL FAILURE" : "COMPLIANCE PASS",
    severity: majorStatus,
    result: fail > 0 ? "COMPLIANCE_VIOLATION" : "ALL_CHECKS_PASSED",
    action: fail > 0 ? "IMMEDIATE_ACTION_REQUIRED" : "CONTINUOUS_MONITORING",
    timestampUtc: new Date().toISOString(),
    passRate,
    success,
    fail,
    severityIndex,
    failedMandates,
    passedChecks,
    passedOverflow: 0,
    notApplicable: [],
    scanResultFiles: fileNames,
    scanResultFileCount: fileNames.length,
    sessionToken: sessionId || "N/A",
    node: "SG-BETA-01"
  };
}

function stripWrappingQuotes(value) {
  if (value.length < 2) {
    return value;
  }
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEnvLine(line) {
  const text = String(line || "").trim();
  if (!text || text.startsWith("#")) {
    return null;
  }

  const normalized = text.startsWith("export ") ? text.slice(7).trim() : text;
  const separatorIndex = normalized.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = normalized.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  const rawValue = normalized.slice(separatorIndex + 1).trim();
  return {
    key,
    value: stripWrappingQuotes(rawValue)
  };
}

function loadEnvFiles(files) {
  for (const filePath of files) {
    if (!existsSync(filePath)) {
      continue;
    }

    let fileContent = "";
    try {
      fileContent = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    for (const line of fileContent.split(/\r?\n/g)) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }

      if (!isFilled(process.env[parsed.key])) {
        process.env[parsed.key] = parsed.value;
      }
    }
  }
}

function isGitHubRepoUrl(value) {
  if (!isFilled(value)) {
    return false;
  }
  return /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?\/?$/i.test(String(value).trim());
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function isFilled(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function firstFilled(...values) {
  for (const value of values) {
    if (isFilled(value)) {
      return String(value).trim();
    }
  }
  return "";
}

function nowIso() {
  return new Date().toISOString();
}

function nowTime() {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return `${hour}:${minute}:${second}`;
}

function writeCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
}

function sendJson(res, statusCode, payload) {
  writeCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(`${JSON.stringify(payload)}\n`);
}

function sendText(res, statusCode, message) {
  writeCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseRepoNameFromGitHubUrl(value) {
  if (!isGitHubRepoUrl(value)) {
    return "";
  }

  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      return "";
    }
    return segments[1].replace(/\.git$/i, "");
  } catch {
    return "";
  }
}

function resolveFilesystemPath(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("~/")) {
    return path.resolve(os.homedir(), trimmed.slice(2));
  }
  return path.resolve(trimmed);
}

function toAbsoluteCandidatePath(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("~/")) {
    return path.resolve(os.homedir(), trimmed.slice(2));
  }

  if (path.isAbsolute(trimmed)) {
    return path.resolve(trimmed);
  }

  return trimmed;
}

function buildLocalPathCandidates(input) {
  const normalized = toAbsoluteCandidatePath(input);
  if (!normalized) {
    return [];
  }

  if (path.isAbsolute(normalized)) {
    return [normalized];
  }

  const parentOfRepoRoot = path.resolve(repoRoot, "..");
  const homeProjects = path.resolve(os.homedir(), "Documents", "AIProjects");

  return [
    path.resolve(repoRoot, normalized),
    path.resolve(parentOfRepoRoot, normalized),
    path.resolve(process.cwd(), normalized),
    path.resolve(homeProjects, normalized)
  ];
}

async function resolveExistingDirectory(input) {
  const candidates = [...new Set(buildLocalPathCandidates(input).filter(Boolean))];
  for (const candidate of candidates) {
    const targetStats = await stat(candidate).catch(() => null);
    if (targetStats && targetStats.isDirectory()) {
      return {
        resolvedPath: candidate,
        checkedCandidates: candidates
      };
    }
  }

  return {
    resolvedPath: "",
    checkedCandidates: candidates
  };
}

async function pathExists(targetPath) {
  const found = await stat(targetPath).catch(() => null);
  return Boolean(found);
}

async function assertScannerReady() {
  const nodeModulesPath = path.join(securityScansRoot, "node_modules");
  const codexSdkPath = path.join(nodeModulesPath, "@openai", "codex-sdk");
  const hasModules = await pathExists(nodeModulesPath);
  const hasCodexSdk = await pathExists(codexSdkPath);

  if (!hasModules || !hasCodexSdk) {
    throw new Error("Scanner dependencies missing. Run: cd security-scans && npm install");
  }

  if (!isFilled(process.env.OPENAI_API_KEY)) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env (repo root) or security-scans/.env, then restart the dev server.");
  }
}

function makeRunId(sessionId) {
  const safeSession = String(sessionId || "scan").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "scan";
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${timestamp}-${safeSession}`;
}

function createSession(sessionId) {
  return {
    cancelRequested: false,
    child: null,
    endedAt: null,
    entries: 0,
    error: null,
    errors: 0,
    killTimer: null,
    lastUpdatedAt: nowIso(),
    logs: [],
    nextLogId: 1,
    runId: makeRunId(sessionId),
    sessionId,
    startedAt: nowIso(),
    status: "starting",
    progress: {
      firstSkillStartedAt: "",
      skillsByName: {},
      skillsOrder: [],
      skillsTotal: 0
    },
    warnings: 0
  };
}

function clearSessionKillTimer(session) {
  if (session?.killTimer) {
    clearTimeout(session.killTimer);
    session.killTimer = null;
  }
}

function findMostRecentActiveSession() {
  const candidates = Array.from(sessions.values()).filter((session) =>
    session && (session.status === "starting" || session.status === "running" || session.status === "canceling")
  );
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

function createOrGetSkillProgress(session, skillName) {
  const normalizedSkillName = String(skillName || "").trim();
  if (!normalizedSkillName) {
    return null;
  }

  if (!session.progress.skillsByName[normalizedSkillName]) {
    session.progress.skillsByName[normalizedSkillName] = {
      durationMs: 0,
      endedAt: "",
      error: "",
      name: normalizedSkillName,
      progressPercent: 0,
      startedAt: "",
      status: "pending"
    };
    session.progress.skillsOrder.push(normalizedSkillName);
  }

  return session.progress.skillsByName[normalizedSkillName];
}

function updateScanProgressFromLog(session, message) {
  const text = String(message || "").trim();
  if (!text) {
    return;
  }

  const discoveredMatch = text.match(/\[SCAN\]\s+Discovered\s+(\d+)\s+code-eval skills\./i);
  if (discoveredMatch?.[1]) {
    const discoveredCount = Number.parseInt(discoveredMatch[1], 10);
    if (Number.isFinite(discoveredCount) && discoveredCount > 0) {
      session.progress.skillsTotal = discoveredCount;
    }
  }

  const runningMatch = text.match(/\[SCAN\]\s+Running\s+(\d+)\s+skill threads/i);
  if (runningMatch?.[1]) {
    const runningCount = Number.parseInt(runningMatch[1], 10);
    if (Number.isFinite(runningCount) && runningCount > 0) {
      session.progress.skillsTotal = Math.max(session.progress.skillsTotal, runningCount);
    }
  }

  const queuedMatch = text.match(/\[SKILL\]\[QUEUE\]\s+(.+)$/i);
  if (queuedMatch?.[1]) {
    const queued = createOrGetSkillProgress(session, queuedMatch[1]);
    if (queued && queued.status === "pending") {
      queued.progressPercent = 0;
    }
    return;
  }

  const startedMatch = text.match(/\[SKILL\]\[START\]\s+(.+)$/i);
  if (startedMatch?.[1]) {
    const started = createOrGetSkillProgress(session, startedMatch[1]);
    if (!started) {
      return;
    }

    const startedAt = nowIso();
    started.status = "running";
    started.startedAt = startedAt;
    started.endedAt = "";
    started.error = "";
    started.progressPercent = Math.max(5, started.progressPercent || 0);

    if (!isFilled(session.progress.firstSkillStartedAt)) {
      session.progress.firstSkillStartedAt = startedAt;
    }
    return;
  }

  const finishedMatch = text.match(/\[SKILL\]\[(SUCCESS|FAILED)\]\s+(.+)$/i);
  if (finishedMatch?.[1] && finishedMatch?.[2]) {
    const finalState = finishedMatch[1].toUpperCase() === "SUCCESS" ? "success" : "failed";
    const detail = String(finishedMatch[2] || "");
    const [skillName, maybeError] = detail.split(" :: ");
    const finished = createOrGetSkillProgress(session, skillName);
    if (!finished) {
      return;
    }

    const endedAt = nowIso();
    finished.status = finalState;
    if (!isFilled(finished.startedAt)) {
      finished.startedAt = endedAt;
    }
    finished.endedAt = endedAt;
    finished.progressPercent = 100;
    finished.error = finalState === "failed" ? String(maybeError || "").trim() : "";

    const startedTimeMs = new Date(finished.startedAt).getTime();
    const endedTimeMs = new Date(endedAt).getTime();
    if (Number.isFinite(startedTimeMs) && Number.isFinite(endedTimeMs) && endedTimeMs >= startedTimeMs) {
      finished.durationMs = endedTimeMs - startedTimeMs;
    }
    return;
  }
}

function buildProgressSnapshot(session) {
  const skillsOrder = Array.isArray(session.progress.skillsOrder) ? session.progress.skillsOrder : [];
  const skillsByName = session.progress.skillsByName || {};
  const skills = skillsOrder
    .map((name) => skillsByName[name])
    .filter(Boolean)
    .map((item) => ({ ...item }));

  const skillsTotal = Math.max(session.progress.skillsTotal || 0, skills.length);
  const nowMs = Date.now();
  const firstSkillMs = isFilled(session.progress.firstSkillStartedAt)
    ? new Date(session.progress.firstSkillStartedAt).getTime()
    : new Date(session.startedAt).getTime();
  const elapsedSeconds = Number.isFinite(firstSkillMs) ? Math.max(0, Math.round((nowMs - firstSkillMs) / 1000)) : 0;

  let pendingCount = 0;
  let runningCount = 0;
  let successCount = 0;
  let failedCount = 0;

  const completedDurations = [];
  for (const skill of skills) {
    const status = String(skill.status || "pending").toLowerCase();
    if (status === "success") {
      successCount += 1;
      if (Number.isFinite(Number(skill.durationMs)) && Number(skill.durationMs) > 0) {
        completedDurations.push(Number(skill.durationMs));
      }
      skill.progressPercent = 100;
      continue;
    }
    if (status === "failed") {
      failedCount += 1;
      if (Number.isFinite(Number(skill.durationMs)) && Number(skill.durationMs) > 0) {
        completedDurations.push(Number(skill.durationMs));
      }
      skill.progressPercent = 100;
      continue;
    }
    if (status === "running") {
      runningCount += 1;
      continue;
    }
    pendingCount += 1;
  }

  const completedCount = successCount + failedCount;
  const averageDurationMs = completedDurations.length > 0
    ? completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length
    : 0;

  for (const skill of skills) {
    if (String(skill.status || "").toLowerCase() !== "running") {
      continue;
    }

    const startedMs = isFilled(skill.startedAt) ? new Date(skill.startedAt).getTime() : NaN;
    if (Number.isFinite(startedMs) && averageDurationMs > 0) {
      const ratio = (nowMs - startedMs) / averageDurationMs;
      skill.progressPercent = Math.max(8, Math.min(95, Math.round(ratio * 100)));
    } else {
      skill.progressPercent = Math.max(12, Math.min(90, Number(skill.progressPercent) || 35));
    }
  }

  const remainingCount = Math.max(0, skillsTotal - completedCount);
  const etaSeconds = completedCount > 0 && remainingCount > 0
    ? Math.max(0, Math.round((elapsedSeconds / completedCount) * remainingCount))
    : null;

  const runningContribution = skills
    .filter((item) => String(item.status || "").toLowerCase() === "running")
    .reduce((sum, item) => sum + Math.max(0, Math.min(100, Number(item.progressPercent) || 0)) / 100, 0);
  const overallPercent = skillsTotal > 0
    ? Math.max(0, Math.min(100, Math.round(((completedCount + runningContribution) / skillsTotal) * 100)))
    : 0;

  return {
    elapsedSeconds,
    etaSeconds,
    failedCount,
    overallPercent,
    pendingCount: Math.max(0, skillsTotal - completedCount - runningCount),
    runningCount,
    skills,
    skillsTotal,
    successCount
  };
}

function inferLevelFromLine(line, fallback = "info") {
  const token = String(line || "").toLowerCase();
  if (token.includes("failed") || token.includes("error") || token.includes("exception")) {
    return "error";
  }
  if (token.includes("warn")) {
    return "warning";
  }
  if (token.includes("success") || token.includes("complete") || token.includes("[ok]")) {
    return "success";
  }
  return fallback;
}

function inferSourceFromLine(line, fallback = "LOGS") {
  const token = String(line || "");
  if (token.includes("[SKILL]")) {
    return "SKILL";
  }
  if (token.includes("[SCAN]")) {
    return "SYSTEM";
  }
  if (/error|failed|exception/i.test(token)) {
    return "ALERT";
  }
  return fallback;
}

function appendLog(session, partialLog) {
  const message = String(partialLog?.message || "").trim();
  if (!message) {
    return;
  }

  const level = String(partialLog?.level || inferLevelFromLine(message)).toLowerCase();
  const source = String(partialLog?.source || inferSourceFromLine(message)).toUpperCase();
  updateScanProgressFromLog(session, message);

  const entry = {
    id: session.nextLogId,
    level,
    message,
    source,
    time: nowTime()
  };

  session.nextLogId += 1;
  session.entries += 1;
  if (level === "error" || level === "critical") {
    session.errors += 1;
  } else if (level === "warning" || level === "warn") {
    session.warnings += 1;
  }

  session.logs.push(entry);
  if (session.logs.length > 500) {
    session.logs.splice(0, session.logs.length - 500);
  }
  session.lastUpdatedAt = nowIso();
}

function attachLineReader(stream, onLine) {
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      if (line) {
        onLine(line);
      }
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf("\n");
    }
  });

  stream.on("end", () => {
    const line = buffer.trim();
    if (line) {
      onLine(line);
    }
  });
}

async function resolveScanCommandArgs(payload) {
  const sourceType = String(payload?.sourceType || "").toLowerCase();
  const githubUrl = firstFilled(payload?.githubUrl);
  const scanPath = firstFilled(payload?.scanPath);
  const targetInput = firstFilled(payload?.scanTargetInput);

  const githubCandidate = [githubUrl, scanPath, targetInput].find((value) => isGitHubRepoUrl(value)) || "";
  if (sourceType === "github" || githubCandidate) {
    const repoUrl = githubCandidate || githubUrl;
    if (!isGitHubRepoUrl(repoUrl)) {
      throw new Error("GitHub mode requires a valid GitHub repository URL.");
    }
    return {
      args: ["--repo-url", repoUrl],
      repo: parseRepoNameFromGitHubUrl(repoUrl) || "github-repo",
      target: repoUrl
    };
  }

  const localCandidate = firstFilled(targetInput, scanPath);
  if (!localCandidate) {
    throw new Error("Local mode requires a valid folder path.");
  }

  const localResolution = await resolveExistingDirectory(localCandidate);
  if (!isFilled(localResolution.resolvedPath)) {
    const attemptedPaths = localResolution.checkedCandidates.length > 0
      ? localResolution.checkedCandidates.join(" | ")
      : resolveFilesystemPath(localCandidate);
    throw new Error(`Local path not found from top input "${localCandidate}". Checked: ${attemptedPaths}`);
  }

  return {
    args: ["--repo-path", localResolution.resolvedPath],
    repo: path.basename(localResolution.resolvedPath) || "local-repo",
    target: localResolution.resolvedPath
  };
}

async function startScan(session, payload) {
  await assertScannerReady();
  const scanTarget = await resolveScanCommandArgs(payload);
  const maxSkills = parsePositiveInteger(payload?.maxSkills) ?? parsePositiveInteger(process.env.SCAN_MAX_SKILLS);
  const commandArgs = ["run", "scan", "--", ...scanTarget.args, "--run-id", session.runId];
  if (maxSkills) {
    commandArgs.push("--max-skills", String(maxSkills));
  }

  session.cancelRequested = false;
  clearSessionKillTimer(session);
  session.status = "running";
  appendLog(session, {
    source: "SYSTEM",
    level: "info",
    message: `Scan queued. Session ${session.sessionId} / Run ${session.runId}.`
  });
  appendLog(session, {
    source: "TARGET",
    level: "info",
    message: `Target resolved from customer input: ${scanTarget.target}`
  });
  appendLog(session, {
    source: "SYSTEM",
    level: "info",
    message: `Launching: npm ${commandArgs.join(" ")}`
  });
  if (maxSkills) {
    appendLog(session, {
      source: "SYSTEM",
      level: "warning",
      message: `Test mode active: limiting scan to ${maxSkills} skills.`
    });
  }

  const child = spawn("npm", commandArgs, {
    cwd: securityScansRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  session.child = child;

  attachLineReader(child.stdout, (line) => {
    appendLog(session, {
      level: inferLevelFromLine(line, "info"),
      message: line,
      source: inferSourceFromLine(line, "LOGS")
    });
  });

  attachLineReader(child.stderr, (line) => {
    appendLog(session, {
      level: inferLevelFromLine(line, "error"),
      message: line,
      source: inferSourceFromLine(line, "ALERT")
    });
  });

  child.on("error", (error) => {
    clearSessionKillTimer(session);
    session.child = null;
    if (session.cancelRequested) {
      session.status = "canceled";
      session.error = null;
      session.endedAt = nowIso();
      appendLog(session, {
        level: "warning",
        message: "Scan process terminated by operator request.",
        source: "SYSTEM"
      });
      return;
    }

    session.status = "failed";
    session.error = String(error?.message || error);
    session.endedAt = nowIso();
    appendLog(session, {
      level: "error",
      message: `Scan process failed to launch: ${session.error}`,
      source: "ALERT"
    });
  });

  child.on("close", async (code) => {
    clearSessionKillTimer(session);
    session.child = null;
    session.endedAt = nowIso();
    if (session.cancelRequested) {
      session.status = "canceled";
      session.error = null;
      appendLog(session, {
        level: "warning",
        message: `Scan process terminated by operator request (exit ${code}).`,
        source: "SYSTEM"
      });
      return;
    }

    if (code === 0) {
      session.status = "completed";
      appendLog(session, {
        level: "success",
        message: `Scan process completed successfully (exit ${code}).`,
        source: "SYSTEM"
      });

      const summaryPath = path.join(securityScansRoot, "results", session.runId, "summary.json");
      const summaryRaw = await readFile(summaryPath, "utf8").catch(() => "");
      if (summaryRaw) {
        try {
          const summary = JSON.parse(summaryRaw);
          appendLog(session, {
            level: "success",
            message: `Summary: ${Number(summary.successCount) || 0} success / ${Number(summary.failureCount) || 0} failed skills.`,
            source: "SYSTEM"
          });
        } catch {
          appendLog(session, {
            level: "warning",
            message: "Scan completed, but summary.json could not be parsed.",
            source: "SYSTEM"
          });
        }
      }
      return;
    }

    session.status = "failed";
    session.error = `Scan process exited with code ${code}`;
    appendLog(session, {
      level: "error",
      message: session.error,
      source: "ALERT"
    });
  });
}

function normalizePathname(urlValue) {
  try {
    return new URL(urlValue, "http://localhost").pathname;
  } catch {
    return "/";
  }
}

async function serveStatic(req, res) {
  let pathname = normalizePathname(req.url || "/");
  if (pathname === "/") {
    pathname = "/web/index.html";
  }

  const decodedPath = decodeURIComponent(pathname);
  const normalized = path
    .normalize(decodedPath)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^\/+/, "");
  const absolutePath = path.join(repoRoot, normalized);

  if (!absolutePath.startsWith(repoRoot)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  let targetPath = absolutePath;
  const targetStat = await stat(targetPath).catch(() => null);
  if (!targetStat) {
    sendText(res, 404, "Not Found");
    return;
  }

  if (targetStat.isDirectory()) {
    targetPath = path.join(targetPath, "index.html");
  }

  const fileBuffer = await readFile(targetPath).catch(() => null);
  if (!fileBuffer) {
    sendText(res, 404, "Not Found");
    return;
  }

  const extension = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.end(fileBuffer);
}

async function handleApi(req, res) {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const pathname = requestUrl.pathname;

  if (req.method === "OPTIONS") {
    writeCorsHeaders(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (pathname === "/api/scan-report" && req.method === "GET") {
    const sessionId = firstFilled(requestUrl.searchParams.get("sessionId"));
    const repoName = firstFilled(requestUrl.searchParams.get("repo"));
    const folderName = await resolveScanReportSession(sessionId);

    if (!folderName) {
      sendJson(res, 200, summarizeScanResultsFromFolder("", sessionId, repoName));
      return;
    }

    const payload = await summarizeScanResultsFromFolder(folderName, sessionId, repoName);
    sendJson(res, 200, payload);
    return;
  }

  if (pathname === "/api/scan/logs" && req.method === "GET") {
    const sessionId = firstFilled(requestUrl.searchParams.get("sessionId"));
    const since = Number.parseInt(firstFilled(requestUrl.searchParams.get("since"), "0"), 10);
    const sinceId = Number.isFinite(since) ? Math.max(0, since) : 0;

    if (!sessionId) {
      sendJson(res, 400, { error: "sessionId is required." });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      sendJson(res, 200, {
        sessionId,
        status: "unknown",
        logs: [],
        progress: buildProgressSnapshot(createSession(sessionId)),
        runId: null,
        summary: { entries: 0, errors: 0, warnings: 0 }
      });
      return;
    }

    const logs = session.logs.filter((entry) => entry.id > sinceId);
    const progress = buildProgressSnapshot(session);
    sendJson(res, 200, {
      endedAt: session.endedAt,
      error: session.error,
      logs,
      progress,
      runId: session.runId,
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      status: session.status,
      summary: {
        entries: session.entries,
        errors: session.errors,
        warnings: session.warnings
      },
      updatedAt: session.lastUpdatedAt
    });
    return;
  }

  if ((pathname === "/api/scan/stop" || pathname === "/api/scan/kill") && req.method === "POST") {
    const body = await readJsonBody(req);
    const requestedSessionId = firstFilled(body.sessionId);
    const session = isFilled(requestedSessionId) ? sessions.get(requestedSessionId) : findMostRecentActiveSession();

    if (!session) {
      sendJson(res, 404, {
        accepted: false,
        error: "No active scan session found.",
        runId: null,
        sessionId: requestedSessionId || null,
        status: "unknown"
      });
      return;
    }

    const currentStatus = String(session.status || "").toLowerCase();
    if (currentStatus === "completed" || currentStatus === "failed" || currentStatus === "canceled" || currentStatus === "stopped") {
      sendJson(res, 200, {
        accepted: true,
        alreadyStopped: true,
        runId: session.runId,
        sessionId: session.sessionId,
        status: currentStatus || "stopped"
      });
      return;
    }

    session.cancelRequested = true;
    session.status = "canceling";
    appendLog(session, {
      level: "warning",
      message: "Stop request received. Attempting graceful shutdown...",
      source: "SYSTEM"
    });

    if (session.child && !session.child.killed) {
      try {
        session.child.kill("SIGTERM");
      } catch {
        // Ignore kill signal errors; close event will reconcile final status.
      }

      clearSessionKillTimer(session);
      session.killTimer = setTimeout(() => {
        if (session.child && !session.child.killed) {
          appendLog(session, {
            level: "warning",
            message: "Scan still running after SIGTERM. Escalating to SIGKILL...",
            source: "SYSTEM"
          });
          try {
            session.child.kill("SIGKILL");
          } catch {
            // Ignore kill signal errors.
          }
        }
      }, 5000);
    } else {
      session.status = "canceled";
      session.endedAt = nowIso();
      appendLog(session, {
        level: "warning",
        message: "Scan canceled before process launch.",
        source: "SYSTEM"
      });
    }

    sendJson(res, 202, {
      accepted: true,
      runId: session.runId,
      sessionId: session.sessionId,
      status: session.status
    });
    return;
  }

  if ((pathname === "/api/scan/start" || pathname === "/api/scan/execute") && req.method === "POST") {
    const body = await readJsonBody(req);
    const sessionId = firstFilled(body.sessionId) || `NG-${Date.now().toString(36).toUpperCase()}`;

    const existing = sessions.get(sessionId);
    if (existing && (existing.status === "starting" || existing.status === "running")) {
      sendJson(res, 200, {
        accepted: true,
        resumed: true,
        runId: existing.runId,
        sessionId,
        status: existing.status
      });
      return;
    }

    const session = createSession(sessionId);
    sessions.set(sessionId, session);

    try {
      await startScan(session, body);
      sendJson(res, 202, {
        accepted: true,
        runId: session.runId,
        sessionId: session.sessionId,
        status: session.status
      });
      return;
    } catch (error) {
      session.status = "failed";
      session.error = error instanceof Error ? error.message : String(error);
      session.endedAt = nowIso();
      appendLog(session, {
        level: "error",
        message: session.error,
        source: "ALERT"
      });
      sendJson(res, 400, {
        accepted: false,
        error: session.error,
        runId: session.runId,
        sessionId: session.sessionId,
        status: session.status
      });
      return;
    }
  }

  if ((pathname === "/api/scan/prepare-source" || pathname === "/api/scan/prepare") && req.method === "POST") {
    const body = await readJsonBody(req);
    const repoUrl = firstFilled(body.repoUrl, body.githubUrl, body.scanPath, body.scanTargetInput);

    if (isGitHubRepoUrl(repoUrl)) {
      sendJson(res, 200, {
        mode: "github",
        repo: parseRepoNameFromGitHubUrl(repoUrl) || "github-repo",
        scanPath: repoUrl
      });
      return;
    }

    const localPath = resolveFilesystemPath(firstFilled(body.scanPath, body.localPath, body.scanTargetInput));
    if (!localPath) {
      sendJson(res, 400, { error: "No scan source provided." });
      return;
    }

    const localStats = await stat(localPath).catch(() => null);
    if (!localStats || !localStats.isDirectory()) {
      sendJson(res, 400, { error: `Local path does not exist: ${localPath}` });
      return;
    }

    sendJson(res, 200, {
      mode: "local",
      repo: path.basename(localPath) || "local-repo",
      scanPath: localPath
    });
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

const server = createServer(async (req, res) => {
  const pathname = normalizePathname(req.url || "/");
  if (pathname.startsWith("/api/")) {
    await handleApi(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  await serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Neon Guardian dev server running at http://localhost:${port}`);
  console.log(`Serving static files from: ${repoRoot}`);
  console.log(`Scan API base: http://localhost:${port}/api/scan`);
});
