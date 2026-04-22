# Unified Auth Contract

## Purpose
Define the shared-login contract for the copied unified platform workspace in `/home/vkapse`.

## Validation status summary
- Portal runtime: validated via HTTP on `http://127.0.0.1:3005`
- Survey shared-login bridge: code-level integrated, runtime pending intended Docker path
- Argus shared-login bridge: code-level integrated, runtime pending intended Python/DRF environment
- Sysreview shared-login exchange: code-level integrated, runtime pending intended Java/Gradle runtime and secrets
- Chatbot shared-entry bridge: code-level integrated, closest to runnable due to copied venv, but runtime not fully exercised yet

## Canonical login origin
All human login should begin from the unified portal:
- `/index.html`
- `/unified-login.html`

## Identity payload shape
Current copied-workspace shared identity shape:
- `email` (required)
- `firstName` (optional)
- `lastName` (optional)
- `username` (optional for apps that want a local username)
- `next` (optional redirect target)

## App-specific shared-login entrypoints

### Survey
- Entry route: `/survey/accounts/sso/login/`
- Callback route: `/survey/accounts/sso/callback/`
- Required payload: `email`
- Local auth result: Django session
- Runtime status: scaffolded in copied code, runtime not yet validated in compose path

### Argus
- Entry route: `/api/sso/login/`
- Callback route: `/api/sso/callback/`
- Required payload: `email`
- Local auth result: Django session + ensure_session(request)
- Runtime status: scaffolded in copied code, runtime not yet validated in DRF-capable environment

### Sysreview
- UI shared entry: `/sysreview/auth` now points users to portal login
- API shared exchange: `/api/v1/auth/shared-login`
- Existence probe: `/api/v1/auth/shared-login/exists`
- Required payload: `email`, optional `firstName`, `lastName`, `username`
- Local auth result: Sysreview JWT auth token
- Runtime status: scaffolded in copied code, runtime not yet validated in Java app runtime

### Chatbot
- UI shared entry: `/chatbot/` now lands on shared workspace entry page
- Backend shared entry: `/chatbot/shared-entry`
- Required payload: `sharedEmail`, optional `next`
- Local auth result: lightweight session cookie (`session_token`)
- Runtime status: scaffolded in copied code, likely easiest next runtime validation target due to copied venv

## Logout behavior
Current copied-workspace model:
- Common platform return page: `/unified-logout.html`
- App-local sessions may still require app-specific logout
- Full coordinated logout is not yet implemented across all four apps

## Readiness interpretation
- `Survey`: partial, scaffolded
- `Argus`: partial, scaffolded
- `Sysreview`: partial, scaffolded
- `Chatbot`: partial, scaffolded and closest to runtime validation

## Contract hardening priorities
1. Validate Chatbot shared-entry runtime path
2. Validate Survey compose-based bridge path
3. Validate Argus bridge path in correct Python environment
4. Wire Sysreview frontend token handling to shared-login exchange
