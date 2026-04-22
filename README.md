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
