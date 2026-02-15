# Phase 1: Update — Types and Configuration

## Context

- **Playbook:** Unified Inbox Polish
- **Agent:** maestro.app
- **Project:** /Users/felipegobbi/Documents/Vibework/Maestro
- **Loop:** 00001
- **Date:** 2026-02-15
- **Working Folder:** /Users/felipegobbi/Documents/Vibework/Maestro/playbooks/agent-inbox/2026-02-15-Inbox-Polish/

## Purpose

Add the new `starred` filter mode and `byAgent` sort mode to the type system, update filter/sort option arrays, and change the default filter from `all` to `unread`.

## Key Paths

- **Types:** `src/renderer/types/agent-inbox.ts`
- **Component:** `src/renderer/components/AgentInbox.tsx`
- **Hook:** `src/renderer/hooks/useAgentInbox.ts`

---

## Task 1: Extend InboxFilterMode and InboxSortMode types

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/types/agent-inbox.ts`. Make two changes: (1) On line 23, change `export type InboxFilterMode = 'all' | 'unread' | 'read'` to `export type InboxFilterMode = 'all' | 'unread' | 'read' | 'starred'`. Update the comment above it to include "Starred". (2) On line 20, change `export type InboxSortMode = 'newest' | 'oldest' | 'grouped'` to `export type InboxSortMode = 'newest' | 'oldest' | 'grouped' | 'byAgent'`. Update the comment above it to include "By Agent". Also add a `starred?: boolean` field to the `InboxItem` interface (after the `hasUnread` field on line 16) so the inbox can display the star indicator. Use TABS for indentation. Success criteria: `InboxFilterMode` includes `'starred'`, `InboxSortMode` includes `'byAgent'`, `InboxItem` has optional `starred` field. Run `npx tsc --noEmit --pretty 2>&1 | head -30` from `/Users/felipegobbi/Documents/Vibework/Maestro` to check for type errors — there WILL be exhaustiveness errors in the `matchesFilter` and `sortItems` functions, that's expected and will be fixed in later docs.
<!-- DONE: All 3 type changes applied. tsc shows expected error in EMPTY_STATE_MESSAGES (missing 'starred' key) — will be resolved in Task 2. -->

## Task 2: Update FILTER_OPTIONS, SORT_OPTIONS, default filter, and empty states

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/components/AgentInbox.tsx`. Make four changes: (1) Find the `FILTER_OPTIONS` array (around line 430) and add a new entry: `{ value: 'starred', label: '★ Starred' }` as the LAST option. (2) Find the `SORT_OPTIONS` array (around line 424) and add a new entry: `{ value: 'byAgent', label: 'By Agent' }` as the LAST option. (3) Find the `useState<InboxFilterMode>('all')` call (around line 443) and change the default to `'unread'`. (4) Add `'starred'` AND `'byAgent'`-related empty state to the `EMPTY_STATE_MESSAGES` record (around line 29): add `starred: { text: 'No starred sessions.', showIcon: false }`. Also add a `'byAgent'` key to `EMPTY_STATE_MESSAGES` if the record is indexed by filter mode (it is — this key handles when byAgent + unread has no results). Use TABS for indentation. Success criteria: FILTER_OPTIONS has 4 entries, SORT_OPTIONS has 4 entries, default filter is `'unread'`, EMPTY_STATE_MESSAGES has `starred` key. Run `npx tsc --noEmit --pretty 2>&1 | head -50` from `/Users/felipegobbi/Documents/Vibework/Maestro` — type errors in `matchesFilter` and `sortItems` are expected at this stage.
<!-- DONE: All 4 changes applied. FILTER_OPTIONS has 4 entries (All/Unread/Read/★ Starred), SORT_OPTIONS has 4 entries (Newest/Oldest/Grouped/By Agent), default filter changed to 'unread', EMPTY_STATE_MESSAGES has 'starred' key. Note: 'byAgent' key NOT added to EMPTY_STATE_MESSAGES because the record is indexed by InboxFilterMode (not InboxSortMode), and 'byAgent' is a sort mode. tsc shows only pre-existing TS6133 errors in unrelated History files. All 99 component tests + 40 hook tests pass (updated 7 tests for new defaults and button counts). -->
