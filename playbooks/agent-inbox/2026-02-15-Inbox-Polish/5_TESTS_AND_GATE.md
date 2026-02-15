# Phase 5: Validate — Tests and Gate

## Context

- **Playbook:** Unified Inbox Polish
- **Agent:** maestro.app
- **Project:** /Users/felipegobbi/Documents/Vibework/Maestro
- **Loop:** 00001
- **Date:** 2026-02-15
- **Working Folder:** /Users/felipegobbi/Documents/Vibework/Maestro/playbooks/agent-inbox/2026-02-15-Inbox-Polish/

## Purpose

Update existing tests to match the new defaults and dimensions, add new tests for all new features (expand toggle, pipe separators, multi-line messages, starred filter, byAgent sort), then run the full lint/test/build gate.

## Key Paths

- **Component tests:** `src/__tests__/renderer/components/AgentInbox.test.tsx`
- **Hook tests:** `src/__tests__/renderer/hooks/useAgentInbox.test.ts`
- **Helper tests:** `src/__tests__/renderer/helpers/agentInboxHelpers.test.ts`
- **Source component:** `src/renderer/components/AgentInbox.tsx`
- **Source hook:** `src/renderer/hooks/useAgentInbox.ts`
- **Source types:** `src/renderer/types/agent-inbox.ts`

---

## Task 1: Fix all broken existing tests

- [x] Run `npx vitest run --reporter=verbose 2>&1 | tail -80` from `/Users/felipegobbi/Documents/Vibework/Maestro` to see which tests currently fail. Then open `/Users/felipegobbi/Documents/Vibework/Maestro/src/__tests__/renderer/components/AgentInbox.test.tsx` and `/Users/felipegobbi/Documents/Vibework/Maestro/src/__tests__/renderer/hooks/useAgentInbox.test.ts`. Fix ALL failures systematically. The known breakages are:

**Component tests (AgentInbox.test.tsx):**

1. `w-[600px]` → modal now uses Tailwind class `w-[780px]`. Update assertions that check for `w-[600px]` in the className to check for `w-[780px]` instead. The width is a Tailwind class, NOT an inline `style.width` — all modals in the codebase use `w-[Npx]` Tailwind classes.
2. Default filter changed from `'all'` to `'unread'`. Tests that render the component and expect ALL items visible by default will now only see unread items. Either: (a) make test sessions have `hasUnread: true` so they appear in unread filter, or (b) explicitly click the "All" filter button before asserting.
3. `ITEM_HEIGHT` changed from `100` to `120`. Update any height assertions.
4. Filter button count: was 3 (All, Unread, Read), now 4 (All, Unread, Read, ★ Starred). Update `expect(buttons.length).toBe(3)` to `toBe(4)`.
5. Sort button count: was 3 (Newest, Oldest, Grouped), now 4 (Newest, Oldest, Grouped, By Agent). Update `expect(buttons.length).toBe(3)` to `toBe(4)`.
6. Edit3 icon removed from Row 1. Tests asserting Edit3 presence must be removed or inverted.
7. `/` separators replaced with `|` pipes. Update text content assertions.
8. Agent icon emoji removed from Row 1. Tests asserting `getAgentIcon` output in Row 1 must be updated.
9. Empty state: default filter is now `'unread'`, so the default empty state message is `'No unread sessions.'`, NOT `'All caught up — no sessions need attention.'`.
10. Footer: changed from `justify-center gap-6` with separate `<span>` elements to `justify-between` with count on left, hints on right separated by `•`. Update any footer text assertions.
11. Close button: still uses `p-1.5 rounded` with JS hover handlers — no change needed here.
12. New expand button: added BEFORE close button in header. Tests counting header buttons need updating.

**Hook tests (useAgentInbox.test.ts):** 13. `MAX_MESSAGE_LENGTH` changed from `90` to `250`. Update truncation test thresholds.

Run `npx vitest run --reporter=verbose 2>&1 | tail -80` after fixes. Use TABS for indentation. Success criteria: ALL pre-existing tests pass (zero failures from old tests).

