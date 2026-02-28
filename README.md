# Neon Guardian UI

Frontend-only repository for the Neon Guardian interface.

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
