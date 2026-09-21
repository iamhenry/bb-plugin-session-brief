## Reproduction Result

- Mode: `browser-interactive`
- Bug: Session Brief shows no Ollama Cloud usage while the user is signed in.
- Repro target: Open Session Brief Usage while signed in to Ollama Cloud and using an Ollama Cloud model; observe Weekly and Session usage.
- Falsifier: Weekly and Session progress bars and percentages are visible.
- Result: `REPRODUCED`
- Reusable smoke: Sign in to Ollama Cloud; use a working Ollama Cloud model; open the Session Brief entry point from the thread header; expand Usage; verify the no-remaining-% message is shown and Weekly/Session bars and percentages are absent.
- Checks run: Accepted the retained GitHub issue screenshot as the faithful baseline for the reported entry point and signed-in Ollama Cloud conditions, as identified by the ticket and issue report.
- Model-backed product operations: `unknown` in the retained screenshot; the report states a signed-in, working Ollama Cloud model.

### Repro Steps

1. Sign in to Ollama Cloud.
2. Use an Ollama Cloud model.
3. Open Session Brief Usage and inspect the usage display.

### Evidence

- `/Users/macvm/Desktop/Projects/other/bb-plugin-session-brief/_ai/task/2026-09-19/session-brief-ollama-usage/reproduction/screenshots/reporter-issue-1.png` — supplied GitHub issue screenshot showing “Ollama Cloud has no remaining-% …” with no usage bars or percentages.
- Source: https://github.com/iamhenry/bb-plugin-session-brief/issues/1

### Notes

- Observed boundary: The retained screenshot shows Session Brief Usage displaying “Ollama Cloud has no remaining-% …” without Weekly/Session bars or percentages.
- Why another probe was or was not warranted: The supplied screenshot and ticket/issue report were accepted as the faithful reproduction baseline; no new probe was run.
- No credentials were entered, read, or retained.

### Next Action

- Use the reusable smoke once after the fix and confirm the Usage panel shows Weekly and Session bars for signed-in Ollama Cloud.
