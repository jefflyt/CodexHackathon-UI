(() => {
  const page = document.body?.dataset?.page;
  if (!page) {
    return;
  }

  const defaultEndpoints = {
    dashboard: [
      window.NEON_DATA_ENDPOINTS?.dashboard,
      "/api/dashboard",
      "../data/dashboard.json"
    ],
    codex: [
      window.NEON_DATA_ENDPOINTS?.codex,
      "/api/compliance-codex",
      "../data/compliance-codex.json"
    ],
    "scan-report": [
      window.NEON_DATA_ENDPOINTS?.scanReport,
      "/api/scan-report",
      "../data/scan-report.json"
    ]
  };

  const renderers = {
    dashboard: renderDashboard,
    codex: renderCodex,
    "scan-report": renderScanReport
  };

  initialize().catch(() => {
    // Keep static HTML as fallback if live data fails.
  });

  async function initialize() {
    const renderer = renderers[page];
    if (!renderer) {
      return;
    }

    const firstData = await loadPageData(page);
    if (firstData) {
      renderer(firstData);
    }

    const refreshMs = getPositiveNumber(firstData?.refreshMs, window.NEON_REFRESH_MS, 30000);
    window.setInterval(async () => {
      const nextData = await loadPageData(page);
      if (nextData) {
        renderer(nextData);
      }
    }, refreshMs);
  }

  async function loadPageData(pageKey) {
    const configured = defaultEndpoints[pageKey] || [];
    const candidates = [...new Set(configured.filter(Boolean))];

    for (const url of candidates) {
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

  function renderDashboard(data) {
    if (!data || typeof data !== "object") {
      return;
    }

    const systemStatus = toUpper(data.systemStatus);
    if (systemStatus) {
      setText("dashboard-system-status", `SYSTEM_STATUS: ${systemStatus}`);
    }

    if (isFilled(data.uplinkStatus)) {
      setText("dashboard-uplink-status", `Uplink: ${data.uplinkStatus}`);
    }
    if (isFilled(data.node)) {
      setText("dashboard-node", data.node);
    }
    if (isFilled(data.latency)) {
      setText("dashboard-latency", data.latency);
    }
    if (isFilled(data.user)) {
      setText("dashboard-operator", data.user);
    }
    if (isFilled(data.protocol)) {
      setText("dashboard-protocol", `Protocol: ${data.protocol}`);
    }

    const targetInput = byId("dashboard-target-input");
    if (targetInput && isFilled(data.targetInput)) {
      targetInput.value = data.targetInput;
    }

    const frameworks = toArray(data.frameworks);
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
              <span class="${nameClass}">${escapeHtml(framework.name || "UNKNOWN")}</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input ${enabled ? "checked" : ""} class="sr-only peer" type="checkbox" value=""/>
                <div class="w-8 h-4 bg-surface peer-focus:outline-none border border-border rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary/20 peer-checked:border-primary peer-checked:after:bg-primary peer-checked:after:border-primary"></div>
              </label>
            </div>
          `;
        })
        .join("");
    }

    const targets = toArray(data.targets);
    const targetList = byId("dashboard-targets-list");
    if (targetList && targets.length > 0) {
      targetList.innerHTML = targets
        .map((target) => {
          const selected = target.selected === true;
          const status = String(target.status || "UNKNOWN");
          const statusClass = getStatusTextClass(status);
          const cardClass = selected
            ? "border border-primary bg-primary/5 p-3 cursor-pointer"
            : "border border-border p-3 opacity-60 hover:opacity-100 transition-all cursor-pointer";
          const titleClass = selected
            ? "text-[10px] font-mono text-primary font-bold"
            : "text-[10px] font-mono text-text-main";

          return `
            <div class="${cardClass}">
              <p class="${titleClass}">${escapeHtml(target.name || "unnamed-target")}</p>
              <p class="text-[9px] font-code mt-1 ${statusClass}">Status: ${escapeHtml(status)}</p>
            </div>
          `;
        })
        .join("");
    }

    const logs = toArray(data.logs);
    const logsList = byId("dashboard-logs-list");
    if (logsList && logs.length > 0) {
      logsList.innerHTML = `${logs
        .map((log, index) => {
          const levelClass = getLogLevelClass(log.level);
          const source = toUpper(log.source || "LOG");
          const time = escapeHtml(normalizeTime(log.time));
          const message = escapeHtml(log.message || "");
          const rowPadding = index >= 3 ? " pt-2" : "";

          return `
            <div class="flex gap-4${rowPadding}">
              <span class="text-text-muted shrink-0">[${time}]</span>
              <span class="${levelClass}">${source}:</span>
              <span class="text-text-main">${message}</span>
            </div>
          `;
        })
        .join("")}
        <div class="flex gap-4">
          <span class="text-primary shrink-0">&gt;</span>
          <span class="text-primary w-2 h-4 bg-primary cursor-blink"></span>
        </div>`;
    }

    if (data.summary && typeof data.summary === "object") {
      if (Number.isFinite(Number(data.summary.entries))) {
        setText("dashboard-log-entries", `ENTRIES: ${Number(data.summary.entries).toLocaleString("en-US")}`);
      }
      if (Number.isFinite(Number(data.summary.errors))) {
        setText("dashboard-log-errors", `ERRORS: ${Number(data.summary.errors).toLocaleString("en-US")}`);
      }
      if (Number.isFinite(Number(data.summary.warnings))) {
        setText("dashboard-log-warnings", `WARNINGS: ${Number(data.summary.warnings).toLocaleString("en-US")}`);
      }
    }

    const threatFeed = byId("dashboard-threat-feed");
    const threats = toArray(data.threats);
    if (threatFeed && threats.length > 0) {
      threatFeed.innerHTML = threats
        .map((threat) => {
          const severity = String(threat.severity || "info").toLowerCase();
          const label = toUpper(threat.label || severity);
          const className =
            severity === "critical" ? "text-critical" : severity === "warning" ? "text-warning" : "text-primary";
          return `<span class="${className}">${escapeHtml(label)}:</span> ${escapeHtml(threat.message || "")}`;
        })
        .join(" --- ");
    }
  }

  function renderCodex(data) {
    if (!data || typeof data !== "object") {
      return;
    }

    const systemStatus = toUpper(data.systemStatus);
    if (systemStatus) {
      setText("codex-system-status", `SYSTEM_STATUS: ${systemStatus}`);
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
                <span class="${nameClass}">${escapeHtml(framework.name || "UNKNOWN")}</span>
              </div>
              <span class="text-[10px] text-text-muted font-mono">${escapeHtml(framework.version || (active ? "ACTIVE" : "OFF"))}</span>
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
                  <span class="tracking-wide text-sm font-mono">${escapeHtml(item.name || "Unnamed")}</span>
                </div>
                <div class="absolute top-0 right-0 size-2 bg-background-dark transform rotate-45 translate-x-1.5 -translate-y-1.5"></div>
              </button>
            `;
          }

          return `
            <button class="w-full text-left group flex items-center justify-between px-4 py-3 hover:bg-white/5 text-text-muted hover:text-primary transition-all border border-transparent hover:border-border-dark">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[18px]">folder</span>
                <span class="tracking-wide text-sm font-mono">${escapeHtml(item.name || "Unnamed")}</span>
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
              <span class="${nameClass}">${escapeHtml(framework.name || "UNKNOWN")}</span>
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

    if (isFilled(data.status)) {
      setText("scan-status-title", data.status);
    }

    const result = toUpper(data.result);
    const action = toUpper(data.action || "IMMEDIATE_ACTION_REQUIRED");
    if (result) {
      setText("scan-status-subtitle", `// SCAN_RESULT: ${result} // ${action}`);
    }

    if (isFilled(data.timestampUtc)) {
      setText("scan-timestamp", data.timestampUtc);
    }

    const bannerTone = getTone(data.severity || data.status);
    styleScanBanner(bannerTone);

    const passRate = Math.max(0, Math.min(100, Number(data.passRate)));
    if (Number.isFinite(passRate)) {
      setText("scan-pass-rate", `${Math.round(passRate)}%`);
      const circle = byId("scan-pass-rate-circle");
      if (circle) {
        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const fillAmount = (passRate / 100) * circumference;
        circle.setAttribute("stroke", bannerTone.hex);
        circle.setAttribute("stroke-dasharray", `${fillAmount} ${circumference}`);
      }
    }

    if (Number.isFinite(Number(data.success))) {
      setText("scan-success-count", String(data.success));
    }
    if (Number.isFinite(Number(data.fail))) {
      setText("scan-fail-count", String(data.fail).padStart(2, "0"));
    }

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
                <span class="${tone.textClass}">${escapeHtml(item.label || "SEVERITY")}</span>
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

    const failedMandates = toArray(data.failedMandates);
    const failedRoot = byId("scan-failed-mandates-list");
    if (failedRoot && failedMandates.length > 0) {
      failedRoot.innerHTML = failedMandates.map((item) => renderFailedMandate(item)).join("");
    }

    const passedChecks = toArray(data.passedChecks);
    if (passedChecks.length > 0) {
      setText("scan-passed-count", String(passedChecks.length));
    }

    const passedRoot = byId("scan-passed-list");
    if (passedRoot && passedChecks.length > 0) {
      const overflow = Number.isFinite(Number(data.passedOverflow)) ? Number(data.passedOverflow) : 0;
      passedRoot.innerHTML = `${passedChecks
        .map(
          (item) => `
            <div class="bg-surface/30 border border-border p-3 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer">
              <div class="flex flex-col">
                <span class="text-[9px] text-text-muted font-mono font-bold">${escapeHtml(item.code || "UNKNOWN")}</span>
                <span class="text-[11px] text-white font-mono uppercase">${escapeHtml(item.title || "Untitled Check")}</span>
              </div>
              <span class="material-symbols-outlined text-primary text-[18px]">check</span>
            </div>
          `
        )
        .join("")}
        ${
          overflow > 0
            ? `<div class="text-center py-3 text-[10px] font-mono text-text-muted border border-border border-dashed hover:text-white transition-colors cursor-pointer uppercase">+ ${overflow} more compliant mandates</div>`
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
            <div class="flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span class="uppercase">${escapeHtml(item.name || "N/A")}</span>
              <span class="text-[9px] px-1 border border-text-muted">N/A</span>
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
                <span class="text-[10px] text-text-muted font-bold tracking-wider font-mono">EVIDENCE_LOG</span>
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
    const mandateLink = isFilled(item.documentationUrl) ? item.documentationUrl : "../02-compliance-codex/index.html";

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

    if (banner) {
      banner.classList.remove("border-critical", "bg-critical/5", "border-warning", "bg-warning/5", "border-primary", "bg-primary/5");
      banner.classList.add(tone.borderClass, tone.bannerBgClass);
    }

    if (stripe) {
      stripe.classList.remove("bg-critical", "bg-warning", "bg-primary");
      stripe.classList.add(tone.bgClass);
    }

    if (title) {
      title.classList.remove("text-critical", "text-warning", "text-primary");
      title.classList.add(tone.textClass);
    }

    if (subtitle) {
      subtitle.classList.remove("text-critical/70", "text-warning/70", "text-primary/70");
      subtitle.classList.add(tone.subtitleClass);
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
        hex: "#FF2A6D"
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
        hex: "#FFD700"
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
      hex: "#00FF94"
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
    return "text-primary";
  }

  function normalizeTime(raw) {
    if (!isFilled(raw)) {
      return "--:--:--";
    }
    return String(raw).replace(/^\[|\]$/g, "").trim();
  }

  function setText(id, value) {
    const node = byId(id);
    if (!node || !isFilled(value)) {
      return;
    }
    node.textContent = String(value);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toUpper(value) {
    return isFilled(value) ? String(value).toUpperCase() : "";
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