## Task 2: Add tests for visual polish (expand toggle, pipes, multi-line)

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/__tests__/renderer/components/AgentInbox.test.tsx`. Add a new `describe('visual polish', ...)` block with these test cases:

> **Note:** Most of the 21 specified tests already existed across multiple describe blocks from prior phases (expand toggle, pipes, numeric badges, footer, etc.). Added 9 net-new tests: `describe('visual polish — multi-line & pipes')` with 6 tests (WebkitLineClamp:3, no whiteSpace:nowrap, no Edit3 icon, no pipe without groupName, cards beyond 9 no badge, Meta+5) and `describe('preference persistence')` with 3 tests (filter/sort/expand persist via modalStore). Also imported `useModalStore` and added store reset in `beforeEach`. Total: 128 passing tests.

**Expand toggle tests:**

1. `'renders expand toggle button (Maximize2 icon) in header next to close button'`
2. `'clicking expand button changes modal width class from w-[780px] to w-[1200px]'` — assert className contains `w-[1200px]` and `max-w-[95vw]` (Tailwind classes, NOT inline style.width)
3. `'clicking again collapses modal back to w-[780px] (shows Minimize2 → Maximize2)'` — assert className contains `w-[780px]`
4. `'expand button uses same hover pattern as close button (p-1.5 rounded)'` — assert expand button has class `p-1.5` and `rounded`

**Pipe separator tests:**

5. `'Row 1 uses pipe | separators (not slash /)'` — render with groupName, sessionName, tabName, assert `|` in text content, assert no `/` separator
6. `'groupName displays in UPPERCASE'` — assert textTransform style is `uppercase`
7. `'Edit3 pencil icon is NOT rendered in Row 1'` — assert Edit3 not in DOM
8. `'agent icon emoji is NOT rendered in Row 1'` — assert getAgentIcon output not in Row 1

**Multi-line message tests:**

9. `'lastMessage displays up to 3 lines (WebkitLineClamp: 3)'` — assert style property `WebkitLineClamp` is `3`
10. `'lastMessage does NOT use whiteSpace: nowrap'` — assert style property is absent or different
11. `'pipe separator NOT rendered when groupName is undefined'` — render with no groupName, assert no leading `|`

**Preference persistence tests:**

12. `'filter mode persists after modal close and reopen'` — render with 'unread' default, switch to 'all', unmount, remount — assert filter is 'all' (not reset to 'unread'). Mock `updateModalData`/`getData` from modalStore.
13. `'sort mode persists after modal close and reopen'` — switch to 'byAgent', unmount, remount — assert sort is still 'byAgent'
14. `'expanded state persists after modal close and reopen'` — expand modal, unmount, remount — assert modal className contains `w-[1200px]`

**Numeric shortcut tests:**

15. `'cards 1-9 show numeric badges'` — render with 5+ items, assert numbers 1-5 visible on cards with class `w-5 h-5 rounded`
16. `'pressing Meta+1 selects and opens first card'` — fire keyDown with key `1` AND `metaKey: true`, assert onNavigateToSession called with first item's sessionId. Meta key is REQUIRED — bare `1` should NOT trigger.
17. `'pressing Meta+5 selects and opens fifth card'` — fire keyDown with key `5` AND `metaKey: true`, assert correct session
18. `'bare digit keys (without Meta) do NOT trigger navigation'` — 3 items, fire keyDown `1` without metaKey, assert NO navigation call
19. `'cards beyond 9 do not show numeric badge'` — render with 12 items, assert items 10-12 have no number
20. `'footer shows platform-aware shortcut hint'` — assert footer contains `⌘1-9 quick select` on macOS (mock `formatShortcutKeys` if needed), and uses `•` separator between hints
21. `'footer has count on left, hints on right (justify-between)'` — assert footer layout uses `justify-between`

Use TABS for indentation. Create mock sessions with `hasUnread: true` so they appear in the default unread filter. Run `npx vitest run --reporter=verbose 2>&1 | tail -40` from `/Users/felipegobbi/Documents/Vibework/Maestro`. Success criteria: all 21 new tests pass.

## Task 3: Add tests for starred filter mode

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/__tests__/renderer/hooks/useAgentInbox.test.ts`. Add a new `describe('starred filter mode', ...)` block. When creating test sessions, each `AITab` in the mock data MUST include the `starred: boolean` field (it exists on the AITab interface at `src/renderer/types/index.ts:417`). Test cases:

> **Note:** Added 5 hook tests in `describe('starred filter mode')` and 5 component tests in `describe('starred filter')`. All 10 tests pass. Hook tests total: 45 passed. Component tests total: 133 passed.

**Hook tests:**

1. `'returns only starred items when filter is starred'` — create 3 sessions: 2 with `starred: true` tabs, 1 with `starred: false`. Assert only 2 returned.
2. `'returns empty array when no tabs are starred'` — all tabs `starred: false`. Assert empty.
3. `'treats undefined starred as false (excludes from starred filter)'` — tab with `starred: undefined`. Assert excluded.
4. `'starred filter works with all sort modes'` — test with newest, oldest, grouped, byAgent.
5. `'starred items with hasUnread=false still appear in starred filter'` — starred=true, hasUnread=false, state='idle'. Assert included.

Also open `/Users/felipegobbi/Documents/Vibework/Maestro/src/__tests__/renderer/components/AgentInbox.test.tsx` and add:

**Component tests:** 6. `'shows ★ Starred option in filter controls'` — assert filter segmented control has 4th option with text "★ Starred" 7. `'shows star indicator (★) on starred items'` — render with starred items, assert `★` character in card 8. `'star uses theme.colors.warning color'` — assert style.color matches warning token 9. `'non-starred items do NOT show star indicator'` — render with non-starred, assert no `★` 10. `'empty state shows "No starred sessions." for starred filter'` — click starred filter with no starred items, assert message

