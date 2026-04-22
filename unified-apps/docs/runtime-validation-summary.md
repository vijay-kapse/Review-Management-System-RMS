# Runtime Validation Summary

## Summary verdict
The copied integration package has strong cross-app convergence scaffolding and a runtime-validated unified portal, but app runtime proof remains uneven.

## Runtime matrix

| App | Runtime path identified? | Runnable in copied workspace? | Shared login path runtime-tested? | Portal launch path verified? | Readiness label | Exact blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Sysreview | Yes - Gradle/Spring Boot + React | Not yet proven | No | Yes, at UI/route level | Scaffolded / code-validated only | Needs intended Java runtime, secrets, and frontend token follow-through |
| Argus | Yes - Django backend + React frontend | Not yet proven | No | Yes, at UI/route level | Blocked by environment | Host runtime missing DRF-capable environment for copied backend validation |
| Survey | Yes - Docker/compose Django stack | Not yet proven | No | Yes, at UI/route level | Blocked by environment | Needs usable Docker/compose path and DB-backed runtime |
| Chatbot | Yes - copied venv + FastAPI app | Partially proven | Not fully | Yes, at UI/route level | Partially runtime-validated | Import now reaches runtime dependency stage but fails on missing/unreadable `config/config.yaml` |

## Concrete runtime evidence gathered

### Portal
- `http://127.0.0.1:3005/` returned HTTP 200
- `http://127.0.0.1:3005/unified-login.html` loaded
- `http://127.0.0.1:3005/unified-logout.html` loaded

### Chatbot
- copied venv Python exists and runs: `Python 3.10.12`
- initial import failure due to syntax issue in copied `app/main.py` was fixed by trimming the stale preamble and keeping the active section
- subsequent import reached real runtime dependency loading and failed on:
  - `FileNotFoundError: config/config.yaml`
- this is a real app/runtime blocker, not just shell transport noise

## Honest interpretation
- No copied app has yet reached full end-to-end runtime-validated status
- Chatbot is the closest and has crossed from code-only inspection into meaningful runtime execution attempts
- Portal is fully runtime-validated as the unified frontend shell
- The package is strong for migration planning, but app-specific runtime proof is still partial

## Recommendation
- Treat the portal as runtime-validated
- Treat Chatbot as the highest-value next runtime target if more validation time is spent
- Treat Survey and Argus as environment-blocked until their intended runtimes are made available in copied form
- Do not claim any of the four apps as fully runtime-validated yet
