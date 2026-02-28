(() => {
  const page = document.body?.dataset?.page;
  if (!page) {
    return;
  }

  const defaultEndpoints = {
    dashboard: [
      window.NEON_DATA_ENDPOINTS?.dashboard,
      "/api/dashboard",
      "../../data/dashboard.json"
    ],
    codex: [
      window.NEON_DATA_ENDPOINTS?.codex,
      "/api/compliance-codex",
      "../../data/compliance-codex.json"
    ],
    "scan-report": [
      window.NEON_DATA_ENDPOINTS?.scanReport,
      "/api/scan-report",
      "../../data/scan-report.json"
    ]
  };

  const renderers = {
    dashboard: renderDashboard,
    codex: renderCodex,
    "scan-report": renderScanReport
  };
  const SCAN_CONTEXT_KEY = "neon_guardian_scan_context_v1";
  const DASHBOARD_TERMINAL_STATE_KEY = "neon_guardian_dashboard_terminal_state_v1";
  const SOURCE_TYPE_LOCAL = "local";
  const SOURCE_TYPE_GITHUB = "github";
  const LOCAL_SCAN_API_BASE_CANDIDATES = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ];
  const DASHBOARD_MAX_LIVE_LOGS = 280;
  const DASHBOARD_LOG_POLL_INTERVAL_MS = 1200;
  const SCAN_REPORT_POLL_INTERVAL_MS = 2500;
  const dashboardLiveTerminalState = {
    entries: 0,
    errors: 0,
    lastLogId: 0,
    logs: [],
    pollHandle: null,
    restoredFromContext: false,
    runId: "",
    sessionId: "",
    status: "idle",
    useLiveLogs: false,
    progress: {
      elapsedSeconds: 0,
      etaSeconds: null,
      failedCount: 0,
      overallPercent: 0,
      pendingCount: 0,
      runningCount: 0,
      skills: [],
      skillsTotal: 0,
      successCount: 0
    },
    warnings: 0
  };
  let scanReportRefreshHandle = null;
  let lastScanReportContextKey = "";
  hydrateDashboardTerminalStateFromStorage();

  initialize().catch(() => {
    // Keep static HTML as fallback if live data fails.
  });

  async function initialize() {
    const renderer = renderers[page];
    if (!renderer) {
      return;
    }

    const firstData = await loadPageData(page);
    renderer(firstData && typeof firstData === "object" ? firstData : {});

    if (page === "scan-report") {
      window.addEventListener("storage", (event) => {
        if (!event || event.key === SCAN_CONTEXT_KEY || event.key === null) {
          void syncScanReportState({ fromStorage: true });
        }
      });
      window.addEventListener("neon:scan-context-updated", () => {
        void syncScanReportState({ fromStorage: true });
      });
      await syncScanReportState({ initial: true });
      return;
    }

    const refreshMs = getPositiveNumber(firstData?.refreshMs, window.NEON_REFRESH_MS, 30000);
    window.setInterval(async () => {
      const nextData = await loadPageData(page);
      renderer(nextData && typeof nextData === "object" ? nextData : {});
    }, refreshMs);
  }

  async function loadPageData(pageKey) {
    const configured = defaultEndpoints[pageKey] || [];
    const candidates = [...new Set(configured.filter(Boolean))];
    const candidateCandidates = pageKey === "scan-report"
      ? candidates.map((endpoint) => appendScanContextToEndpoint(endpoint))
      : candidates;

    for (const url of candidateCandidates) {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: {
            Accept: "application/json"
          }
        });
        if (!response.ok) {
          continue;
        }
        const payload = await response.json();
        if (payload && typeof payload === "object") {
          return payload;
        }
      } catch (_error) {
        // Try the next endpoint.
      }
    }

    return null;
  }

  function getScanReportContext() {
    const scanContext = getStoredScanContext();
    return {
      repo: firstFilled(scanContext.activeScanRepo, scanContext.repo),
      sessionId: firstFilled(scanContext.activeScanSessionId, scanContext.sessionId),
      status: String(scanContext.activeScanStatus || "").toLowerCase()
    };
  }

  function getScanReportContextKey(context) {
    return `${context.repo || ""}|${context.sessionId || ""}|${context.status || ""}`;
  }

  function isActiveScanReportContext(context) {
    const status = String(context?.status || "").toLowerCase();
    return isFilled(context?.sessionId) && (status === "running" || status === "starting");
  }

  function appendScanContextToEndpoint(url) {
    if (!url) {
      return "";
    }
    const query = new URLSearchParams();
    const context = getScanReportContext();
    if (isFilled(context.sessionId)) {
      query.set("sessionId", context.sessionId);
    }
    if (isFilled(context.repo)) {
      query.set("repo", context.repo);
    }

    const queryString = query.toString();
    if (!queryString) {
      return url;
    }
    return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
  }

  async function syncScanReportState(options = {}) {
    const context = getScanReportContext();
    const contextChanged = options.initial || getScanReportContextKey(context) !== lastScanReportContextKey;
    const shouldPoll = isActiveScanReportContext(context);
    const wasPollRunning = scanReportRefreshHandle !== null;

    if (shouldPoll && !wasPollRunning) {
      scanReportRefreshHandle = window.setInterval(async () => {
        const nextData = await loadPageData("scan-report");
        const renderer = renderers["scan-report"];
        if (renderer && nextData && typeof nextData === "object") {
          renderer(nextData);
        }
      }, SCAN_REPORT_POLL_INTERVAL_MS);
    }

    if (!shouldPoll && wasPollRunning) {
      window.clearInterval(scanReportRefreshHandle);
      scanReportRefreshHandle = null;
    }

    if (contextChanged) {
      const nextData = await loadPageData("scan-report");
      const renderer = renderers["scan-report"];
      if (renderer && nextData && typeof nextData === "object") {
        renderer(nextData);
      }
    }

    lastScanReportContextKey = getScanReportContextKey(context);
  }

  function getStoredScanContext() {
    try {
      const raw = window.localStorage.getItem(SCAN_CONTEXT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function storeScanContext(context) {
    try {
      window.localStorage.setItem(SCAN_CONTEXT_KEY, JSON.stringify(context));
      window.dispatchEvent(
        new CustomEvent("neon:scan-context-updated", {
          detail: {
            source: "live-data",
            context
          }
        })
      );
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  function mergeScanContext(nextFields) {
    const current = getStoredScanContext();
    const next = {
      ...current,
      ...(nextFields && typeof nextFields === "object" ? nextFields : {}),
      updatedAt: new Date().toISOString()
    };
    storeScanContext(next);
    return next;
  }

  function getStoredDashboardTerminalState() {
    try {
      const raw = window.localStorage.getItem(DASHBOARD_TERMINAL_STATE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function storeDashboardTerminalState(nextState) {
    try {
      window.localStorage.setItem(DASHBOARD_TERMINAL_STATE_KEY, JSON.stringify(nextState));
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  function persistDashboardTerminalState() {
    storeDashboardTerminalState({
      entries: dashboardLiveTerminalState.entries,
      errors: dashboardLiveTerminalState.errors,
      lastLogId: dashboardLiveTerminalState.lastLogId,
      logs: dashboardLiveTerminalState.logs,
      progress: dashboardLiveTerminalState.progress,
      runId: dashboardLiveTerminalState.runId,
      sessionId: dashboardLiveTerminalState.sessionId,
      status: dashboardLiveTerminalState.status,
      updatedAt: new Date().toISOString(),
      warnings: dashboardLiveTerminalState.warnings
    });
  }

  function hydrateDashboardTerminalStateFromStorage() {
    const scanContext = getStoredScanContext();
    const activeSessionId = firstFilled(scanContext.activeScanSessionId);
    const activeStatus = String(scanContext.activeScanStatus || "").toLowerCase();
    const hasActiveSession = isFilled(activeSessionId) && isDashboardScanActiveStatus(activeStatus);
    if (!hasActiveSession) {
      dashboardLiveTerminalState.entries = 0;
      dashboardLiveTerminalState.errors = 0;
      dashboardLiveTerminalState.lastLogId = 0;
      dashboardLiveTerminalState.logs = [];
      dashboardLiveTerminalState.progress = normalizeDashboardProgress(null);
      dashboardLiveTerminalState.runId = "";
      dashboardLiveTerminalState.sessionId = "";
      dashboardLiveTerminalState.status = "idle";
      dashboardLiveTerminalState.warnings = 0;
      storeDashboardTerminalState({});
      mergeScanContext({
        activeScanRepo: "",
        activeScanRunId: "",
        activeScanSessionId: "",
        activeScanStatus: "idle",
        activeScanTargetInput: "",
        githubUrl: "",
        localPath: "",
        scanTargetPath: "",
        sessionId: ""
      });
      return;
    }

    const stored = getStoredDashboardTerminalState();
    const storedLogs = toArray(stored.logs).map((item) => normalizeDashboardLogEntry(item)).slice(-DASHBOARD_MAX_LIVE_LOGS);

    if (storedLogs.length > 0) {
      dashboardLiveTerminalState.logs = storedLogs;
    }

    const parsedEntries = Number(stored.entries);
    const parsedErrors = Number(stored.errors);
    const parsedWarnings = Number(stored.warnings);
    const parsedLastLogId = Number(stored.lastLogId);

    dashboardLiveTerminalState.entries = Number.isFinite(parsedEntries) ? parsedEntries : dashboardLiveTerminalState.logs.length;
    dashboardLiveTerminalState.errors = Number.isFinite(parsedErrors) ? parsedErrors : 0;
    dashboardLiveTerminalState.warnings = Number.isFinite(parsedWarnings) ? parsedWarnings : 0;
    dashboardLiveTerminalState.lastLogId = Number.isFinite(parsedLastLogId) ? parsedLastLogId : 0;
    dashboardLiveTerminalState.runId = isFilled(stored.runId) ? String(stored.runId) : "";
    dashboardLiveTerminalState.sessionId = isFilled(stored.sessionId) ? String(stored.sessionId) : "";
    dashboardLiveTerminalState.status = isFilled(stored.status) ? String(stored.status) : "idle";
    dashboardLiveTerminalState.progress = normalizeDashboardProgress(stored.progress);
  }

  function normalizeRepoName(value) {
    if (!isFilled(value)) {
      return "";
    }

    const text = String(value).trim();
    const parts = text.split(":");
    const candidate = parts.length > 1 ? parts.slice(1).join(":") : text;
    return candidate.trim().replace(/\s+/g, "-");
  }

  function generateSessionId(repo) {
    const repoToken = normalizeRepoName(repo).replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "SCAN";
    const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
    const nonce = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `NG-${repoToken}-${timestamp}${nonce}`;
  }

  function upsertScanContext(repoCandidate, sessionCandidate, forceNewSession) {
    const context = getStoredScanContext();
    const activeScanStatus = String(context.activeScanStatus || "").toLowerCase();
    const hasActiveScanSession = isFilled(context.activeScanSessionId) && (activeScanStatus === "running" || activeScanStatus === "starting");
    if (!forceNewSession && hasActiveScanSession) {
      const pinnedRepo = normalizeRepoName(context.activeScanRepo || context.repo || repoCandidate) || "unknown-repo";
      const pinnedSessionId = String(context.activeScanSessionId);
      const nextContext = {
        ...context,
        repo: pinnedRepo,
        sessionId: pinnedSessionId,
        updatedAt: new Date().toISOString()
      };
      storeScanContext(nextContext);
      return nextContext;
    }

    const repo = normalizeRepoName(repoCandidate) || normalizeRepoName(context.repo) || "unknown-repo";
    const repoChanged = normalizeRepoName(context.repo) !== repo;
    const providedSession = isFilled(sessionCandidate) ? String(sessionCandidate) : "";

    const sessionId =
      providedSession ||
      (forceNewSession || repoChanged || !isFilled(context.sessionId) ? generateSessionId(repo) : String(context.sessionId));

    const nextContext = {
      ...context,
      repo,
      sessionId,
      updatedAt: new Date().toISOString()
    };
    storeScanContext(nextContext);
    return nextContext;
  }

  function applyHeaderScanContext(repoElementId, sessionElementId, repoCandidate, sessionCandidate, forceNewSession) {
    const context = upsertScanContext(repoCandidate, sessionCandidate, forceNewSession);
    setText(repoElementId, context.repo);
    setText(sessionElementId, context.sessionId);
    return context;
  }

  function renderDashboard(data) {
    const sourceData = data && typeof data === "object" ? data : {};

    const systemStatus = toUpper(sourceData.systemStatus);
    if (systemStatus) {
      setText("dashboard-system-status", `SYSTEM STATUS: ${systemStatus}`);
    }

    if (isFilled(sourceData.uplinkStatus)) {
      setText("dashboard-uplink-status", `Uplink: ${sourceData.uplinkStatus}`);
    }
    if (isFilled(sourceData.node)) {
      setText("dashboard-node", sourceData.node);
    }
    if (isFilled(sourceData.latency)) {
      setText("dashboard-latency", sourceData.latency);
    }
    if (isFilled(sourceData.user)) {
      setText("dashboard-operator", sourceData.user);
    }
    if (isFilled(sourceData.protocol)) {
      setText("dashboard-protocol", `Protocol: ${sourceData.protocol}`);
    }

    const targetInput = byId("dashboard-target-input");
    if (targetInput && !targetInput.dataset.boundUserInputTracker) {
      targetInput.dataset.boundUserInputTracker = "1";
      targetInput.addEventListener("input", () => {
        targetInput.dataset.userEdited = "1";
      });
    }
    if (targetInput && isFilled(sourceData.targetInput) && targetInput.dataset.userEdited !== "1") {
      targetInput.value = sourceData.targetInput;
    }

    const storedContext = getStoredScanContext();
    const repoFromDashboard = normalizeRepoName(storedContext.repo || sourceData.repo || targetInput?.value || sourceData.targetInput);
    const headerContext = applyHeaderScanContext("dashboard-header-repo", "dashboard-session-id", repoFromDashboard, sourceData.sessionId, false);
    initializeDashboardSourceControls(sourceData, targetInput, repoFromDashboard);
    initializeDashboardTerminalControls();
    maybeResumeDashboardScanPolling(storedContext);

    const frameworks = toArray(sourceData.frameworks);
    const frameworkList = byId("dashboard-framework-list");
    if (frameworkList && frameworks.length > 0) {
      frameworkList.innerHTML = frameworks
        .map((framework) => {
          const enabled = framework.enabled !== false;
          const rowClass = enabled
            ? "flex items-center justify-between group"
            : "flex items-center justify-between group opacity-75 hover:opacity-100 transition-opacity";
          const nameClass = enabled
            ? "text-[11px] font-code text-text-main group-hover:text-primary transition-colors"
            : "text-[11px] font-code text-text-muted group-hover:text-text-main transition-colors";

          return `
            <div class="${rowClass}">
              <span class="${nameClass}">${escapeHtml(humanizeText(framework.name || "UNKNOWN"))}</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input ${enabled ? "checked" : ""} class="sr-only peer" type="checkbox" value=""/>
                <div class="w-8 h-4 bg-surface peer-focus:outline-none border border-border rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary/20 peer-checked:border-primary peer-checked:after:bg-primary peer-checked:after:border-primary"></div>
              </label>
            </div>
          `;
        })
        .join("");
    }

    renderDashboardLogs(dashboardLiveTerminalState.logs);

    const dashboardSummary = {
      entries: dashboardLiveTerminalState.entries,
      errors: dashboardLiveTerminalState.errors,
      warnings: dashboardLiveTerminalState.warnings
    };
    applyDashboardSummary(dashboardSummary);
    renderDashboardSkillProgress(dashboardLiveTerminalState.progress);

    const threats = toArray(sourceData.threats);
    const selectedTarget = toArray(sourceData.targets).find((item) => item && item.selected === true) || toArray(sourceData.targets)[0];
    const criticalThreat = threats.find((threat) => String(threat?.severity || "").toLowerCase().includes("critical")) || threats[0];
    const sourceMode = String(storedContext.sourceType || SOURCE_TYPE_LOCAL).toUpperCase();
    const summaryEntries = Number.isFinite(Number(dashboardSummary?.entries))
      ? Number(dashboardSummary.entries).toLocaleString("en-US")
      : "--";
    const summaryErrors = Number.isFinite(Number(dashboardSummary?.errors))
      ? Number(dashboardSummary.errors).toLocaleString("en-US")
      : "--";
    const summaryWarnings = Number.isFinite(Number(dashboardSummary?.warnings))
      ? Number(dashboardSummary.warnings).toLocaleString("en-US")
      : "--";

    setFooterTicker("dashboard-footer-ticker", [
      { label: "Repo", value: headerContext.repo, tone: "primary" },
      { label: "Session", value: headerContext.sessionId, tone: "primary" },
      { label: "Source", value: sourceMode, tone: "primary" },
      { label: "Target", value: selectedTarget?.name || "N/A", tone: "primary" },
      { label: "Target Status", value: selectedTarget?.status || "UNKNOWN", tone: inferToneToken(selectedTarget?.status) },
      { label: "Uplink", value: sourceData.uplinkStatus || "UNKNOWN", tone: inferToneToken(sourceData.uplinkStatus) },
      { label: "Entries", value: summaryEntries, tone: "primary" },
      { label: "Errors", value: summaryErrors, tone: Number(summaryErrors) > 0 ? "critical" : "success" },
      { label: "Warnings", value: summaryWarnings, tone: Number(summaryWarnings) > 0 ? "warning" : "success" },
      { label: "Alert", value: criticalThreat?.message || "No active critical alerts", tone: inferToneToken(criticalThreat?.severity || "success") }
    ]);
  }

  function maybeResumeDashboardScanPolling(storedContext) {
    if (dashboardLiveTerminalState.restoredFromContext) {
      return;
    }
    dashboardLiveTerminalState.restoredFromContext = true;

    const activeSessionId = firstFilled(storedContext?.activeScanSessionId);
    const activeStatus = String(storedContext?.activeScanStatus || "").toLowerCase();
    if (!isFilled(activeSessionId)) {
      return;
    }

    dashboardLiveTerminalState.sessionId = activeSessionId;
    dashboardLiveTerminalState.status = activeStatus || dashboardLiveTerminalState.status;
    persistDashboardTerminalState();
    syncDashboardTerminalControlState();

    if (activeStatus !== "running" && activeStatus !== "starting" && activeStatus !== "canceling") {
      return;
    }

    startDashboardScanLogPolling(activeSessionId, false);
  }

  function isDashboardScanActiveStatus(value) {
    const status = String(value || "").toLowerCase();
    return status === "starting" || status === "running" || status === "canceling";
  }

  function resolveDashboardSessionId() {
    const storedContext = getStoredScanContext();
    const headerSessionId = String(byId("dashboard-session-id")?.textContent || "").trim();
    return firstFilled(
      dashboardLiveTerminalState.sessionId,
      storedContext.activeScanSessionId,
      storedContext.sessionId,
      headerSessionId
    );
  }

  function syncDashboardTerminalControlState() {
    const refreshButton = byId("dashboard-refresh-terminal");
    if (refreshButton) {
      const isRefreshing = refreshButton.dataset.refreshInFlight === "1";
      refreshButton.disabled = isRefreshing;
      refreshButton.classList.toggle("opacity-50", isRefreshing);
      refreshButton.classList.toggle("cursor-not-allowed", isRefreshing);
    }

    const killButton = byId("dashboard-kill-scan");
    if (killButton) {
      const killInFlight = killButton.dataset.killInFlight === "1";
      const storedContext = getStoredScanContext();
      const activeSessionId = firstFilled(dashboardLiveTerminalState.sessionId, storedContext.activeScanSessionId);
      const activeStatus = firstFilled(dashboardLiveTerminalState.status, storedContext.activeScanStatus);
      const canStop = !killInFlight && isFilled(activeSessionId) && isDashboardScanActiveStatus(activeStatus);
      killButton.disabled = !canStop;
      killButton.classList.toggle("opacity-50", !canStop);
      killButton.classList.toggle("cursor-not-allowed", !canStop);
    }
  }

  function clearDashboardTerminalForNewTarget(nextSessionId) {
    const clearedSessionId = String(nextSessionId || "").trim();
    if (dashboardLiveTerminalState.pollHandle) {
      window.clearInterval(dashboardLiveTerminalState.pollHandle);
      dashboardLiveTerminalState.pollHandle = null;
    }
    dashboardLiveTerminalState.sessionId = clearedSessionId;
    dashboardLiveTerminalState.runId = "";
    dashboardLiveTerminalState.status = "idle";
    dashboardLiveTerminalState.lastLogId = 0;
    dashboardLiveTerminalState.logs = [];
    dashboardLiveTerminalState.entries = 0;
    dashboardLiveTerminalState.errors = 0;
    dashboardLiveTerminalState.warnings = 0;
    dashboardLiveTerminalState.progress = normalizeDashboardProgress(null);
    renderDashboardLogs([]);
    applyDashboardSummary({ entries: 0, errors: 0, warnings: 0 });
    renderDashboardSkillProgress(normalizeDashboardProgress(null));
    persistDashboardTerminalState();
    mergeScanContext({
      activeScanRunId: "",
      activeScanSessionId: "",
      activeScanStatus: "idle"
    });
    syncDashboardTerminalControlState();
  }

  function appendDashboardLocalLog(level, source, message) {
    if (!isFilled(message)) {
      return;
    }
    dashboardLiveTerminalState.logs = [
      ...dashboardLiveTerminalState.logs,
      normalizeDashboardLogEntry({
        id: null,
        level: firstFilled(level, "info"),
        message: String(message),
        source: firstFilled(source, "SYSTEM"),
        time: nowDashboardTime()
      })
    ].slice(-DASHBOARD_MAX_LIVE_LOGS);
    renderDashboardLogs(dashboardLiveTerminalState.logs);
    persistDashboardTerminalState();
  }

  async function refreshDashboardLiveTerminal(options = {}) {
    const forceFullSnapshot = options && options.forceFullSnapshot === true;
    const activeSessionId = resolveDashboardSessionId();
    if (isFilled(activeSessionId)) {
      try {
        await pollDashboardScanLogs(activeSessionId, { forceFullSnapshot });
      } catch (_error) {
        // Keep existing logs if refresh fails.
      }
    }

    renderDashboardLogs(dashboardLiveTerminalState.logs);
    applyDashboardSummary({
      entries: dashboardLiveTerminalState.entries,
      errors: dashboardLiveTerminalState.errors,
      warnings: dashboardLiveTerminalState.warnings
    });
    renderDashboardSkillProgress(dashboardLiveTerminalState.progress);
    persistDashboardTerminalState();
    syncDashboardTerminalControlState();
  }

  function initializeDashboardTerminalControls() {
    const refreshButton = byId("dashboard-refresh-terminal");
    if (refreshButton && refreshButton.dataset.boundTerminalRefresh !== "1") {
      refreshButton.dataset.boundTerminalRefresh = "1";
      refreshButton.addEventListener("click", async () => {
        if (refreshButton.dataset.refreshInFlight === "1") {
          return;
        }

        refreshButton.dataset.refreshInFlight = "1";
        syncDashboardTerminalControlState();
        try {
          await refreshDashboardLiveTerminal({ forceFullSnapshot: true });
          setDashboardSourceStatus("Live terminal refreshed.", "info");
        } finally {
          refreshButton.dataset.refreshInFlight = "0";
          syncDashboardTerminalControlState();
        }
      });
    }

    const killButton = byId("dashboard-kill-scan");
    if (killButton && killButton.dataset.boundKillScan !== "1") {
      killButton.dataset.boundKillScan = "1";
      killButton.addEventListener("click", async () => {
        if (killButton.dataset.killInFlight === "1") {
          return;
        }

        const activeSessionId = resolveDashboardSessionId();
        if (!isFilled(activeSessionId)) {
          setDashboardSourceStatus("No active scan session to stop.", "error");
          syncDashboardTerminalControlState();
          return;
        }

        killButton.dataset.killInFlight = "1";
        syncDashboardTerminalControlState();
        setDashboardSourceStatus(`Sending stop signal for session ${activeSessionId}...`, "info");
        appendDashboardLocalLog("warning", "SYSTEM", `Operator requested scan termination for session ${activeSessionId}.`);

        try {
          const stopped = await dispatchDashboardScanStop({
            runId: dashboardLiveTerminalState.runId,
            sessionId: activeSessionId
          });
          const nextStatus = String(stopped?.status || "canceled").toLowerCase();
          dashboardLiveTerminalState.status = nextStatus;
          dashboardLiveTerminalState.sessionId = firstFilled(stopped?.sessionId, activeSessionId);
          if (isFilled(stopped?.runId)) {
            dashboardLiveTerminalState.runId = String(stopped.runId);
          }
          persistDashboardTerminalState();

          mergeScanContext({
            activeScanRunId: dashboardLiveTerminalState.runId,
            activeScanSessionId: dashboardLiveTerminalState.sessionId,
            activeScanStatus: nextStatus
          });

          if (!isDashboardScanActiveStatus(nextStatus) && dashboardLiveTerminalState.pollHandle) {
            window.clearInterval(dashboardLiveTerminalState.pollHandle);
            dashboardLiveTerminalState.pollHandle = null;
          }

          await refreshDashboardLiveTerminal({ forceFullSnapshot: true });

          if (nextStatus === "canceled" || nextStatus === "stopped") {
            appendDashboardLocalLog("warning", "SYSTEM", `Scan session ${dashboardLiveTerminalState.sessionId} terminated by operator.`);
            setDashboardSourceStatus("Scan terminated. Live terminal stopped.", "success");
          } else {
            appendDashboardLocalLog("info", "SYSTEM", `Stop signal accepted. Session ${dashboardLiveTerminalState.sessionId} is ${nextStatus || "canceling"}.`);
            setDashboardSourceStatus("Stop signal sent. Waiting for scan shutdown...", "info");
          }
        } catch (error) {
          const message =
            error instanceof Error && isFilled(error.message)
              ? error.message
              : "Unable to stop current scan session.";
          appendDashboardLocalLog("error", "ALERT", `Scan stop failed: ${message}`);
          setDashboardSourceStatus(message, "error");
        } finally {
          killButton.dataset.killInFlight = "0";
          syncDashboardTerminalControlState();
        }
      });
    }

    syncDashboardTerminalControlState();
  }

  function normalizeDashboardLogEntry(rawLog) {
    return {
      id: Number(rawLog?.id),
      level: isFilled(rawLog?.level) ? String(rawLog.level).toLowerCase() : "info",
      message: isFilled(rawLog?.message) ? String(rawLog.message) : "",
      source: isFilled(rawLog?.source) ? String(rawLog.source).toUpperCase() : "LOGS",
      time: normalizeTime(rawLog?.time || nowDashboardTime())
    };
  }

  function normalizeDashboardProgress(rawProgress) {
    const progress = rawProgress && typeof rawProgress === "object" ? rawProgress : {};
    const normalizedSkills = toArray(progress.skills)
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        return {
          name: isFilled(item.name) ? String(item.name) : "unknown-skill",
          status: isFilled(item.status) ? String(item.status).toLowerCase() : "pending",
          progressPercent: Math.max(0, Math.min(100, Number(item.progressPercent) || 0)),
          error: isFilled(item.error) ? String(item.error) : ""
        };
      })
      .filter(Boolean);

    return {
      elapsedSeconds: Math.max(0, Number(progress.elapsedSeconds) || 0),
      etaSeconds: Number.isFinite(Number(progress.etaSeconds)) ? Math.max(0, Number(progress.etaSeconds)) : null,
      failedCount: Math.max(0, Number(progress.failedCount) || 0),
      overallPercent: Math.max(0, Math.min(100, Number(progress.overallPercent) || 0)),
      pendingCount: Math.max(0, Number(progress.pendingCount) || 0),
      runningCount: Math.max(0, Number(progress.runningCount) || 0),
      skills: normalizedSkills,
      skillsTotal: Math.max(0, Number(progress.skillsTotal) || normalizedSkills.length),
      successCount: Math.max(0, Number(progress.successCount) || 0)
    };
  }

  function renderDashboardSkillProgress(progressInput) {
    const progress = normalizeDashboardProgress(progressInput);
    const summary = byId("dashboard-scan-progress-summary");
    const eta = byId("dashboard-scan-progress-eta");
    const overallBar = byId("dashboard-scan-overall-progress");
    const skillsRoot = byId("dashboard-skill-progress-list");
    if (!summary || !eta || !overallBar || !skillsRoot) {
      return;
    }

    const completed = progress.successCount + progress.failedCount;
    const total = progress.skillsTotal;
    summary.textContent = `Skill Progress: ${completed}/${total} complete`;
    overallBar.style.width = `${progress.overallPercent}%`;

    if (progress.etaSeconds === null) {
      eta.textContent = progress.runningCount > 0 ? "ETA: calibrating..." : "ETA: --";
    } else {
      eta.textContent = `ETA: ${formatDurationToken(progress.etaSeconds)}`;
    }

    if (progress.skills.length === 0) {
      skillsRoot.innerHTML = '<div class="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">No active skill progress yet.</div>';
      return;
    }

    skillsRoot.innerHTML = progress.skills
      .map((skill) => {
        const status = String(skill.status || "pending").toLowerCase();
        const isRunning = status === "running";
        const fillClass = status === "success"
          ? "bg-success"
          : status === "failed"
            ? "bg-critical"
            : isRunning
              ? "bg-warning"
              : "bg-border";
        const statusClass = status === "success"
          ? "text-success"
          : status === "failed"
            ? "text-critical"
            : isRunning
              ? "text-warning"
              : "text-text-muted";

        const displayStatus = status.toUpperCase();
        const errorSuffix = status === "failed" && isFilled(skill.error) ? ` :: ${escapeHtml(humanizeText(skill.error))}` : "";

        return `
          <div class="space-y-1 border border-border bg-black/30 px-2 py-1.5">
            <div class="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.08em]">
              <span class="text-text-main truncate">${escapeHtml(humanizeText(skill.name))}</span>
              <span class="${statusClass}">${escapeHtml(displayStatus)}</span>
            </div>
            <div class="w-full h-1.5 bg-surface border border-border overflow-hidden">
              <div class="h-full ${fillClass} ${isRunning ? "animate-pulse" : ""}" style="width: ${Math.max(0, Math.min(100, Number(skill.progressPercent) || 0))}%"></div>
            </div>
            ${
              errorSuffix
                ? `<div class="font-mono text-[9px] text-critical truncate">${errorSuffix}</div>`
                : ""
            }
          </div>
        `;
      })
      .join("");
  }

  function formatDurationToken(secondsInput) {
    const totalSeconds = Math.max(0, Math.round(Number(secondsInput) || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
    }
    return `${seconds}s`;
  }

  function renderDashboardLogs(rawLogs) {
    const logsList = byId("dashboard-logs-list");
    const scrollRoot = byId("dashboard-terminal-scroll");
    if (!logsList) {
      return;
    }

    const previousScrollTop = scrollRoot ? scrollRoot.scrollTop : 0;
    const wasNearBottom = scrollRoot
      ? scrollRoot.scrollHeight - (scrollRoot.scrollTop + scrollRoot.clientHeight) <= 36
      : false;

    const logs = toArray(rawLogs).map((item) => normalizeDashboardLogEntry(item));
    if (logs.length === 0) {
      logsList.innerHTML = `<div class="flex gap-4">
        <span class="text-primary shrink-0">&gt;</span>
        <span class="text-primary w-2 h-4 bg-primary cursor-blink"></span>
      </div>`;
      if (scrollRoot) {
        scrollRoot.scrollTop = 0;
      }
      return;
    }

    logsList.innerHTML = `${logs
      .map((log, index) => {
        const levelClass = getLogLevelClass(log.level);
        const rowPadding = index >= 3 ? " pt-2" : "";

        return `
          <div class="flex gap-4${rowPadding}">
            <span class="text-text-muted shrink-0">[${escapeHtml(log.time)}]</span>
            <span class="${levelClass}">${escapeHtml(log.source)}:</span>
            <span class="text-text-main">${escapeHtml(humanizeText(log.message || ""))}</span>
          </div>
        `;
      })
      .join("")}
      <div class="flex gap-4">
        <span class="text-primary shrink-0">&gt;</span>
        <span class="text-primary w-2 h-4 bg-primary cursor-blink"></span>
      </div>`;

    if (scrollRoot) {
      if (wasNearBottom) {
        scrollRoot.scrollTop = scrollRoot.scrollHeight;
      } else {
        scrollRoot.scrollTop = previousScrollTop;
      }
    }
  }

  function applyDashboardSummary(summary) {
    if (!summary || typeof summary !== "object") {
      return;
    }

    if (Number.isFinite(Number(summary.entries))) {
      setText("dashboard-log-entries", `ENTRIES: ${Number(summary.entries).toLocaleString("en-US")}`);
    }
    if (Number.isFinite(Number(summary.errors))) {
      setText("dashboard-log-errors", `ERRORS: ${Number(summary.errors).toLocaleString("en-US")}`);
    }
    if (Number.isFinite(Number(summary.warnings))) {
      setText("dashboard-log-warnings", `WARNINGS: ${Number(summary.warnings).toLocaleString("en-US")}`);
    }
  }

  function resetDashboardLiveTerminalState(sessionId) {
    if (dashboardLiveTerminalState.pollHandle) {
      window.clearInterval(dashboardLiveTerminalState.pollHandle);
      dashboardLiveTerminalState.pollHandle = null;
    }
    dashboardLiveTerminalState.sessionId = String(sessionId || "");
    dashboardLiveTerminalState.runId = "";
    dashboardLiveTerminalState.status = "starting";
    dashboardLiveTerminalState.lastLogId = 0;
    dashboardLiveTerminalState.logs = [];
    dashboardLiveTerminalState.entries = 0;
    dashboardLiveTerminalState.errors = 0;
    dashboardLiveTerminalState.warnings = 0;
    dashboardLiveTerminalState.useLiveLogs = true;
    dashboardLiveTerminalState.progress = normalizeDashboardProgress(null);
    persistDashboardTerminalState();
    syncDashboardTerminalControlState();
  }

  async function pollDashboardScanLogs(sessionId, options = {}) {
    if (!isFilled(sessionId)) {
      return;
    }
    const forceFullSnapshot = options && options.forceFullSnapshot === true;

    const endpointCandidates = [
      window.NEON_SCAN_ENDPOINTS?.logs,
      window.NEON_DATA_ENDPOINTS?.scanLogs,
      "/api/scan/logs",
      ...LOCAL_SCAN_API_BASE_CANDIDATES.map((baseUrl) => `${baseUrl}/api/scan/logs`)
    ];
    const endpoint = [...new Set(endpointCandidates.filter(Boolean))][0];
    if (!endpoint) {
      return;
    }

    const separator = endpoint.includes("?") ? "&" : "?";
    const sinceToken = forceFullSnapshot ? 0 : dashboardLiveTerminalState.lastLogId;
    const url = `${endpoint}${separator}sessionId=${encodeURIComponent(sessionId)}&since=${sinceToken}`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const incomingLogs = toArray(payload?.logs).map((item) => normalizeDashboardLogEntry(item));
    if (forceFullSnapshot) {
      dashboardLiveTerminalState.logs = incomingLogs.slice(-DASHBOARD_MAX_LIVE_LOGS);
      dashboardLiveTerminalState.lastLogId = 0;
      const lastEntry = dashboardLiveTerminalState.logs[dashboardLiveTerminalState.logs.length - 1];
      if (Number.isFinite(Number(lastEntry.id))) {
        dashboardLiveTerminalState.lastLogId = Number(lastEntry.id);
      }
      renderDashboardLogs(dashboardLiveTerminalState.logs);
    } else if (incomingLogs.length > 0) {
      dashboardLiveTerminalState.logs = [...dashboardLiveTerminalState.logs, ...incomingLogs].slice(-DASHBOARD_MAX_LIVE_LOGS);
      const lastEntry = incomingLogs[incomingLogs.length - 1];
      if (Number.isFinite(Number(lastEntry.id))) {
        dashboardLiveTerminalState.lastLogId = Number(lastEntry.id);
      }
      renderDashboardLogs(dashboardLiveTerminalState.logs);
    }

    if (payload?.summary && typeof payload.summary === "object") {
      const entries = Number(payload.summary.entries);
      const errors = Number(payload.summary.errors);
      const warnings = Number(payload.summary.warnings);
      if (Number.isFinite(entries)) {
        dashboardLiveTerminalState.entries = entries;
      }
      if (Number.isFinite(errors)) {
        dashboardLiveTerminalState.errors = errors;
      }
      if (Number.isFinite(warnings)) {
        dashboardLiveTerminalState.warnings = warnings;
      }
      applyDashboardSummary(payload.summary);
    }

    if (payload?.progress && typeof payload.progress === "object") {
      dashboardLiveTerminalState.progress = normalizeDashboardProgress(payload.progress);
      renderDashboardSkillProgress(dashboardLiveTerminalState.progress);
    }

    if (isFilled(payload?.runId)) {
      dashboardLiveTerminalState.runId = String(payload.runId);
    }

    const status = String(payload?.status || "").toLowerCase();
    if (isFilled(status)) {
      dashboardLiveTerminalState.status = status;
    }

    if (status === "completed" || status === "failed" || status === "canceled" || status === "stopped" || status === "unknown") {
      if (dashboardLiveTerminalState.pollHandle) {
        window.clearInterval(dashboardLiveTerminalState.pollHandle);
        dashboardLiveTerminalState.pollHandle = null;
      }

      if (status === "unknown") {
        dashboardLiveTerminalState.logs = [];
        dashboardLiveTerminalState.lastLogId = 0;
        dashboardLiveTerminalState.runId = "";
        dashboardLiveTerminalState.sessionId = "";
        dashboardLiveTerminalState.status = "idle";
        renderDashboardLogs([]);
        mergeScanContext({
          activeScanRepo: "",
          activeScanRunId: "",
          activeScanSessionId: "",
          activeScanStatus: "idle",
          activeScanTargetInput: ""
        });
      } else {
        mergeScanContext({
          activeScanSessionId: sessionId,
          activeScanStatus: status,
          activeScanRepo: firstFilled(getStoredScanContext().activeScanRepo, getStoredScanContext().repo),
          activeScanRunId: dashboardLiveTerminalState.runId
        });
      }

      if (status === "completed") {
        setDashboardSourceStatus("Scan completed. Review logs and generated report artifacts.", "success");
      } else if (status === "failed") {
        const errorMessage = isFilled(payload?.error) ? String(payload.error) : "Scan failed. Inspect terminal logs for details.";
        setDashboardSourceStatus(errorMessage, "error");
      } else if (status === "canceled" || status === "stopped") {
        setDashboardSourceStatus("Scan terminated by operator.", "success");
      } else if (status === "unknown") {
        setDashboardSourceStatus("No active scan session found. Ready for a new run.", "info");
      }
    } else {
      mergeScanContext({
        activeScanSessionId: sessionId,
        activeScanStatus: status || "running",
        activeScanRepo: firstFilled(getStoredScanContext().activeScanRepo, getStoredScanContext().repo),
        activeScanRunId: dashboardLiveTerminalState.runId
      });
    }

    persistDashboardTerminalState();
    syncDashboardTerminalControlState();
  }

  function startDashboardScanLogPolling(sessionId, resetState = true) {
    const normalizedSessionId = String(sessionId || "").trim();
    if (!isFilled(normalizedSessionId)) {
      return;
    }

    if (resetState || dashboardLiveTerminalState.sessionId !== normalizedSessionId) {
      resetDashboardLiveTerminalState(normalizedSessionId);
      renderDashboardLogs([]);
      applyDashboardSummary({ entries: 0, errors: 0, warnings: 0 });
      renderDashboardSkillProgress(normalizeDashboardProgress(null));
      dashboardLiveTerminalState.entries = 0;
      persistDashboardTerminalState();
    }

    if (dashboardLiveTerminalState.pollHandle) {
      window.clearInterval(dashboardLiveTerminalState.pollHandle);
      dashboardLiveTerminalState.pollHandle = null;
    }

    const poll = async () => {
      try {
        await pollDashboardScanLogs(normalizedSessionId);
      } catch (_error) {
        // Keep polling even if a request fails intermittently.
      }
    };

    poll();
    dashboardLiveTerminalState.pollHandle = window.setInterval(poll, DASHBOARD_LOG_POLL_INTERVAL_MS);
    syncDashboardTerminalControlState();
  }

  function nowDashboardTime() {
    const now = new Date();
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
    return `${hour}:${minute}:${second}`;
  }

  function initializeDashboardSourceControls(data, targetInput, fallbackRepo) {
    const localButton = byId("dashboard-source-local");
    const githubButton = byId("dashboard-source-github");
    const localPanel = byId("dashboard-local-source-panel");
    const githubPanel = byId("dashboard-github-source-panel");
    const localPathInput = byId("dashboard-local-path-input");
    const githubUrlInput = byId("dashboard-github-url-input");
    const folderPicker = byId("dashboard-local-folder-picker");
    const folderButton = byId("dashboard-select-local-folder");
    const executeScanButton = byId("dashboard-execute-scan");
    if (!localButton || !githubButton || !localPanel || !githubPanel || !executeScanButton) {
      return;
    }

    initializeDashboardTerminalControls();

    const setActiveSourceMode = (nextSourceType, persist) => {
      const activeSourceType = nextSourceType === SOURCE_TYPE_GITHUB ? SOURCE_TYPE_GITHUB : SOURCE_TYPE_LOCAL;
      localButton.dataset.sourceType = activeSourceType;

      localPanel.classList.toggle("hidden", activeSourceType !== SOURCE_TYPE_LOCAL);
      githubPanel.classList.toggle("hidden", activeSourceType !== SOURCE_TYPE_GITHUB);

      localButton.classList.toggle("border-primary/40", activeSourceType === SOURCE_TYPE_LOCAL);
      localButton.classList.toggle("bg-primary/10", activeSourceType === SOURCE_TYPE_LOCAL);
      localButton.classList.toggle("text-primary", activeSourceType === SOURCE_TYPE_LOCAL);
      localButton.classList.toggle("border-border", activeSourceType !== SOURCE_TYPE_LOCAL);
      localButton.classList.toggle("text-text-muted", activeSourceType !== SOURCE_TYPE_LOCAL);

      githubButton.classList.toggle("border-primary/40", activeSourceType === SOURCE_TYPE_GITHUB);
      githubButton.classList.toggle("bg-primary/10", activeSourceType === SOURCE_TYPE_GITHUB);
      githubButton.classList.toggle("text-primary", activeSourceType === SOURCE_TYPE_GITHUB);
      githubButton.classList.toggle("border-border", activeSourceType !== SOURCE_TYPE_GITHUB);
      githubButton.classList.toggle("text-text-muted", activeSourceType !== SOURCE_TYPE_GITHUB);

      if (persist) {
        mergeScanContext({ sourceType: activeSourceType });
      }

      if (targetInput && targetInput.dataset.userEdited !== "1") {
        const nextTargetValue =
          activeSourceType === SOURCE_TYPE_GITHUB
            ? String(githubUrlInput?.value || "")
            : String(localPathInput?.value || "");
        if (isFilled(nextTargetValue)) {
          targetInput.value = nextTargetValue;
        } else if (isFilled(data.targetInput)) {
          targetInput.value = data.targetInput;
        }
      }

      const modeText =
        activeSourceType === SOURCE_TYPE_GITHUB
          ? "GitHub mode active. Enter a GitHub repo URL to scan."
          : "Local mode active. Select a local folder to scan.";
      setDashboardSourceStatus(modeText, "info");
    };

    if (localButton.dataset.boundSourceControls === "1") {
      syncDashboardTerminalControlState();
      return;
    }
    localButton.dataset.boundSourceControls = "1";

    const storedContext = getStoredScanContext();
    const isActiveStartupSession = isDashboardScanActiveStatus(storedContext.activeScanStatus);
    const initialSourceType = storedContext.sourceType === SOURCE_TYPE_GITHUB ? SOURCE_TYPE_GITHUB : SOURCE_TYPE_LOCAL;
    const storedLocalPath = isActiveStartupSession ? String(storedContext.localPath || "") : "";
    const storedGitHubUrl = isActiveStartupSession ? String(storedContext.githubUrl || "") : "";
    const storedScanTargetPath = isActiveStartupSession ? String(storedContext.scanTargetPath || "") : "";

    if (localPathInput && isFilled(storedLocalPath)) {
      localPathInput.value = storedLocalPath;
    } else if (localPathInput) {
      localPathInput.value = "";
    }
    if (githubUrlInput && isFilled(storedGitHubUrl)) {
      githubUrlInput.value = storedGitHubUrl;
    } else if (githubUrlInput) {
      githubUrlInput.value = "";
    }
    if (targetInput && targetInput.dataset.userEdited !== "1") {
      targetInput.value = isFilled(storedScanTargetPath) ? storedScanTargetPath : firstFilled(data.targetInput, "");
    }

    localButton.addEventListener("click", () => {
      setActiveSourceMode(SOURCE_TYPE_LOCAL, true);
    });
    githubButton.addEventListener("click", () => {
      setActiveSourceMode(SOURCE_TYPE_GITHUB, true);
    });

    if (folderButton && folderPicker) {
      folderButton.addEventListener("click", () => {
        folderPicker.click();
      });
      folderPicker.addEventListener("change", () => {
        const files = Array.from(folderPicker.files || []);
        const localPath = resolveLocalDirectoryPath(files);
        if (!isFilled(localPath)) {
          setDashboardSourceStatus("Unable to resolve selected folder path.", "error");
          return;
        }

        if (localPathInput) {
          localPathInput.value = localPath;
        }
        if (targetInput) {
          targetInput.value = localPath;
          targetInput.dataset.userEdited = "1";
        }

        const folderRepo = normalizeRepoName(getPathBasename(localPath) || fallbackRepo || data.targetInput);
        const headerContext = applyHeaderScanContext("dashboard-header-repo", "dashboard-session-id", folderRepo, "", true);
        mergeScanContext({
          ...headerContext,
          sourceType: SOURCE_TYPE_LOCAL,
          localPath,
          scanTargetPath: localPath
        });
        clearDashboardTerminalForNewTarget(headerContext.sessionId);
        setActiveSourceMode(SOURCE_TYPE_LOCAL, false);
        setDashboardSourceStatus(`Local folder selected: ${localPath}`, "success");
        refreshDashboardLiveTerminal({ forceFullSnapshot: true });
      });
    }

    if (githubUrlInput) {
      githubUrlInput.addEventListener("input", () => {
        githubUrlInput.dataset.userEdited = "1";
        const githubUrl = String(githubUrlInput.value || "").trim();
        mergeScanContext({
          sourceType: SOURCE_TYPE_GITHUB,
          githubUrl
        });

        if (targetInput && localButton.dataset.sourceType === SOURCE_TYPE_GITHUB) {
          targetInput.value = githubUrl;
          targetInput.dataset.userEdited = "1";
        }

        const repoFromUrl = extractRepoNameFromGitHubUrl(githubUrl);
        if (isFilled(repoFromUrl) && localButton.dataset.sourceType === SOURCE_TYPE_GITHUB) {
          const headerContext = applyHeaderScanContext("dashboard-header-repo", "dashboard-session-id", repoFromUrl, "", true);
          mergeScanContext({
            ...headerContext,
            scanTargetPath: githubUrl
          });
          clearDashboardTerminalForNewTarget(headerContext.sessionId);
          refreshDashboardLiveTerminal({ forceFullSnapshot: true });
        }
      });
    }

    executeScanButton.addEventListener("click", async () => {
      if (executeScanButton.dataset.scanInProgress === "1") {
        return;
      }

      const selectedSourceType =
        localButton.dataset.sourceType === SOURCE_TYPE_GITHUB ? SOURCE_TYPE_GITHUB : SOURCE_TYPE_LOCAL;
      const localPath = String(localPathInput?.value || "").trim();
      const githubUrl = String(githubUrlInput?.value || "").trim();
      const customerTargetInput = String(targetInput?.value || "").trim();
      const requestedTargetInput = firstFilled(customerTargetInput, selectedSourceType === SOURCE_TYPE_GITHUB ? githubUrl : localPath);
      const effectiveSourceType = isGitHubRepoUrl(requestedTargetInput) ? SOURCE_TYPE_GITHUB : selectedSourceType;

      if (effectiveSourceType === SOURCE_TYPE_LOCAL && !isFilled(requestedTargetInput)) {
        setDashboardSourceStatus("Enter the target repository/folder in the top input before running scan.", "error");
        return;
      }
      if (effectiveSourceType === SOURCE_TYPE_GITHUB && !isGitHubRepoUrl(requestedTargetInput)) {
        setDashboardSourceStatus("Enter a valid GitHub repository URL before running scan.", "error");
        return;
      }

      executeScanButton.dataset.scanInProgress = "1";
      executeScanButton.disabled = true;
      executeScanButton.classList.add("opacity-70", "cursor-not-allowed");
      syncDashboardTerminalControlState();

      try {
        const preparingMessage =
          effectiveSourceType === SOURCE_TYPE_GITHUB
            ? "Resolving GitHub repository target from customer input..."
            : "Resolving local scan target from customer input...";
        setDashboardSourceStatus(preparingMessage, "info");

        const prepared = await prepareDashboardScanSource(effectiveSourceType, {
          localPath,
          githubUrl,
          targetInput: requestedTargetInput
        });
        const resolvedScanPath = String(prepared.scanPath || "").trim();
        if (!isFilled(resolvedScanPath)) {
          throw new Error("Unable to resolve scan target path.");
        }

        if (targetInput) {
          targetInput.value = resolvedScanPath;
          targetInput.dataset.userEdited = "1";
        }

        const resolvedRepo = normalizeRepoName(
          prepared.repo ||
            extractRepoNameFromGitHubUrl(githubUrl) ||
            getPathBasename(resolvedScanPath) ||
            fallbackRepo ||
            data.targetInput ||
            "unknown-repo"
        );

        const headerContext = applyHeaderScanContext("dashboard-header-repo", "dashboard-session-id", resolvedRepo, "", true);
        clearDashboardTerminalForNewTarget(headerContext.sessionId);
        mergeScanContext({
          ...headerContext,
          sourceType: effectiveSourceType,
          githubUrl: effectiveSourceType === SOURCE_TYPE_GITHUB ? firstFilled(githubUrl, customerTargetInput) : "",
          localPath: effectiveSourceType === SOURCE_TYPE_LOCAL ? resolvedScanPath : localPath,
          scanTargetPath: resolvedScanPath
        });

        const scanStarted = await dispatchDashboardScanStart({
          sessionId: headerContext.sessionId,
          repo: headerContext.repo,
          sourceType: effectiveSourceType,
          scanPath: resolvedScanPath,
          githubUrl: effectiveSourceType === SOURCE_TYPE_GITHUB ? firstFilled(requestedTargetInput, githubUrl) : "",
          scanTargetInput: requestedTargetInput
        });

        const liveSessionId = firstFilled(scanStarted.sessionId, headerContext.sessionId);
        startDashboardScanLogPolling(liveSessionId, true);
        mergeScanContext({
          activeScanSessionId: liveSessionId,
          activeScanStatus: "running",
          activeScanRepo: resolvedRepo,
          activeScanTargetInput: requestedTargetInput,
          activeScanRunId: firstFilled(scanStarted.runId)
        });

        setDashboardSourceStatus(`Scan started for ${resolvedScanPath}. Streaming live terminal output...`, "success");
      } catch (error) {
        const failureMessage =
          error instanceof Error && isFilled(error.message)
            ? error.message
            : "Scan preparation failed. Check source configuration.";
        setDashboardSourceStatus(failureMessage, "error");
      } finally {
        executeScanButton.dataset.scanInProgress = "0";
        executeScanButton.disabled = false;
        executeScanButton.classList.remove("opacity-70", "cursor-not-allowed");
        syncDashboardTerminalControlState();
      }
    });

    setActiveSourceMode(initialSourceType, false);
    syncDashboardTerminalControlState();
  }

  async function prepareDashboardScanSource(sourceType, input) {
    if (sourceType === SOURCE_TYPE_GITHUB) {
      return prepareGitHubScanSource(firstFilled(input.targetInput, input.githubUrl));
    }

    const localCandidate = firstFilled(input.targetInput, input.localPath);
    if (!isFilled(localCandidate)) {
      throw new Error("Enter repository or folder in the top input before running scan.");
    }

    return {
      scanPath: String(localCandidate).trim(),
      repo: getPathBasename(localCandidate)
    };
  }

  async function prepareGitHubScanSource(repoUrl) {
    if (!isGitHubRepoUrl(repoUrl)) {
      throw new Error("GitHub URL must look like https://github.com/org/repo(.git).");
    }

    return {
      scanPath: String(repoUrl).trim(),
      repo: firstFilled(extractRepoNameFromGitHubUrl(repoUrl), "github-repo")
    };
  }

  async function dispatchDashboardScanStart(payload) {
    const response = await postJsonToCandidateEndpoints(
      [
        window.NEON_SCAN_ENDPOINTS?.start,
        window.NEON_SCAN_ENDPOINTS?.execute,
        window.NEON_DATA_ENDPOINTS?.scanStart,
        "/api/scan/start",
        "/api/scan/execute",
        ...LOCAL_SCAN_API_BASE_CANDIDATES.map((baseUrl) => `${baseUrl}/api/scan/start`),
        ...LOCAL_SCAN_API_BASE_CANDIDATES.map((baseUrl) => `${baseUrl}/api/scan/execute`)
      ],
      payload
    );
    if (!response) {
      throw new Error("Scan start endpoint is unavailable. Start the local API server with npm run dev.");
    }
    if (isFilled(response.error)) {
      throw new Error(String(response.error));
    }
    if (!response.body || typeof response.body !== "object") {
      throw new Error("Scan start endpoint returned an invalid response.");
    }
    if (response.body.accepted === false) {
      throw new Error(firstFilled(response.body.error, "Scan request was rejected by backend."));
    }
    return response.body;
  }

  async function dispatchDashboardScanStop(payload) {
    const response = await postJsonToCandidateEndpoints(
      [
        window.NEON_SCAN_ENDPOINTS?.stop,
        window.NEON_SCAN_ENDPOINTS?.kill,
        window.NEON_DATA_ENDPOINTS?.scanStop,
        "/api/scan/stop",
        "/api/scan/kill",
        ...LOCAL_SCAN_API_BASE_CANDIDATES.map((baseUrl) => `${baseUrl}/api/scan/stop`),
        ...LOCAL_SCAN_API_BASE_CANDIDATES.map((baseUrl) => `${baseUrl}/api/scan/kill`)
      ],
      payload
    );
    if (!response) {
      throw new Error("Scan stop endpoint is unavailable. Start the local API server with npm run dev.");
    }
    if (isFilled(response.error)) {
      throw new Error(String(response.error));
    }
    if (!response.body || typeof response.body !== "object") {
      throw new Error("Scan stop endpoint returned an invalid response.");
    }
    if (response.body.accepted === false) {
      throw new Error(firstFilled(response.body.error, "Scan stop request was rejected by backend."));
    }
    return response.body;
  }

  async function postJsonToCandidateEndpoints(candidates, body) {
    const uniqueCandidates = [...new Set(toArray(candidates).filter(Boolean))];
    let lastError = "";
    for (const url of uniqueCandidates) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(body)
        });

        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await response.json()
          : { message: await response.text() };

        if (!response.ok) {
          lastError = firstFilled(payload?.error, payload?.message, `Request failed (${response.status})`);
          continue;
        }
        return {
          error: "",
          url,
          body: payload
        };
      } catch (_error) {
        const currentOrigin = isFilled(window.location?.origin) ? String(window.location.origin) : "current origin";
        lastError = `Unable to reach scan endpoint from ${currentOrigin}. Start local API server with npm run dev and open dashboard via http://localhost:8080/web/pages/dashboard/.`;
      }
    }
    if (isFilled(lastError)) {
      return {
        error: lastError,
        url: "",
        body: null
      };
    }
    return null;
  }

  function isGitHubRepoUrl(value) {
    if (!isFilled(value)) {
      return false;
    }
    const pattern = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?\/?$/i;
    return pattern.test(String(value).trim());
  }

  function extractRepoNameFromGitHubUrl(value) {
    if (!isFilled(value)) {
      return "";
    }
    try {
      const parsed = new URL(String(value).trim());
      if (!parsed.hostname.toLowerCase().includes("github.com")) {
        return "";
      }
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length < 2) {
        return "";
      }
      return normalizeRepoName(segments[1].replace(/\.git$/i, ""));
    } catch (_error) {
      return "";
    }
  }

  function getPathBasename(pathValue) {
    if (!isFilled(pathValue)) {
      return "";
    }
    const normalized = String(pathValue).trim().replace(/[\\/]+$/, "");
    const segments = normalized.split(/[\\/]/).filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : "";
  }

  function resolveLocalDirectoryPath(files) {
    const fileList = toArray(files);
    if (fileList.length === 0) {
      return "";
    }

    const firstFile = fileList[0];
    const relativePath = String(firstFile.webkitRelativePath || "").replace(/\\/g, "/");
    const relativeSegments = relativePath.split("/").filter(Boolean);
    const rootFolder = relativeSegments[0] || "";
    const absoluteFilePath = isFilled(firstFile.path) ? String(firstFile.path).replace(/\\/g, "/") : "";

    if (isFilled(absoluteFilePath) && relativeSegments.length > 0) {
      const relativeSuffix = relativeSegments.join("/");
      if (absoluteFilePath.endsWith(relativeSuffix)) {
        const basePath = absoluteFilePath.slice(0, absoluteFilePath.length - relativeSuffix.length).replace(/[\\/]+$/, "");
        return isFilled(rootFolder) ? `${basePath}/${rootFolder}` : basePath;
      }
    }

    if (isFilled(absoluteFilePath)) {
      const withoutFileName = absoluteFilePath.replace(/\/[^/]+$/, "");
      return withoutFileName;
    }

    return rootFolder;
  }

  function setDashboardSourceStatus(message, tone) {
    const status = byId("dashboard-source-status");
    if (!status) {
      return;
    }

    status.textContent = isFilled(message) ? String(message) : "Source status unavailable";
    status.classList.remove("text-text-muted", "text-primary", "text-success", "text-critical");

    if (tone === "success") {
      status.classList.add("text-success");
      return;
    }
    if (tone === "error") {
      status.classList.add("text-critical");
      return;
    }
    if (tone === "info") {
      status.classList.add("text-primary");
      return;
    }
    status.classList.add("text-text-muted");
  }

  function firstFilled(...values) {
    for (const value of values) {
      if (isFilled(value)) {
        return String(value).trim();
      }
    }
    return "";
  }

  function renderCodex(data) {
    if (!data || typeof data !== "object") {
      return;
    }

    const storedContext = getStoredScanContext();
    const repoFromCodex = normalizeRepoName(data.repo || storedContext.repo || byId("codex-header-repo")?.textContent);
    const codexHeaderContext = applyHeaderScanContext(
      "codex-header-repo",
      "codex-session-id",
      repoFromCodex,
      data.sessionId || storedContext.sessionId,
      false
    );

    const systemStatus = toUpper(data.systemStatus);
    if (systemStatus) {
      setText("codex-system-status", `SYSTEM STATUS: ${systemStatus}`);
    }
    if (isFilled(data.uptime)) {
      setText("codex-uptime", data.uptime);
    }
    if (isFilled(data.version)) {
      setText("codex-version", data.version);
    }

    const activeFrameworks = toArray(data.activeFrameworks);
    if (activeFrameworks.length > 0) {
      setText("codex-framework-count", String(activeFrameworks.length).padStart(2, "0"));
    }

    const frameworkList = byId("codex-framework-list");
    if (frameworkList && activeFrameworks.length > 0) {
      frameworkList.innerHTML = activeFrameworks
        .map((framework) => {
          const active = framework.active !== false;
          const rowClass = active
            ? "flex items-center justify-between group cursor-pointer"
            : "flex items-center justify-between group cursor-pointer opacity-40 hover:opacity-100 transition-opacity";
          const dotClass = active ? "w-1.5 h-1.5 bg-primary rounded-full shadow-glow" : "w-1.5 h-1.5 bg-border-dark rounded-full";
          const nameClass = active
            ? "text-xs font-mono text-white group-hover:text-primary transition-colors"
            : "text-xs font-mono text-text-muted line-through group-hover:text-white group-hover:no-underline transition-colors";

          return `
            <div class="${rowClass}">
              <div class="flex items-center gap-3">
                <div class="${dotClass}"></div>
                <span class="${nameClass}">${escapeHtml(humanizeText(framework.name || "UNKNOWN"))}</span>
              </div>
              <span class="text-[10px] text-text-muted font-mono">${escapeHtml(humanizeText(framework.version || (active ? "ACTIVE" : "OFF")))}</span>
            </div>
          `;
        })
        .join("");
    }

    if (isFilled(data.selectedFramework)) {
      setText("codex-selected-framework", data.selectedFramework);
    }

    if (data.operator && typeof data.operator === "object") {
      if (isFilled(data.operator.name)) {
        setText("codex-operator-name", data.operator.name);
      }
      if (isFilled(data.operator.avatar)) {
        const avatar = byId("codex-operator-avatar");
        if (avatar) {
          avatar.style.backgroundImage = `url("${data.operator.avatar}")`;
        }
      }
    }

    const library = toArray(data.library);
    const libraryList = byId("codex-library-list");
    if (libraryList && library.length > 0) {
      libraryList.innerHTML = library
        .map((item) => {
          const selected = item.selected === true;
          if (selected) {
            return `
              <button class="w-full text-left group flex items-center justify-between px-4 py-3 bg-primary text-background-dark font-bold border border-primary relative overflow-hidden">
                <div class="flex items-center gap-3 relative z-10">
                  <span class="material-symbols-outlined text-[18px]">folder_open</span>
                  <span class="tracking-wide text-sm font-mono">${escapeHtml(humanizeText(item.name || "Unnamed"))}</span>
                </div>
                <div class="absolute top-0 right-0 size-2 bg-background-dark transform rotate-45 translate-x-1.5 -translate-y-1.5"></div>
              </button>
            `;
          }

          return `
            <button class="w-full text-left group flex items-center justify-between px-4 py-3 hover:bg-white/5 text-text-muted hover:text-primary transition-all border border-transparent hover:border-border-dark">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[18px]">folder</span>
                <span class="tracking-wide text-sm font-mono">${escapeHtml(humanizeText(item.name || "Unnamed"))}</span>
              </div>
            </button>
          `;
        })
        .join("");
    }

    if (isFilled(data.lastSync)) {
      setText("codex-last-sync", data.lastSync);
    }

    if (data.activeRuleset && typeof data.activeRuleset === "object") {
      if (isFilled(data.activeRuleset.title)) {
        setText("codex-ruleset-title", data.activeRuleset.title);
      }
      if (isFilled(data.activeRuleset.description)) {
        setText("codex-ruleset-description", data.activeRuleset.description);
      }

      const status = toUpper(data.activeRuleset.status || "ENFORCED");
      const statusElement = byId("codex-ruleset-status");
      if (statusElement) {
        statusElement.innerHTML = `<span class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>STATUS: ${escapeHtml(status)}`;
      }

      if (Number.isFinite(Number(data.activeRuleset.mandates))) {
        setText("codex-mandates-count", `${Number(data.activeRuleset.mandates)} MANDATES`);
      }
    }

    const sections = toArray(data.mandateSections);
    const sectionsRoot = byId("codex-mandates-sections");
    if (sectionsRoot && sections.length > 0) {
      sectionsRoot.innerHTML = sections
        .map((section, index) => renderCodexSection(section, index))
        .join("");
    }

    const activeFrameworkCount = activeFrameworks.filter((framework) => framework && framework.active !== false).length;
    const totalFrameworkCount = activeFrameworks.length;
    const rulesetStatus = data.activeRuleset?.status || "UNKNOWN";
    const mandatesCount = Number.isFinite(Number(data.activeRuleset?.mandates))
      ? String(data.activeRuleset.mandates)
      : "--";

    setFooterTicker("codex-footer-ticker", [
      { label: "Repo", value: codexHeaderContext.repo, tone: "primary" },
      { label: "Session", value: codexHeaderContext.sessionId, tone: "primary" },
      { label: "Ruleset", value: data.activeRuleset?.title || data.selectedFramework || "N/A", tone: "primary" },
      { label: "Ruleset Status", value: rulesetStatus, tone: inferToneToken(rulesetStatus) },
      { label: "Mandates", value: mandatesCount, tone: "primary" },
      { label: "Frameworks Active", value: `${activeFrameworkCount}/${totalFrameworkCount || "--"}`, tone: "primary" },
      { label: "Operator", value: data.operator?.name || "N/A", tone: "primary" },
      { label: "Last Sync", value: data.lastSync || "N/A", tone: "primary" }
    ]);
  }

  function renderScanReport(data) {
    if (!data || typeof data !== "object") {
      return;
    }

    const systemStatus = toUpper(data.systemStatus);
    if (systemStatus) {
      setText("scan-system-status", systemStatus);
    }

    const health = Math.max(0, Math.min(100, Number(data.health)));
    const healthBar = byId("scan-system-health-bar");
    if (healthBar && Number.isFinite(health)) {
      healthBar.style.width = `${health}%`;
    }

    if (isFilled(data.cpu)) {
      setText("scan-cpu", `CPU: ${data.cpu}`);
    }
    if (isFilled(data.memory)) {
      setText("scan-memory", `MEM: ${data.memory}`);
    }

    const frameworkList = byId("scan-framework-list");
    const frameworks = toArray(data.frameworks);
    if (frameworkList && frameworks.length > 0) {
      frameworkList.innerHTML = frameworks
        .map((framework) => {
          const enabled = framework.enabled !== false;
          const nameClass = enabled
            ? "text-xs font-mono text-white group-hover:text-primary transition-colors"
            : "text-xs font-mono text-text-muted group-hover:text-primary transition-colors";

          return `
            <label class="flex items-center justify-between cursor-pointer group">
              <span class="${nameClass}">${escapeHtml(humanizeText(framework.name || "UNKNOWN"))}</span>
              <input ${enabled ? "checked" : ""} class="form-checkbox h-3 w-3 text-primary bg-background border-border rounded-none focus:ring-0 focus:ring-offset-0" type="checkbox"/>
            </label>
          `;
        })
        .join("");
    }

    if (isFilled(data.repo)) {
      setText("scan-repo", data.repo);
    }
    if (isFilled(data.ref)) {
      setText("scan-ref", data.ref);
    }
    if (isFilled(data.reportId)) {
      setText("scan-report-id", data.reportId);
    }
    if (isFilled(data.scanSessionFolder)) {
      setText("scan-session-folder", data.scanSessionFolder);
    } else {
      setText("scan-session-folder", "--");
    }

    const scanResultFiles = toArray(data.scanResultFiles);
    setText(
      "scan-result-file-count",
      `${Number.isFinite(Number(data.scanResultFileCount)) ? Number(data.scanResultFileCount) : scanResultFiles.length} files`
    );

    const scanResultFilesRoot = byId("scan-result-files");
    if (scanResultFilesRoot) {
      scanResultFilesRoot.innerHTML = scanResultFiles.length > 0
        ? scanResultFiles
          .map((fileName) => `
            <div class="bg-surface/30 border border-border px-2.5 py-2 flex items-center justify-between hover:border-primary/50 transition-colors">
              <div class="flex items-center gap-2 text-text-main">
                <span class="material-symbols-outlined text-[14px] text-primary">description</span>
                <span class="text-[10px] font-mono uppercase">${escapeHtml(fileName)}</span>
              </div>
              <span class="text-[8px] text-text-muted">JSON</span>
            </div>
          `).join("")
        : `<div class="text-text-muted text-[10px] font-mono">No result files available for this session.</div>`;
    }

    const failedMandates = toArray(data.failedMandates);
    const passedChecks = toArray(data.passedChecks);
    const rawFailCount = Number(data.fail);
    const derivedFailCount = Number.isFinite(rawFailCount) ? Math.max(0, Math.round(rawFailCount)) : failedMandates.length;
    const passRate = resolveScanPassRate(data, derivedFailCount, passedChecks.length);

    const bannerTone = getBannerToneByScore(
      passRate,
      data.severity || data.status || (derivedFailCount > 0 ? "critical" : "success")
    );
    styleScanBanner(bannerTone);

    const computedTitle = buildScanStatusTitle(data, failedMandates, derivedFailCount);
    if (isFilled(computedTitle)) {
      setText("scan-status-title", computedTitle);
    }

    const computedSubtitle = buildScanStatusSubtitle(data, derivedFailCount, passRate);
    if (isFilled(computedSubtitle)) {
      setText("scan-status-subtitle", computedSubtitle);
    }

    const roundedPassRate = Number.isFinite(passRate) ? Math.round(passRate) : null;
    setText("scan-banner-pass-rate", roundedPassRate !== null ? `${roundedPassRate}%` : "--%");
    const bannerScoreFill = byId("scan-banner-score-fill");
    if (bannerScoreFill) {
      bannerScoreFill.style.width = `${Number.isFinite(passRate) ? passRate : 0}%`;
    }

    startLiveTimestampClock("scan-timestamp");

    setText("scan-pass-rate", roundedPassRate !== null ? `${roundedPassRate}%` : "--%");
    const circle = byId("scan-pass-rate-circle");
    if (circle) {
      const radius = 45;
      const circumference = 2 * Math.PI * radius;
      const fillAmount = ((Number.isFinite(passRate) ? passRate : 0) / 100) * circumference;
      circle.setAttribute("stroke", bannerTone.hex);
      circle.setAttribute("stroke-dasharray", `${fillAmount} ${circumference}`);
    }

    if (Number.isFinite(Number(data.success))) {
      setText("scan-success-count", String(data.success));
    }
    setText("scan-fail-count", String(derivedFailCount).padStart(2, "0"));

    const severityIndex = toArray(data.severityIndex);
    const severityIndexRoot = byId("scan-severity-index");
    if (severityIndexRoot && severityIndex.length > 0) {
      severityIndexRoot.innerHTML = severityIndex
        .map((item) => {
          const tone = getTone(item.severity || item.label);
          const pct = Math.max(0, Math.min(100, Number(item.percent)));
          return `
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px] font-mono">
                <span class="${tone.textClass}">${escapeHtml(humanizeText(item.label || "SEVERITY"))}</span>
                <span class="text-white">${escapeHtml(item.count ?? "0")}</span>
              </div>
              <div class="w-full bg-border h-1.5">
                <div class="${tone.bgClass} h-1.5" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        })
        .join("");
    }

    const failedRoot = byId("scan-failed-mandates-list");
    if (failedRoot && failedMandates.length > 0) {
      failedRoot.innerHTML = failedMandates.map((item) => renderFailedMandate(item)).join("");
    }

    if (passedChecks.length > 0) {
      setText("scan-passed-count", String(passedChecks.length));
    }

    const passedRoot = byId("scan-passed-list");
    if (passedRoot && passedChecks.length > 0) {
      const overflow = Number.isFinite(Number(data.passedOverflow)) ? Number(data.passedOverflow) : 0;
      passedRoot.innerHTML = `${passedChecks
        .map(
          (item) => `
            <div class="bg-surface/30 border border-border px-2.5 py-2 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer">
              <div class="flex flex-col">
              <span class="text-[8px] text-text-muted font-mono font-bold">${escapeHtml(humanizeText(item.code || "UNKNOWN"))}</span>
              <span class="text-[10px] text-white font-mono uppercase">${escapeHtml(humanizeText(item.title || "Untitled Check"))}</span>
            </div>
              <span class="material-symbols-outlined text-success text-[16px]">check</span>
            </div>
          `
        )
        .join("")}
        ${
          overflow > 0
            ? `<div class="text-center py-2 text-[9px] font-mono text-text-muted border border-border border-dashed hover:text-white transition-colors cursor-pointer uppercase">+ ${overflow} more compliant mandates</div>`
            : ""
        }`;
    }

    const notApplicable = toArray(data.notApplicable);
    if (notApplicable.length > 0) {
      setText("scan-not-applicable-count", String(notApplicable.length));
    }

    const notApplicableRoot = byId("scan-not-applicable-list");
    if (notApplicableRoot && notApplicable.length > 0) {
      notApplicableRoot.innerHTML = notApplicable
        .map(
          (item, index) => `
            <div class="flex items-center justify-between text-[10px] font-mono text-text-muted">
              <span class="uppercase">${escapeHtml(humanizeText(item.name || "N/A"))}</span>
              <span class="text-[8px] px-1 border border-text-muted">N/A</span>
            </div>
            ${index < notApplicable.length - 1 ? '<div class="w-full h-px bg-border"></div>' : ""}
          `
        )
        .join("");
    }

    if (isFilled(data.sessionToken)) {
      setText("scan-session-token", data.sessionToken);
    }
    if (isFilled(data.node)) {
      setText("scan-node", data.node);
    }

    const storedContext = getStoredScanContext();
    const repoFromScanReport = normalizeRepoName(data.repo || byId("scan-repo")?.textContent);
    const preferredRepo = isFilled(data.sessionId)
      ? repoFromScanReport
      : normalizeRepoName(storedContext.repo) || repoFromScanReport;
    const scanHeaderContext = applyHeaderScanContext("scan-repo", "scan-session-id", preferredRepo, data.sessionId, false);
    const passRateTone = roundedPassRate === null ? "primary" : roundedPassRate >= 85 ? "success" : roundedPassRate >= 60 ? "warning" : "critical";

    setFooterTicker("scan-footer-ticker", [
      { label: "Repo", value: scanHeaderContext.repo, tone: "primary" },
      { label: "Session", value: scanHeaderContext.sessionId, tone: "primary" },
      { label: "Report", value: data.reportId || "N/A", tone: "primary" },
      { label: "Status", value: computedTitle || data.status || "UNKNOWN", tone: inferToneToken(data.severity || computedTitle) },
      { label: "Pass Rate", value: roundedPassRate !== null ? `${roundedPassRate}%` : "--", tone: passRateTone },
      { label: "Success", value: Number.isFinite(Number(data.success)) ? String(data.success) : "--", tone: "success" },
      { label: "Fail", value: String(derivedFailCount), tone: derivedFailCount > 0 ? "critical" : "success" },
      { label: "Open Mandates", value: String(derivedFailCount), tone: derivedFailCount > 0 ? "warning" : "success" },
      { label: "Ref", value: data.ref || "N/A", tone: "primary" },
      { label: "Node", value: data.node || "N/A", tone: "primary" }
    ]);
  }

  function buildScanStatusTitle(data, failedMandates, failCount) {
    if (isFilled(data.statusTitle)) {
      return String(data.statusTitle);
    }

    const criticalCount = failedMandates.filter((item) => String(item?.severity || "").toLowerCase().includes("critical")).length;
    if (failCount <= 0) {
      return "COMPLIANCE CHECKS PASSED";
    }
    if (criticalCount > 0) {
      return "CRITICAL MANDATES REQUIRE ACTION";
    }
    if (failCount > 0) {
      return `${failCount} MANDATES REQUIRE REVIEW`;
    }
    return "LIVE COMPLIANCE POSTURE";
  }

  function buildScanStatusSubtitle(data, failCount, passRate) {
    const result = toUpper(data.result || (failCount > 0 ? "MANDATE_GAPS_FOUND" : "ALL_CHECKS_PASSED"));
    const action = toUpper(data.action || (failCount > 0 ? "REMEDIATION_IN_PROGRESS" : "CONTINUOUS_MONITORING"));
    const passRateToken = Number.isFinite(passRate) ? `${Math.round(passRate)}%` : "--";
    return `// RESULT: ${result} // OPEN MANDATES: ${failCount} // PASS RATE: ${passRateToken} // ${action}`;
  }

  function getBannerToneByScore(passRate, fallback) {
    if (Number.isFinite(passRate)) {
      if (passRate >= 85) {
        return getTone("success");
      }
      if (passRate >= 60) {
        return getTone("warning");
      }
      return getTone("critical");
    }
    return getTone(fallback);
  }

  function resolveScanPassRate(data, failCount, passedCount) {
    const directPassRate = Number(data.passRate);
    if (Number.isFinite(directPassRate)) {
      return Math.max(0, Math.min(100, directPassRate));
    }

    const passedOverflow = Number(data.passedOverflow);
    const effectivePassedCount = Math.max(0, Number.isFinite(passedCount) ? passedCount : 0) + Math.max(0, Number.isFinite(passedOverflow) ? passedOverflow : 0);
    const successCount = Number(data.success);
    if (Number.isFinite(successCount) && successCount >= 0) {
      const total = successCount + Math.max(0, Number.isFinite(failCount) ? failCount : 0);
      if (total > 0) {
        return Math.max(0, Math.min(100, (successCount / total) * 100));
      }
    }

    const totalFromChecks = effectivePassedCount + Math.max(0, Number.isFinite(failCount) ? failCount : 0);
    if (totalFromChecks > 0) {
      return Math.max(0, Math.min(100, (effectivePassedCount / totalFromChecks) * 100));
    }

    return NaN;
  }

  function startLiveTimestampClock(elementId) {
    const timestampNode = byId(elementId);
    if (!timestampNode) {
      return;
    }

    const updateTimestamp = () => {
      timestampNode.textContent = formatLocalTimestamp(new Date());
    };

    if (!timestampNode.dataset.liveClockBound) {
      timestampNode.dataset.liveClockBound = "1";
      window.setInterval(updateTimestamp, 1000);
    }

    updateTimestamp();
  }

  function renderCodexSection(section, index) {
    const sectionLabel = `${String(index + 1).padStart(2, "0")} // ${escapeHtml(section.title || "SECTION")}`;
    const muted = section.muted === true;
    const sectionClass = muted
      ? "text-text-muted font-mono font-bold text-lg opacity-60"
      : "text-primary font-mono font-bold text-lg";

    const items = toArray(section.items);

    return `
      <div class="flex items-center gap-4 py-4 ${index > 0 ? "mt-8" : "mt-2"}">
        <span class="${sectionClass}">${sectionLabel}</span>
        <div class="h-px bg-border-dark flex-1"></div>
      </div>
      ${items.map((item) => renderCodexMandate(item)).join("")}
    `;
  }

  function renderCodexMandate(item) {
    const tone = getTone(item.status);
    const badge = toUpper(item.status || "UNKNOWN");
    const expanded = item.expanded === true;

    return `
      <div class="border ${tone.borderClass} bg-surface-dark relative group transition-all ${expanded ? "overflow-hidden" : ""}">
        <div class="absolute top-0 bottom-0 left-0 w-1 ${tone.bgClass}"></div>
        <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors">
          <div class="flex items-start md:items-center gap-5">
            <button class="border border-border-dark size-6 flex items-center justify-center text-text-muted hover:text-white hover:border-white transition-all bg-background-dark">
              <span class="material-symbols-outlined text-base">${expanded ? "remove" : "add"}</span>
            </button>
            <div>
              <div class="flex items-center gap-3 mb-1">
                <span class="font-mono ${tone.textClass} font-bold text-sm">${escapeHtml(item.id || "MANDATE")}</span>
                <span class="${tone.badgeClass} text-[10px] px-1.5 py-0.5 font-bold border ${tone.badgeBorderClass} font-mono">${escapeHtml(badge)}</span>
              </div>
              <h4 class="text-white font-bold text-lg tracking-wide font-display">${escapeHtml(item.title || "Untitled Mandate")}</h4>
            </div>
          </div>
          <div class="flex items-center gap-6 pr-2">
            <div class="text-right hidden sm:block">
              <div class="text-[10px] text-text-muted font-mono">LAST SCAN</div>
              <div class="text-xs text-white font-mono">${escapeHtml(item.lastScan || "N/A")}</div>
            </div>
            <div class="size-3 rounded-full ${tone.bgClass} ${tone.glowClass}"></div>
          </div>
        </div>
        ${expanded ? renderCodexExpanded(item) : ""}
      </div>
    `;
  }

  function renderCodexExpanded(item) {
    const details = item.details && typeof item.details === "object" ? item.details : {};
    const evidence = toArray(details.evidence);

    return `
      <div class="px-5 pb-5 pl-[4.25rem] pr-8 border-t border-border-dark/50 pt-5 bg-black/30">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="md:col-span-2 space-y-4">
            <p class="text-text-main text-sm leading-relaxed font-mono opacity-90">${escapeHtml(details.description || item.description || "")}</p>
            <div class="bg-background-dark border border-border-dark p-3">
              <div class="flex items-center justify-between mb-2 border-b border-border-dark pb-2">
                <span class="text-[10px] text-text-muted font-bold tracking-wider font-mono">EVIDENCE LOG</span>
                <span class="text-[10px] text-primary font-mono font-bold">${escapeHtml(toUpper(details.evidenceStatus || "VERIFIED"))}</span>
              </div>
              <div class="font-mono text-xs text-text-muted font-light">
                ${
                  evidence.length > 0
                    ? evidence
                        .map((line) => `<span class="text-primary">&gt;</span> ${escapeHtml(line)}<br/>`)
                        .join("")
                    : '<span class="text-primary">&gt;</span> No evidence records found.<br/>'
                }
              </div>
            </div>
          </div>
          <div class="md:col-span-1 border-l border-border-dark pl-6 flex flex-col gap-4">
            <div>
              <span class="text-[10px] text-text-muted font-bold block mb-1 font-mono">CATEGORY</span>
              <span class="text-sm text-white font-mono">${escapeHtml(details.category || item.category || "Unspecified")}</span>
            </div>
            <div>
              <span class="text-[10px] text-text-muted font-bold block mb-1 font-mono">PRIORITY</span>
              <span class="text-sm text-white font-mono">${escapeHtml(details.priority || item.priority || "P2 - Medium")}</span>
            </div>
            <button class="mt-2 w-full py-2 border border-border-dark hover:border-text-main text-xs font-bold text-text-main hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-mono">
              <span class="material-symbols-outlined text-[16px]">visibility</span>
              VIEW DETAILS
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderFailedMandate(item) {
    const tone = getTone(item.severity || "critical");
    const mandateLink = isFilled(item.documentationUrl) ? item.documentationUrl : "../compliance-codex/index.html";

    return `
      <div class="border ${tone.borderClass} bg-surface/50 relative group">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-3">
                <span class="${tone.bgClass} text-black text-[10px] font-mono font-bold px-2 py-0.5">${escapeHtml(toUpper(item.severity || "HIGH"))}</span>
                <span class="text-white font-mono font-bold text-lg tracking-tight">${escapeHtml(item.code || "MANDATE")}</span>
              </div>
              <div class="flex flex-col">
                <h4 class="text-lg text-white font-mono font-bold uppercase leading-tight">${escapeHtml(item.title || "Issue")}</h4>
                <p class="text-[11px] text-text-muted font-mono mt-1">DOC: ${escapeHtml(item.document || "N/A")} // SECTION: ${escapeHtml(item.section || "N/A")}</p>
              </div>
            </div>
            <span class="material-symbols-outlined ${tone.textClass}/30 group-hover:${tone.textClass} transition-colors text-3xl">${escapeHtml(item.icon || "report")}</span>
          </div>
          <div class="bg-background border-l-2 ${tone.borderClass} p-4 mb-6">
            <div class="font-mono text-sm text-text-main leading-relaxed">
              <span class="${tone.textClass} opacity-50">&gt;</span> ${escapeHtml(item.violation || "Violation details unavailable.")}<br/>
              <span class="${tone.textClass} opacity-50">&gt;</span> ${escapeHtml(item.required || "Mitigation details unavailable.")}
            </div>
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border border-dashed">
            <div class="flex items-center gap-2 text-text-muted hover:text-white transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-sm">info</span>
              <span class="text-[10px] font-mono uppercase">Internal Reference ID: ${escapeHtml(item.reference || "N/A")}</span>
            </div>
            <a class="w-full sm:w-auto px-6 py-2 border ${tone.borderClass} ${tone.textClass} text-xs font-bold font-mono hover:${tone.bgClass} hover:text-black transition-all text-center uppercase tracking-widest" href="${escapeHtml(mandateLink)}">
              [ VIEW MANDATE DOCUMENTATION ]
            </a>
          </div>
        </div>
      </div>
    `;
  }

  function styleScanBanner(tone) {
    const banner = byId("scan-banner");
    const stripe = byId("scan-banner-stripe");
    const title = byId("scan-status-title");
    const subtitle = byId("scan-status-subtitle");
    const icon = byId("scan-status-icon");
    const bannerPassRate = byId("scan-banner-pass-rate");
    const bannerScoreFill = byId("scan-banner-score-fill");

    if (banner) {
      banner.classList.remove(
        "border-critical",
        "bg-critical/5",
        "border-warning",
        "bg-warning/5",
        "border-success",
        "bg-success/5",
        "border-primary",
        "bg-primary/5"
      );
      banner.classList.add(tone.borderClass, tone.bannerBgClass);
    }

    if (stripe) {
      stripe.classList.remove("bg-critical", "bg-warning", "bg-success", "bg-primary");
      stripe.classList.add(tone.bgClass);
    }

    if (title) {
      title.classList.remove("text-critical", "text-warning", "text-success", "text-primary");
      title.classList.add(tone.textClass);
    }

    if (subtitle) {
      subtitle.classList.remove("text-critical/70", "text-warning/70", "text-success/70", "text-primary/70");
      subtitle.classList.add(tone.subtitleClass);
    }

    if (icon) {
      icon.classList.remove("text-critical", "text-warning", "text-success", "text-primary");
      icon.classList.add(tone.textClass);
      icon.textContent = tone.icon || "radar";
    }

    if (bannerPassRate) {
      bannerPassRate.classList.remove("text-critical", "text-warning", "text-success", "text-primary");
      bannerPassRate.classList.add(tone.textClass);
    }

    if (bannerScoreFill) {
      bannerScoreFill.classList.remove("bg-critical", "bg-warning", "bg-success", "bg-primary");
      bannerScoreFill.classList.add(tone.bgClass);
    }
  }

  function getTone(value) {
    const token = String(value || "").toLowerCase();

    if (token.includes("critical") || token.includes("fail") || token.includes("blocker")) {
      return {
        textClass: "text-critical",
        bgClass: "bg-critical",
        borderClass: "border-critical",
        badgeClass: "bg-critical/20 text-critical",
        badgeBorderClass: "border-critical/30",
        subtitleClass: "text-critical/70",
        bannerBgClass: "bg-critical/5",
        glowClass: "shadow-glow-critical",
        hex: "#EF4444",
        icon: "dangerous"
      };
    }

    if (token.includes("warn") || token.includes("review") || token.includes("high")) {
      return {
        textClass: "text-warning",
        bgClass: "bg-warning",
        borderClass: "border-warning",
        badgeClass: "bg-warning/20 text-warning",
        badgeBorderClass: "border-warning/30",
        subtitleClass: "text-warning/70",
        bannerBgClass: "bg-warning/5",
        glowClass: "",
        hex: "#FACC15",
        icon: "report_problem"
      };
    }

    if (token.includes("pass") || token.includes("success") || token.includes("compliant") || token.includes("resolved")) {
      return {
        textClass: "text-success",
        bgClass: "bg-success",
        borderClass: "border-success",
        badgeClass: "bg-success/20 text-success",
        badgeBorderClass: "border-success/30",
        subtitleClass: "text-success/70",
        bannerBgClass: "bg-success/5",
        glowClass: "",
        hex: "#22C55E",
        icon: "verified"
      };
    }

    return {
      textClass: "text-primary",
      bgClass: "bg-primary",
      borderClass: "border-primary",
      badgeClass: "bg-primary/20 text-primary",
      badgeBorderClass: "border-primary/30",
      subtitleClass: "text-primary/70",
      bannerBgClass: "bg-primary/5",
      glowClass: "shadow-glow",
      hex: "#22D3EE",
      icon: "radar"
    };
  }

  function getStatusTextClass(status) {
    const token = String(status || "").toLowerCase();
    if (token.includes("critical") || token.includes("fail")) {
      return "text-critical";
    }
    if (token.includes("standby") || token.includes("review") || token.includes("warn")) {
      return "text-warning";
    }
    if (token.includes("pass") || token.includes("success") || token.includes("ready") || token.includes("online") || token.includes("ok")) {
      return "text-success";
    }
    return "text-text-muted";
  }

  function getLogLevelClass(level) {
    const token = String(level || "").toLowerCase();
    if (token.includes("critical") || token.includes("error") || token.includes("alert")) {
      return "text-critical";
    }
    if (token.includes("warn")) {
      return "text-warning";
    }
    if (token.includes("pass") || token.includes("success") || token.includes("ok")) {
      return "text-success";
    }
    return "text-primary";
  }

  function normalizeTime(raw) {
    if (!isFilled(raw)) {
      return "--:--:--";
    }
    return String(raw).replace(/^\[|\]$/g, "").trim();
  }

  function formatLocalTimestamp(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "--";
    }

    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    const timezone = Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;

    return `${day}-${month}-${year} ${hour}:${minute}:${second}${timezone ? ` ${timezone}` : ""}`;
  }

  function setFooterTicker(tickerId, items) {
    const ticker = byId(tickerId);
    if (!ticker) {
      return;
    }

    const normalizedItems = toArray(items).filter((item) => item && isFilled(item.value));
    if (normalizedItems.length === 0) {
      return;
    }

    const groupMarkup = normalizedItems
      .map((item) => renderFooterTickerItem(item))
      .join('<span class="footer-ticker-separator">|</span>');
    ticker.innerHTML = `<div class="footer-ticker-group">${groupMarkup}</div><div class="footer-ticker-group" aria-hidden="true">${groupMarkup}</div>`;
  }

  function renderFooterTickerItem(item) {
    return `
      <span class="footer-ticker-item">
        <span class="footer-ticker-label">${escapeHtml(humanizeText(item.label || "INFO"))}</span>
        <span class="${resolveFooterToneClass(item.tone || inferToneToken(item.value))}">${escapeHtml(humanizeText(item.value))}</span>
      </span>
    `;
  }

  function resolveFooterToneClass(tone) {
    const token = String(tone || "").toLowerCase();
    if (token.includes("critical") || token.includes("fail") || token.includes("error")) {
      return "text-critical";
    }
    if (token.includes("warn") || token.includes("review") || token.includes("high")) {
      return "text-warning";
    }
    if (token.includes("success") || token.includes("pass") || token.includes("ready") || token.includes("online") || token.includes("ok")) {
      return "text-success";
    }
    if (token.includes("primary") || token.includes("info")) {
      return "text-primary";
    }
    return "text-text-main";
  }

  function inferToneToken(value) {
    const token = String(value || "").toLowerCase();
    if (token.includes("critical") || token.includes("fail") || token.includes("error") || token.includes("blocker")) {
      return "critical";
    }
    if (token.includes("warn") || token.includes("review") || token.includes("high") || token.includes("standby")) {
      return "warning";
    }
    if (token.includes("pass") || token.includes("success") || token.includes("ready") || token.includes("online") || token.includes("ok") || token.includes("compliant")) {
      return "success";
    }
    return "primary";
  }

  function setText(id, value) {
    const node = byId(id);
    if (!node || !isFilled(value)) {
      return;
    }
    node.textContent = humanizeText(value);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toUpper(value) {
    return isFilled(value) ? humanizeText(value).toUpperCase() : "";
  }

  function humanizeText(value) {
    if (!isFilled(value)) {
      return "";
    }
    return String(value).replace(/_/g, " ").replace(/\s+/g, " ").trim();
  }

  function isFilled(value) {
    return value !== null && value !== undefined && String(value).trim() !== "";
  }

  function getPositiveNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) {
        return number;
      }
    }
    return 30000;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
