# Unified Portal Routing Map

## Portal pages
- /index.html -> Unified Research Portal landing page
- /unified-login.html -> Shared login origin for all four apps
- /unified-logout.html -> Shared logout return page

## Current shared-login routing behavior

### Survey
- Portal login target: survey
- Routed to: https://sysrev.cs.binghamton.edu/survey/accounts/sso/login/
- Next default: /survey/
- Copied backend bridge exists

### Argus
- Portal login target: argus
- Routed to: https://sysrev.cs.binghamton.edu/api/sso/login/
- Next default: /argus/home
- Copied backend bridge exists

### Sysreview
- Portal login target: sysreview
- Current portal route: https://sysrev.cs.binghamton.edu/sysreview/auth
- Backend convergence route available in copied API: /api/v1/auth/shared-login
- Next integration step: add frontend callback/token consumption for shared-login-issued JWT

### Chatbot
- Portal login target: chatbot
- Current portal route: https://sysrev.cs.binghamton.edu/chatbot/
- Copied backend convergence route: /chatbot/shared-entry
- Next integration step: portal can eventually route directly to /chatbot/shared-entry once deployment routing is aligned

## Unified experience target state
- Portal is the only obvious human login origin
- Each app accepts shared identity via bridge, callback, token exchange, or trusted entry endpoint
- Local standalone login becomes secondary or removed
