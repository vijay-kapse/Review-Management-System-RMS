# Review Management System (RMS)

RMS is a unified web-based research workflow portal that brings four components behind one interface and one login:

- **TRACE**: Tracking, Reporting, Analyzing, Curating, and Extracting data. Supports keyword query design, article fetching/categorization, and relevance tracking.
- **ARGUS**: Technology-assisted reading assistant for efficient multi-document reading and insight extraction.
- **QUEST**: Querying Uploads for Educational and Scholarly Texts. Lets users upload research articles and ask plain-English questions.
- **SPARK**: Survey Platform for Academic Research and Knowledge. Supports academic survey creation, collection, and summarized research information.

## Repository Layout

- `vijay-portal/`: Node/Express unified RMS gateway, login/signup, app launcher, and path-based routing.
- `unified-apps/argus/`: ARGUS frontend and Django backend copy used by RMS.
- `unified-apps/survey/`: SPARK Django survey app copy used by RMS.
- `unified-apps/sysreview/`: TRACE Spring Boot/React source and build artifacts used by RMS.
- `unified-apps/chatbot/`: QUEST Python chatbot app copy used by RMS.
- `runtime-manager/`: PM2 ecosystem and startup scripts for the deployed services.
- `unified-apps/docs/`: integration notes, auth contract, routing map, and migration/runbook notes.

## Notes

This repository intentionally excludes generated dependency folders, runtime databases, uploaded document corpora, highlighted PDFs, local logs, and secret files. Recreate dependencies with the package/requirements files in each app and configure secrets through local environment/config files on the target server.

## Deploying the unified portal on Vercel

This repository now includes a root-level `vercel.json` that deploys `vijay-portal/server.js` as a Node.js serverless function.

### 1) Import the repo in Vercel

- Create a new Vercel project from this repository.
- Keep the project root at the repository root (do not switch to a subdirectory).

### 2) Configure environment variables

Set these in the Vercel project:

- `EXTERNAL_BASE`: public URL of the deployed portal (for example, `https://your-project.vercel.app`)
- `COOKIE_SECURE`: `true` for production HTTPS
- `GOOGLE_CLIENT_ID`: Google OAuth client id used by the unified login page
- `ARGUS_TARGET`: upstream ARGUS base URL
- `CHATBOT_TARGET`: upstream QUEST/chatbot base URL
- `SURVEY_TARGET`: upstream SPARK/survey base URL
- `API_TARGET`: upstream API base URL used for `/api/*`
- `SYSREVIEW_TARGET`: upstream TRACE/sysreview base URL
- Optional:
  - `DEFAULT_APP_EMAIL`
  - `DEFAULT_APP_NAME`
  - `SURVEY_STATIC_DIR` (only needed when serving survey static files from a local filesystem path)
  - `PORTAL_DATA_DIR` (defaults to `/tmp/rms-portal-data`)
  - `PORTAL_DB_PATH` (full sqlite path; set to `:memory:` to force in-memory sessions/users)

### 3) Deploy

- Trigger deployment from Vercel.
- After deploy, verify these routes:
  - `/`
  - `/login`
  - `/apps`
  - `/launch/argus`
  - `/launch/chatbot`
  - `/launch/survey`
  - `/launch/sysreview`

### Vercel filesystem note

Writes under deployed code directories (for example `/var/task/...` on serverless) can be read-only. The portal now defaults sqlite to `/tmp/rms-portal-data/portal_auth.db` unless you explicitly override `PORTAL_DATA_DIR` or `PORTAL_DB_PATH`.
