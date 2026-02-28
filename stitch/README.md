# Stitch Export Artifacts

Project ID: `17364003346462371476`

## Saved code
- `stitch/01-dashboard-command/index.html`
- `stitch/02-compliance-codex/index.html`
- `stitch/03-scan-report/index.html`
- `stitch/assets/live-data.js`
- `stitch/data/dashboard.json`
- `stitch/data/compliance-codex.json`
- `stitch/data/scan-report.json`

## Downloaded hosted images (via `curl -L`)
- `stitch/assets/compliance-avatar.png`
  - source: `https://lh3.googleusercontent.com/aida-public/AB6AXuAfnTlFDtXS0w-dJMOSWLe12AQcBmFx1UZDellhwzobgNJUKgW9iLUkxhUKIMeT_UVrVfSwiWjou36vs_mX_eB_YYpHJ6kmyrwv9knk2QKNUP7hYShf3ihJ92iMk-H9Nt7VJ9mjBRQ_nCjmmf6Mb3sci8RE8R3SLWxOaOEC6BAdb73EchS2a_O6CcKrv19jzT6skJtvHfrs-C6tVGEhRh_g6KCz_yfcqBOrD-Ml-HwvHsT1ZqPY0js4nRV69FmF9xaVvB4-c6kMATnH`

## Note
Only one direct hosted image URL was present in the provided screen code payload.

## Live data wiring
- Each HTML page now sets `data-page` on `<body>` and loads `../assets/live-data.js`.
- The loader fetches live JSON in this order:
  - Dashboard: `window.NEON_DATA_ENDPOINTS.dashboard` -> `/api/dashboard` -> `../data/dashboard.json`
  - Compliance Codex: `window.NEON_DATA_ENDPOINTS.codex` -> `/api/compliance-codex` -> `../data/compliance-codex.json`
  - Scan Report: `window.NEON_DATA_ENDPOINTS.scanReport` -> `/api/scan-report` -> `../data/scan-report.json`
- Existing HTML remains as visual fallback if live fetch fails.