Use TABS for indentation. Run `npx vitest run --reporter=verbose 2>&1 | tail -40`. Success criteria: all 10 tests pass.

## Task 4: Add tests for byAgent sort mode

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/__tests__/renderer/hooks/useAgentInbox.test.ts`. Add a new `describe('byAgent sort mode', ...)` block. Test cases:

> **Note:** Added 7 hook tests in `describe('byAgent sort mode')` and 7 component tests in `describe('byAgent sort mode')`. All 14 tests pass. Hook tests total: 52 passed. Component tests total: 140 passed.

**Hook tests:**

1. `'groups items by sessionName'` — 3 sessions with different names, assert items grouped by name
2. `'places agents with unreads before agents without'` — mix of unread/read, assert ordering
3. `'sorts by unread count descending among unread agents'` — agent A (3 unreads) before agent B (1 unread)
4. `'sorts alphabetically among zero-unread agents'` — agent "Bravo" before agent "Charlie"
5. `'sorts items within agent by timestamp descending'` — newest first within each group
6. `'handles single-tab sessions correctly'` — sessions with 1 tab, no tabName
7. `'handles identical session names (stable sort)'` — 2 sessions named same, no crash

Also open `/Users/felipegobbi/Documents/Vibework/Maestro/src/__tests__/renderer/components/AgentInbox.test.tsx` and add:

**Component tests:** 8. `'shows By Agent option in sort controls'` — assert 4th sort option "By Agent" 9. `'renders group headers with agent names in byAgent mode'` — click By Agent sort, assert headers 10. `'byAgent headers show agent type in parentheses'` — assert `(claude-code)` or similar in header 11. `'byAgent headers show unread badge only when unreadCount > 0'` — assert badge present for unread agents, absent for zero-unread 12. `'zero-unread agents auto-collapse when switching to byAgent'` — assert collapsed state 13. `'switching away from byAgent clears collapsed state'` — switch to newest, assert all expanded 14. `'keyboard navigation skips collapsed group items in byAgent'` — ArrowDown from last visible item before collapsed group jumps to next visible

Use TABS for indentation. Run `npx vitest run --reporter=verbose 2>&1 | tail -40`. Success criteria: all 14 tests pass.

## Task 5: Full verification gate

- [ ] Run the complete verification gate from `/Users/felipegobbi/Documents/Vibework/Maestro`: (1) Type check: `npx tsc --noEmit --pretty` — must have ZERO errors. (2) Lint: `npx eslint src/renderer/components/AgentInbox.tsx src/renderer/hooks/useAgentInbox.ts src/renderer/types/agent-inbox.ts src/__tests__/renderer/components/AgentInbox.test.tsx src/__tests__/renderer/hooks/useAgentInbox.test.ts --no-error-on-unmatched-pattern` — must have ZERO errors. (3) Tests: `npx vitest run --reporter=verbose` — ALL tests must pass, zero failures. (4) If any step fails, fix the issue and re-run until all pass. Report final counts. Write summary to `/Users/felipegobbi/Documents/Vibework/Maestro/playbooks/agent-inbox/2026-02-15-Inbox-Polish//INBOX_POLISH_GATE_REPORT.md`:

```markdown
# Inbox Polish Gate Report

## Results

- tsc: PASS/FAIL (N errors)
- eslint: PASS/FAIL (N errors, N warnings)
- vitest: PASS/FAIL (N passed, M failed)

## New Tests Added

- Visual polish: N tests
- Starred filter: N tests
- By Agent sort: N tests
- Total new: N tests

## Files Modified

- (list all changed files)

## Summary

(one paragraph)
```

Success criteria: tsc 0 errors, eslint 0 errors, vitest 0 failures.

## Human Visual Checkpoint (NOT a checkbox — manual step)

After the gate passes, visually verify in the running app:

- Expand toggle works (780px ↔ 1200px, smooth 200ms transition)
- Expand button matches close button hover style (accent+20 bg, same p-1.5 rounded pattern)
- Pipe separators render correctly (GROUP | session | tab)
- Multi-line messages display 3 lines with ellipsis
- Starred icon (★) appears on starred cards
- ★ Starred filter shows only starred items
- By Agent grouping shows agent headers with type label and unread badge
- Zero-unread agents are collapsed by default in By Agent mode
- Default filter opens on Unread (not All)
- Filter/sort/expand persist after closing and reopening inbox (via modalData pattern)
- Cards show 1-9 numeric badges (`w-5 h-5 rounded` with bgMain/textDim)
- Pressing Cmd/Ctrl+1-9 opens cards (bare digit keys do NOT trigger)
- Footer shows count on left, hints on right with `•` separator and platform-aware ⌘/Ctrl
