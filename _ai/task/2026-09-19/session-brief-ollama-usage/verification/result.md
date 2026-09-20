## Verification Result

- Platform: `desktop`
- Assurance: `standard`
- Objective: A real signed-in Ollama Cloud model produces Weekly and Session values in the unchanged Session Brief Usage rows.
- Falsifier: The Usage section still shows the no-remaining-% message with no Weekly/Session values, displays fabricated values, crashes, or exposes credential data.
- Primary flow: Reload the exact BB thread, open the Session Brief panel from the thread surface, expand Usage, and inspect the Ollama Cloud usage rows.
- Regression check: In a fully isolated disposable BB server, host daemon, browser profile, and auth-absent HOME, open an Ollama Cloud thread and expand Usage; verify the readable unauthenticated message, no numeric usage values, and no crash.
- Quality: Fresh `code-quality-gate` receipt `APPROVE_CODE`, score 97, supplied for the exact candidate.
- Mechanical: `npm run typecheck && npm test` → exit 0; fresh exact-candidate run already recorded, 50 tests passed, 0 failed; reused because the candidate and code were unchanged during this regression-only pass.
- Observable: Signed-in after `/Users/macvm/Desktop/Projects/other/bb-plugin-session-brief/_ai/task/2026-09-19/session-brief-ollama-usage/verification/screenshots/ollama-signed-in-usage.png`; unauthenticated regression `/Users/macvm/Desktop/Projects/other/bb-plugin-session-brief/_ai/task/2026-09-19/session-brief-ollama-usage/verification/screenshots/ollama-unauthenticated.png`; before baseline `/Users/macvm/Desktop/Projects/other/bb-plugin-session-brief/_ai/task/2026-09-19/session-brief-ollama-usage/reproduction/screenshots/reporter-issue-1.png`.
- Checks run: Preserved the prior signed-in proof; created one disposable isolated BB server on a separate temporary data directory with a sanitized temporary HOME and no auth files; installed the exact local candidate; created an auth-absent Ollama Cloud thread; opened the isolated UI in a fresh named browser session; expanded Usage; waited 500 ms; captured and inspected the app-owned panel; stopped and cleaned up the disposable runtime and browser session.
- Model-backed product operations: `ollama-cloud/glm-5.3-flash`, reasoning `high` requested, 1 isolated setup prompt submitted; thread startup failed before model execution because the disposable runtime had no provider auth, while the Session Brief panel rendered the unauthenticated state.
- Verdict: `PASS`

### Evidence

- Before (supplied reproduction): `/Users/macvm/Desktop/Projects/other/bb-plugin-session-brief/_ai/task/2026-09-19/session-brief-ollama-usage/reproduction/screenshots/reporter-issue-1.png`
- After (fresh exact-candidate primary): `/Users/macvm/Desktop/Projects/other/bb-plugin-session-brief/_ai/task/2026-09-19/session-brief-ollama-usage/verification/screenshots/ollama-signed-in-usage.png`
- Regression (fresh isolated auth-absent runtime): `/Users/macvm/Desktop/Projects/other/bb-plugin-session-brief/_ai/task/2026-09-19/session-brief-ollama-usage/verification/screenshots/ollama-unauthenticated.png`
- Report: `/Users/macvm/Desktop/Projects/other/bb-plugin-session-brief/_ai/task/2026-09-19/session-brief-ollama-usage/verification/result.md`

### Notes

- Candidate under test: base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` plus delivery diff SHA-256 `9a354b55c44660eb748483c16c18c8957e1b510437650cac0257ea34128c14ba`; the worktree HEAD was the supplied base.
- The after screenshot is app-owned and shows `Ollama`, `Weekly 36% left`, and `Session 92% left` in the existing Session Brief treatment. The accessible UI text also showed the selected model as `ollama-cloud/glm-5.3-flash`.
- The regression screenshot is app-owned and shows `Ollama` with `Sign in to Ollama Cloud in Pi or OpenCode to see usage.` and no numeric usage values. The panel remained rendered and usable even though the intentionally auth-absent provider thread failed before model execution.
- The regression runtime used a separate temporary BB data directory, separate host daemon, sanitized temporary `HOME`/`XDG_DATA_HOME`/`PI_CODING_AGENT_DIR`, and a fresh named agent-browser session. It never connected to or mutated the live BB/OpenCode data directory or live auth/session.
- No credential, token, cookie, email, prompt body, or private auth metadata was captured or retained.
- Why another probe was or was not warranted: Both declared UI observations are decisive. No additional probe was warranted after the isolated auth-absent panel rendered the required message without numeric values or a crash.

### Risk

- None within the declared target.

### Next Action

- No further verification action; retain the exact candidate and the three cited app-owned evidence paths.
