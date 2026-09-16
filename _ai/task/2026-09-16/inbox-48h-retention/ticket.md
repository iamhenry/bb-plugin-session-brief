# Inbox 48h retention (OpenChamber "Recent" shape)

Date: 2026-09-16
Branch: `bb/improve-dashboard-user-experience-thr_wm5b9eer8c`

## Problem

The Subthreads panel (the dashboard "inbox") mirrors BB's live feed. When a
child thread is read or goes quiet, the feed drops it and the row vanishes.
The user wants read-but-unpinned threads to persist for at least 24h
(raised to **48h** to match OpenChamber's `RECENT_SESSION_MAX_AGE_MS`).

## Desired behavior (OpenChamber model, `packages/ui/.../recent/activitySections.ts`)

A child thread stays in the inbox if ANY of:

1. It needs attention: `running`, `needs_input`, or `error` (their "active now").
2. It is pinned (their pinned layer — exempt from the window entirely).
3. Its last activity (`updatedAt`) is within 48 hours.

Reading a thread no longer dismisses it — it goes idle and starts aging.
Threads with no known activity timestamp stay visible (defensive default).

## Key discovery (shrinks the work)

- Server `threads.list` rows already carry `updatedAt` and `pinnedAt`
  (SDK `bb-plugin-sdk.d.ts:9717,9697`).
- Client sidebar rows (`PluginSidebarThread`) already carry `isPinned`,
  `updatedAt`, `lastReadAt`, `latestAttentionAt` (`:11632,11652-11655`).
- ⇒ No `bb.storage.kv` needed. BB tracks everything; we only read it.

## Plan

1. `contract.ts`: extend `childThreadSchema` with `pinned` (default false)
   and `lastActivityMs` (nullable number, optional with default null).
2. Server `composeBrief.mapChild`: populate from `row.pinnedAt != null` and
   `row.updatedAt`.
3. Client `mapSidebarSubthreads`: populate from `thread.isPinned` and
   `thread.updatedAt`.
4. New `lib/inbox.ts`: `filterInbox(children, nowMs)` implementing the
   48h rule + `INBOX_RETENTION_MS = 48h`. Apply it in `SessionBriefHost`
   after `mergeSubthreads` (single choke point — covers both sources;
   card renders only while open ⇒ live, so client-side is sufficient).
5. Tick `now` every 60s while the card is open so aging actually happens.
6. Fixture: add the new fields to `SAMPLE_BRIEF` children.
7. Tests: `lib/inbox.test.ts` covering each rule branch.

## Preserve

Rows, dots, statuses, elapsed timers, click-to-open, collapse, counts —
all unchanged. This is membership/retention only, no re-sorting.

## Verification

- `npm run typecheck` + `npm test`.
- Reviewer subagent approval.
- Install plugin, reload BB, confirm inbox rows persist after read.
- Push to `origin/main`.