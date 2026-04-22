# Productionization Gaps and Rollout Notes

## Current copied-workspace state
The copied workspace now contains a unified portal shell, a shared login entry page, a shared logout return page, and app-side convergence work across Sysreview, Argus, Survey, and Chatbot.

This is an integration prototype in Vijay's folder, not a production deployment.

## What is already converged
- Unified portal landing page exists
- Unified login entry exists
- Unified logout return page exists
- Survey copied version has shared-login bridge routes and shared-login-first UI
- Argus copied version has shared-login bridge routes and shared-login-first UI
- Sysreview copied version has shared-login-first UI and a shared-login backend exchange endpoint
- Chatbot copied version has shared-login-first UI and a lightweight shared-entry backend route

## Production gaps by app

### Sysreview
- Frontend still needs a clean callback/token-consumption flow from shared login
- Existing local auth tabs are replaced in copied UI but production will need a proper shared identity handoff design
- Shared-login endpoint needs validation in real runtime with DB and JWT config

### Argus
- Frontend login page now points to unified login, but callback-aware session bootstrap should be validated in the intended runtime
- Backend bridge exists, but production routing must ensure /api/sso/* reaches the copied/real backend correctly
- Existing local register flow should be deprecated or hidden when shared login becomes primary

### Survey
- Shared-login bridge exists and login template points into it
- Production validation still needs the intended Docker/compose runtime and database dependencies
- Role onboarding (Creator/Taker) needs final rule under shared identity

### Chatbot
- Shared-entry backend route exists, but old local admin register/login endpoints still remain in code
- Final production direction should remove chatbot as an identity authority
- Admin authorization should become shared-identity based, not in-memory user-store based

## Cross-system production gaps
- Need final identity source decision for production (true IdP, shared auth service, or proxy-mediated identity)
- Need callback/cookie/path handling aligned for:
  - /sysreview
  - /argus
  - /survey
  - /chatbot
- Need production nginx changes only after copied integration design is approved
- Need global logout semantics defined (local-only vs coordinated sign-out)

## Recommended rollout sequence
1. Approve copied-workspace portal and shared-login convergence design
2. Validate Survey and Argus bridges in real app runtimes
3. Validate Sysreview shared-login exchange in real runtime
4. Replace Chatbot remaining local auth logic with shared identity checks
5. Introduce production proxy/routing changes last
6. Run smoke tests across all four apps

## Smoke-test checklist for rollout
- Portal loads and shows all four apps
- Unified login page routes to the selected target app path correctly
- Survey login creates local session via shared bridge
- Argus login creates local session via shared bridge
- Sysreview shared-login exchange issues valid JWT auth token
- Chatbot shared-entry creates usable admin session
- Unified logout page works as common return surface

## Rollback posture
- Originals remain untouched today
- Production rollout should preserve old login surfaces behind a reversible switch until shared login proves stable
- Proxy changes should be the final reversible layer, not the first
