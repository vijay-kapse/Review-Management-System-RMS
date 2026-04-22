# Production Migration Runbook

## Goal
Promote the copied unified frontend + shared-login integration package from `/home/vkapse` into a production-ready migration plan without touching production until explicitly approved.

## Candidate components for promotion

### Unified frontend shell
- `/home/vkapse/vijay-portal/index.html`
- `/home/vkapse/vijay-portal/unified-login.html`
- `/home/vkapse/vijay-portal/unified-logout.html`

### Survey copied changes
- `survey_group8/accounts/views.py`
- `survey_group8/accounts/urls.py`
- `survey_group8/templates/registration/login.html`

### Argus copied changes
- `searchLite/app/views.py`
- `searchLite/app/urls.py`
- `Argus_Frontend-master/src/components/Auth/Login.jsx`

### Sysreview copied changes
- `sysreview-api/.../controllers/AuthenticationController.java`
- `sysreview-api/.../service/AuthenticationService.java`
- `sysreview-ui/src/pages/Auth.tsx`

### Chatbot copied changes
- `chatbot/app/main.py`
- `chatbot/app/public/index.html`
- `chatbot/app/public/admin.html`

## Production change classes

### 1. Application code changes
Promote only the copied auth convergence files above after runtime verification.

### 2. Portal/frontend changes
Decide whether the unified portal becomes:
- the root landing page for the platform, or
- a new subpath entry surface

### 3. Reverse-proxy implications
Production nginx will likely need:
- portal landing route handling
- unified login page routing
- callback path preservation for `/survey`, `/argus`, `/sysreview`, `/chatbot`
- careful forwarding of headers and redirect paths

### 4. Env/config implications
- Survey requires DB-backed runtime and compose-aligned environment
- Argus requires DRF-capable Python environment
- Sysreview requires its secrets/JWT properties and Java runtime
- Chatbot requires alignment between shared-entry route and final admin auth model

### 5. Session/cookie/domain considerations
- Survey and Argus rely on Django session/cookie behavior
- Sysreview relies on JWT token issuance/consumption
- Chatbot currently uses local session cookie and should move toward shared identity trust
- Shared portal should become the human login origin even if app-local session models remain different underneath

## Recommended rollout order
1. Validate copied Chatbot shared-entry runtime path
2. Validate copied Survey compose runtime path
3. Validate copied Argus bridge runtime path
4. Validate copied Sysreview shared-login exchange runtime path
5. Introduce portal landing/login pages in production routing
6. Promote app-side convergence changes one app at a time
7. Run cross-app smoke tests

## Suggested pilot migration sequence
- Pilot 1: Survey + Argus shared-login flow with portal login origin
- Pilot 2: Sysreview shared-login exchange
- Pilot 3: Chatbot admin shared-entry replacement
- Pilot 4: common logout/navigation cleanup

## Smoke tests
- Portal landing page loads
- Unified login page loads
- Unified logout page loads
- Survey shared-login route accepts expected parameters
- Argus shared-login route accepts expected parameters
- Sysreview shared-login exchange returns expected auth structure
- Chatbot shared-entry sets usable session path
- App UIs consistently push users toward portal login rather than legacy local-first login

## Rollback steps
1. Keep original production app code untouched until promotion time
2. Promote one app at a time, not all four simultaneously
3. Preserve original login screens behind reversible branches or deployment snapshots
4. Roll back proxy changes first if entry routing fails
5. Roll back app-specific auth convergence second if app-local behavior regresses

## Known risks
- Survey/Argus runtime validation still incomplete in copied workspace
- Sysreview shared-login exchange still needs frontend token-consumption integration
- Chatbot still contains legacy local admin auth paths in copied code
- Production callback/routing design is not yet applied

## Human-executable checklist
- Review copied docs in `/home/vkapse/unified-apps/docs`
- Confirm runtime validation status per app
- Choose production portal entry strategy
- Apply app changes in rollout order
- Apply proxy changes last
- Run smoke tests and validate rollback plan before each stage
