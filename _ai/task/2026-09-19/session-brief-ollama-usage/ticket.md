# Session Brief shows no usage for Ollama Cloud while signed in

Type: Bug
Date: 2026-09-19
GitHub issue: https://github.com/iamhenry/bb-plugin-session-brief/issues/1

## What happened

When a user is signed in and using an Ollama Cloud model, Session Brief Usage
shows only “Ollama Cloud has no remaining-% …” and displays no usage bars or
percentages.

## What should happen

Signed-in users should see Weekly and Session usage through the existing
progress bars. Signed-out users or users with invalid credentials should see a
clear unauthenticated message, with no fabricated values and no crash.

## Repro

1. Sign in to Ollama Cloud.
2. Use an Ollama Cloud model.
3. Open Session Brief Usage and inspect the usage display.

## Evidence

- Issue screenshot: https://github.com/user-attachments/assets/de05b869-ba2e-4822-87ed-15af9fe281a2
- The screenshot demonstrates the missing bars and percentages and the
  “Ollama Cloud has no remaining-% …” message.

## Acceptance

- Signed-in Ollama Cloud users see Weekly and Session usage in the existing
  progress bars.
- Signed-out or invalid-credential users see a clear unauthenticated message,
  without fabricated values or a crash.

## Out of scope

- UI appearance changes.
- Browser-cookie reading or scraping.
- Token storage or refresh.
- Support for other providers.

## Pipeline State

- stage: Publishing
- exact candidate: base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `9a354b55c44660eb748483c16c18c8957e1b510437650cac0257ea34128c14ba`
- latest checkpoint/receipt: `verification/result.md` returned `PASS`; signed-in and isolated signed-out UI evidence exists and all cited files passed `test -f`
- next owner/action: Commit the verified candidate, push a feature branch, and open a PR against `main`
- allowed writes: Git commit, feature branch push, and GitHub PR metadata; no implementation changes
- retries consumed: reproduction 1; gather-context 1; create-issue 1; build 1; code-quality 1; verification 1
- blocker/unlock condition: none

## Checkpoint Timeline

- Ticket materialization — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — completed — owner evidence: `ticket.md` — next: `gather-context` intake-only
- Gather Context Intake — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — completed — owner evidence: `issue.md` — next: `reproduce-bug` via exact `qa`
- Bug Reproduction — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — task cancelled; thread stopped manually before a structured result — evidence: `@thread:thr_q9xgxqqmhs` — unlock: explicit user request to resume
- Bug Reproduction — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — `BLOCKED` — owner evidence: `reproduction/result.md` — next: one bounded prerequisite repair through the already-working browser path
- Bug Reproduction Repair — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — stopped manually — evidence: `@thread:thr_q9xgxqqmhs` — unlock: faithful exact-candidate signed-in Session Brief capture and structured reproduction result
- Bug Reproduction Reconciliation — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — `REPRODUCED` — owner evidence: `reproduction/result.md` — next: `gather-context` Phase 1
- Gather Context Research — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — research handoff completed with unresolved successful endpoint shape and exact auth provider ID — owner evidence: `issue.md:110-114`, `research/external-signal.md` — next: one bounded `gather-context` prerequisite repair
- Gather Context Repair — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — completed — owner evidence: `issue.md:107-112`, `research/external-signal.md:7-8` — next: fresh `judge-proposal`
- Proposal Judge — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — `SELECTED` — owner evidence: `issue.md:79-96` — next: global `create-issue` command owner
- Create Issue Plan — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — completed — owner evidence: `plan.md` — next: fresh `judge-plan`
- Plan Judge — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — `REVISE_PLAN` — owner evidence: `plan.md:205-219` — next: `create-issue` formatting repair
- Create Issue Plan Repair — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — completed — owner evidence: `plan.md:52-68` — next: `judge-plan` recheck
- Plan Judge Recheck — candidate `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` — `APPROVE_PLAN` — owner evidence: `plan.md` Plan Judge — next: exact `build` agent
- Build Attempt — candidate base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `45127311b516e72c3d63e99e77da01836370515e0a9897a6426b49aafbb18573` — blocked: `px_capture_unavailable: ScreenCaptureKit capture already in flight`; Mechanical `npm run typecheck && npm test` exit 0, 43 passed — next: one bounded browser-path repair by the same Build owner
- Build Repair — candidate base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `5545fef7dccd14a1399936a57da2867f2891cae2b1964ed98d2c214b3ecc8df9` — completed; signed-in browser smoke showed Weekly and Session rows; Mechanical `npm run typecheck && npm test` exit 0, 50 passed — evidence: `/var/folders/dh/g739hv154mj33by2lgp91zyc0000gn/T/opencode/ollama-signed-in-session-brief.png` — next: exact `reviewer`
- Code Quality Gate — candidate base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `5545fef7dccd14a1399936a57da2867f2891cae2b1964ed98d2c214b3ecc8df9` — `REVISE_CODE` — finding: `server/usageOllama.ts:89-99` calls `rememberUsage` when no validated windows exist — next: exact `build` correction and Mechanical recheck
- Build Revision — candidate base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `9a354b55c44660eb748483c16c18c8957e1b510437650cac0257ea34128c14ba` — completed; `rememberUsage` now runs only for non-empty windows; Mechanical `npm run typecheck && npm test` exit 0, 50 passed — next: fresh exact `reviewer`
- Code Quality Recheck — candidate base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `9a354b55c44660eb748483c16c18c8957e1b510437650cac0257ea34128c14ba` — `APPROVE_CODE` score 97 — next: fresh exact `qa`
- Verification Gate — candidate base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `9a354b55c44660eb748483c16c18c8957e1b510437650cac0257ea34128c14ba` — `BLOCKED`; signed-in primary passed, signed-out regression unavailable without auth mutation — owner evidence: `verification/result.md`, `verification/screenshots/ollama-signed-in-usage.png` — unlock: disposable auth-absent runtime or explicit bounded mutation permission
- Verification prerequisite decision — user prohibited disabling the live Ollama auth because active agents depend on it — next: one bounded isolated-runtime repair attempt; no live auth mutation permitted
- Verification Gate Repair — candidate base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `9a354b55c44660eb748483c16c18c8957e1b510437650cac0257ea34128c14ba` — `PASS`; signed-in Weekly/Session rows and isolated unauthenticated state proven; all cited paths passed `test -f` — owner evidence: `verification/result.md`, `verification/screenshots/ollama-signed-in-usage.png`, `verification/screenshots/ollama-unauthenticated.png` — next: PR placeholder awaiting explicit publication authority
- Publication Authorization — candidate base `824d5438eba6a0e04c91b6ef7b35a6ac935913c5` + delivery diff `9a354b55c44660eb748483c16c18c8957e1b510437650cac0257ea34128c14ba` — user authorized commit, push, and PR creation — next: publish the verified candidate without implementation changes
