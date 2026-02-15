# Phase 3: Implement — Starred Filter Mode

## Context

- **Playbook:** Unified Inbox Polish
- **Agent:** maestro.app
- **Project:** /Users/felipegobbi/Documents/Vibework/Maestro
- **Loop:** 00001
- **Date:** 2026-02-15
- **Working Folder:** /Users/felipegobbi/Documents/Vibework/Maestro/playbooks/agent-inbox/2026-02-15-Inbox-Polish/

## Purpose

Implement the `starred` filter mode so the inbox can show only tabs the user has starred. The `AITab.starred: boolean` field already exists at `src/renderer/types/index.ts:417` — this phase wires it through the inbox hook and component.

## Key Paths

- **Hook:** `src/renderer/hooks/useAgentInbox.ts`
- **Component:** `src/renderer/components/AgentInbox.tsx`
- **Types (reference):** `src/renderer/types/index.ts` (AITab interface, line 413)
- **InboxItem type:** `src/renderer/types/agent-inbox.ts`

---

## Task 1: Thread starred into InboxItem and update hook filter

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/hooks/useAgentInbox.ts`. Make two changes: (1) In the `matchesFilter` function (lines 12-27), add a new case for `'starred'`. The function currently receives `sessionState`, `hasUnread`, and `filterMode` — but it does NOT have access to `starred`. Add a 4th parameter `isStarred: boolean` to the function signature. Then add the case: `case 'starred': return isStarred === true`. Update the existing cases so they pass through (the `isStarred` param doesn't affect 'all', 'unread', 'read' — they keep their current logic). (2) In the `useAgentInbox` function (line 157), inside the tab loop (around line 178-201), read `tab.starred` (which exists on the AITab interface) and pass it to `matchesFilter` as the 4th arg: `if (!matchesFilter(session.state, hasUnread, filterMode, tab.starred === true)) continue`. Also add `starred: tab.starred === true` to the `items.push({...})` object so the `InboxItem` carries the starred flag (the `starred?: boolean` field was added to the InboxItem type in Phase 1). Use TABS for indentation. Success criteria: `matchesFilter` has 4 params, includes a `'starred'` case, and `useAgentInbox` passes `tab.starred` through. Run `npx tsc --noEmit --pretty 2>&1 | head -30` from `/Users/felipegobbi/Documents/Vibework/Maestro` — the only remaining type errors should be in `sortItems` for the `byAgent` case (fixed in Doc 4).
> ✅ Done — `matchesFilter` now has 4 params with `'starred'` case; `useAgentInbox` passes `tab.starred === true` through and adds `starred` to pushed items. All 159 tests pass (40 hook + 119 component). TSC errors are pre-existing unused imports (not from our changes).

## Task 2: Add star indicator to inbox card

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/components/AgentInbox.tsx`. In the `InboxItemCardContent` component, add a star indicator to cards that are starred. Find the Row 1 div (the one with pipe separators from Phase 2). Before the timestamp span (the last element in Row 1), add a conditional star: `{item.starred && <span style={{ color: theme.colors.warning, fontSize: 12, flexShrink: 0 }}>★</span>}`. This shows a gold star on starred items regardless of which filter is active. Import `Star` from `lucide-react` is NOT needed — use the Unicode character `★` instead (consistent with the filter label `★ Starred`). Use TABS for indentation. Success criteria: starred items show a `★` character in Row 1, non-starred items don't. The star uses `theme.colors.warning` for color.
> ✅ Done — Added `★` indicator before timestamp span in Row 1, conditioned on `item.starred`, using `theme.colors.warning` color.
