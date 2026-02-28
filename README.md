# Neon Guardian UI

Frontend-only repository for the Neon Guardian interface.

## Tech Stack

- Static HTML pages
- Vanilla JavaScript
- JSON data files
- No frontend framework (no Next.js/React/Vue in this repo)

## Repository Structure

- `web/pages/`
- `web/assets/`
- `web/data/`
- `docs/`

### Pages

- `web/pages/dashboard/index.html`
- `web/pages/compliance-codex/index.html`
- `web/pages/scan-report/index.html`

### Data strategy

`web/assets/live-data.js` resolves data in this order:

1. `window.NEON_DATA_ENDPOINTS.<pageKey>`
2. Backend API endpoint (for external backend repo)
3. Local fallback JSON in `web/data/*.json`

Default API paths:

- `/api/dashboard`
- `/api/compliance-codex`
- `/api/scan-report`

## Interactive Scan Report Workflow

This UI supports an interactive scan report page at:

- `web/pages/scan-report/index.html`

The page should consume data from either:

1. `window.NEON_DATA_ENDPOINTS.scanReport`
2. `/api/scan-report` (external backend)
3. `web/data/scan-report.json` (fallback)

## External Repo Dependency (`skills.md`)

If your interactive scan report logic depends on guidance in another repository's `skills.md`:

1. Open that repository in the same VS Code workspace (or clone it locally).
2. Locate and review `skills.md`.
3. Extract required behaviors, scoring rules, and content requirements.
4. Reflect those requirements in:
	- `web/data/scan-report.json` (data model/content)
	- `web/pages/scan-report/index.html` (UI structure/interactions)
	- `web/assets/live-data.js` (data loading behavior, if needed)

Recommended output from the `skills.md` review:

- A short implementation report in `docs/` (for example: `docs/scan-report-implementation.md`)
- Explicit mapping of each requirement to a file/path in this repo
- A list of assumptions and open questions

## Backend Integration (External Repo)

This repo does not contain backend code.

Expected backend contract (from separate repo):

- Expose the `/api/*` endpoints above
- Return JSON payloads matching the structures in `web/data/*.json`
- Enable CORS for this frontend origin, or serve frontend/backend behind a shared gateway

## Local Preview

From repository root:

```bash
python3 -m http.server 8080
```

Open:

- `http://localhost:8080/web/pages/dashboard/`
- `http://localhost:8080/web/pages/compliance-codex/`
- `http://localhost:8080/web/pages/scan-report/`
