# Integration Status

## Unified frontend shell
- Portal shell location: /home/vkapse/vijay-portal
- Primary pages: index.html, unified-login.html
- Role: shared launch surface and common login entry point for the copied integration work

## Copied app integration map
- Sysreview source: /home/vkapse/unified-apps/sysreview/src
- Argus backend: /home/vkapse/unified-apps/argus/searchLite
- Argus frontend: /home/vkapse/unified-apps/argus/Argus_Frontend-master
- Survey source: /home/vkapse/unified-apps/survey/survey_group8
- Chatbot source: /home/vkapse/unified-apps/chatbot/app

## Shared login convergence status
- Survey copied version: backend SSO bridge added; login template redirected to mock shared SSO form
- Argus copied version: backend SSO bridge added under /api/sso/login and /api/sso/callback
- Sysreview copied version: still uses local auth UI; next step is redirecting auth page into portal-originated shared entry
- Chatbot copied version: still uses local admin auth; next step is replacing admin-first login flow with portal/shared entry

## Recommended immediate integration sequence
1. Update Argus frontend login UX to route into unified-login.html or /api/sso/login
2. Update Sysreview UI auth page to show shared-login-first path
3. Update Chatbot public/admin UI to route into shared login entry instead of local credential-first flow
4. Add common logout placeholder/return path in the portal

## UI convergence progress
- Argus copied frontend login page now routes users to the unified login page instead of centering local credential entry
- Sysreview copied auth page now routes users to the unified login page as the primary entry
- Chatbot copied admin page now routes users to the unified login page instead of centering standalone admin register/login

## Backend convergence progress
- Sysreview copied backend now has a shared-login exchange endpoint under /api/v1/auth/shared-login
- Chatbot copied backend now has a shared-entry endpoint under /chatbot/shared-entry and routes /chatbot/ into the unified workspace surface
- Unified portal now has a shared logout return page at /unified-logout.html
