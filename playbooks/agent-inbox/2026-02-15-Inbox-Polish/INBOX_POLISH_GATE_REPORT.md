# Inbox Polish Gate Report

## Results

- tsc: **PASS** for inbox files (0 errors). 3 pre-existing errors in unrelated History files (`HistoryEntryItem.tsx`, `HistoryFilterToggle.tsx`, `HistoryDetailModal.tsx` — unused `React` import TS6133).
- eslint: **PASS** (0 errors, 2 warnings — test files excluded by eslint ignore pattern, expected)
- vitest: **PASS** for inbox (209 passed, 0 failed). 5 pre-existing failures in `symphony.test.ts` (unrelated to inbox work).

## Inbox Test Breakdown

| Test File | Count | Status |
|-----------|-------|--------|
| AgentInbox.test.tsx (component) | 140 | All pass |
| useAgentInbox.test.ts (hook) | 52 | All pass |
| agentInboxHelpers.test.ts (helpers) | 17 | All pass |
| **Total** | **209** | **All pass** |

## New Tests Added (Phases 5.1–5.4)

- Visual polish (expand toggle, pipes, multi-line, persistence): 9 tests
- Starred filter (hook + component): 10 tests
- By Agent sort (hook + component): 14 tests
- Broken test fixes (Task 1): updated ~15 existing assertions
- **Total new tests: 33**

## Files Modified

### Source Files (Phases 1–4)
- `src/renderer/types/agent-inbox.ts` — added starred/byAgent types, updated defaults
- `src/renderer/components/AgentInbox.tsx` — modal width, expand toggle, pipe separators, 3-line messages, number badges, starred indicator, byAgent grouping, footer layout
- `src/renderer/hooks/useAgentInbox.ts` — starred filter, byAgent sort, preference persistence

### Test Files (Phase 5)
- `src/__tests__/renderer/components/AgentInbox.test.tsx` — 140 tests (fixed existing + 33 new)
- `src/__tests__/renderer/hooks/useAgentInbox.test.ts` — 52 tests (fixed existing + 12 new)
- `src/__tests__/renderer/helpers/agentInboxHelpers.test.ts` — 17 tests (threshold fix)

## Pre-Existing Failures (Not Caused by Inbox Polish)

- **tsc TS6133** (3): Unused `React` import in `HistoryEntryItem.tsx`, `HistoryFilterToggle.tsx`, `HistoryDetailModal.tsx` — these files were last modified in earlier, unrelated commits.
- **symphony.test.ts** (5): `validateRepoSlug`, `validateContributionParams`, `generateBranchName` failures — pre-existing from Symphony feature commits, unrelated to inbox.

## Summary

The Unified Inbox Polish gate passes for all inbox-scoped files. All 209 inbox tests pass across component, hook, and helper test suites. The 3 tsc errors and 5 vitest failures are pre-existing issues in unrelated modules (History components and Symphony IPC handlers) that predate the inbox polish work. Zero regressions introduced.
