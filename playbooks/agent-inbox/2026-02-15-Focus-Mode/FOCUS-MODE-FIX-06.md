# INBOX-POLISH Phase 06 — Unified Inbox List View Polish

> **Goal:** 4 visual/interaction polish items for the Unified Inbox list view: reduce preview text size, add `T` key to toggle group collapse, add visual group separator, and fix auto-focus on modal open.

---

## Context

### Files to modify
- `src/renderer/components/AgentInbox/InboxListView.tsx` — all 4 changes live here
- `src/renderer/components/AgentInbox/index.tsx` — auto-focus fix (container focus on open)

### Current state
- Preview text: `fontSize: 13` with 3-line clamp (Row 2 in `InboxItemCardContent`, line ~217-228)
- Group headers: `36px` tall with `borderBottom: 1px solid ${theme.colors.border}60` (line ~407-453)
- Group collapse: `toggleGroup(groupName)` exists but only triggers on click (line ~538-548)
- Focus on mount: `containerRef.current?.focus()` in `useEffect` (line ~587-589)
- Keyboard handler: `handleKeyDown` in InboxListView handles Tab, then delegates to `useListNavigation` (line ~664-702)

### Architecture notes
- `collapsedGroups: Set<string>` — local state in InboxListView, NOT persisted
- `rows` array contains interleaved `{ type: 'header' }` and `{ type: 'item' }` entries
- `selectedIndex` maps to item index (0-based in the items array), NOT row index
- `buildRows()` at line 52-71 creates the row model
- Group key: `sortMode === 'byAgent' ? item.sessionName : (item.groupName ?? 'Ungrouped')`

---

## Tasks

- [x] **Reduce preview text font size for better visual hierarchy.** In `src/renderer/components/AgentInbox/InboxListView.tsx`, update the `InboxItemCardContent` component:

  1. Find the "Row 2: last message" div (around line 216-228). Change `fontSize: 13` to `fontSize: 12`. This creates clear hierarchy: title row (14px) > preview (12px) > badges (11px).

  2. Also reduce line clamp from 3 to 2: change `WebkitLineClamp: 3` to `WebkitLineClamp: 2`. This keeps cards compact and gives more room for the badge row.

  3. Since the card height is fixed at `ITEM_HEIGHT - 12 = 108px`, reducing preview lines may leave a bit more breathing room — do NOT change `ITEM_HEIGHT`. The `justifyContent: 'space-between'` on the card will distribute the extra space evenly.

- [x] **Add `T` key to toggle collapse on the group under the selected item, then auto-advance.** In `src/renderer/components/AgentInbox/InboxListView.tsx`:

  1. In the `handleKeyDown` callback (around line 664), add a `T`/`t` handler BEFORE the delegation to `listHandleKeyDown`. This only applies when `sortMode` is `'grouped'` or `'byAgent'`:

     ```typescript
     // T to toggle group collapse (only in grouped/byAgent sort modes)
     if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey) {
       if (sortMode === 'grouped' || sortMode === 'byAgent') {
         e.preventDefault();
         const selectedItem = items[selectedIndex];
         if (selectedItem) {
           const groupKey = sortMode === 'byAgent'
             ? selectedItem.sessionName
             : (selectedItem.groupName ?? 'Ungrouped');
           toggleGroup(groupKey);
         }
       }
       return;
     }
     ```

  2. After toggling, the selected item may now be hidden (if we just collapsed its group). We need to auto-advance to the next visible item. Add a `useEffect` that watches `collapsedGroups` and adjusts `selectedIndex`:

     ```typescript
     // Auto-advance selectedIndex if current item is collapsed
     useEffect(() => {
       if (collapsedGroups.size === 0) return;
       const selectedItem = items[selectedIndex];
       if (!selectedItem) return;
       const groupKey = sortMode === 'byAgent'
         ? selectedItem.sessionName
         : (selectedItem.groupName ?? 'Ungrouped');
       if (collapsedGroups.has(groupKey)) {
         // Find next visible item after current index
         for (let i = selectedIndex + 1; i < items.length; i++) {
           const item = items[i];
           const key = sortMode === 'byAgent'
             ? item.sessionName
             : (item.groupName ?? 'Ungrouped');
           if (!collapsedGroups.has(key)) {
             setSelectedIndex(i);
             return;
           }
         }
         // Wrap: find first visible item from start
         for (let i = 0; i < selectedIndex; i++) {
           const item = items[i];
           const key = sortMode === 'byAgent'
             ? item.sessionName
             : (item.groupName ?? 'Ungrouped');
           if (!collapsedGroups.has(key)) {
             setSelectedIndex(i);
             return;
           }
         }
       }
     }, [collapsedGroups, items, selectedIndex, sortMode, setSelectedIndex]);
     ```

  3. Update the footer keyboard hints (line ~921) to include `T` when in grouped/byAgent mode. Change the footer span to conditionally show the hint:
     ```
     `↑↓ navigate • ${(sortMode === 'grouped' || sortMode === 'byAgent') ? 'T collapse • ' : ''}F focus • Enter open • ${formatShortcutKeys(['Meta'])}1-9 quick select • Esc close`
     ```

- [x] **Add visual group separator for clearer agent grouping.** In `src/renderer/components/AgentInbox/InboxListView.tsx`:

  1. In the `InboxRow` component, update the group header rendering (the `row.type === 'header'` branch, around line 407-453). Add a stronger visual separator:

     - Add `marginTop: 4` to the header div style (except for the first header — check `index === 0`). This creates visual breathing room between groups.
     - Change `borderBottom: 1px solid ${theme.colors.border}60` to `borderBottom: 2px solid ${theme.colors.border}40` for a thicker but subtle separator.
     - Add a left accent bar: insert a `4px` wide accent-colored strip on the left side of the header. Use `borderLeft: 3px solid ${theme.colors.accent}40` on the header div.

  2. The total visual change for each group header becomes:
     ```
     ┌ 3px accent bar ┐
     │  ▸ AUTOMEDIA   │   ← 2px bottom border, 4px top margin
     └─────────────────┘
     ```

  3. NOTE: Since the group header has a fixed `GROUP_HEADER_HEIGHT = 36px` and react-window uses this for layout, do NOT add the `marginTop` to the header div's height. Instead, add `paddingTop: index > 0 ? 4 : 0` and increase `GROUP_HEADER_HEIGHT` from `36` to `40` to accommodate the extra padding. Actually — simpler approach: keep `GROUP_HEADER_HEIGHT = 36` and just add the border-left accent + thicker border-bottom. The margin-top approach requires variable row heights which complicates react-window. Stick with the accent bar + thicker bottom border only.

- [x] **Fix auto-focus on modal open so arrow navigation works immediately.** In `src/renderer/components/AgentInbox/index.tsx`:

  1. The container div at line 186 has `tabIndex={-1}` which is correct for programmatic focus. The `InboxListView.tsx` line 587-589 does `containerRef.current?.focus()` in a `useEffect`. The problem: when the modal first renders with `animate-in fade-in`, the element may not be focusable yet during the animation.

  2. Fix: Move the focus call to `index.tsx` (the shell) instead, and wrap it in a `requestAnimationFrame` to ensure the DOM is ready after the CSS animation starts:

     In `index.tsx`, add after the `containerRef` declaration (around line 107):
     ```typescript
     // Auto-focus container on mount for immediate keyboard navigation
     useEffect(() => {
       const raf = requestAnimationFrame(() => {
         containerRef.current?.focus();
       });
       return () => cancelAnimationFrame(raf);
     }, []);
     ```

  3. Remove the duplicate focus call in `InboxListView.tsx` lines 587-589 (the `useEffect` that does `containerRef.current?.focus()`). This avoids double-focus and keeps focus management in one place (the shell).

  4. Verify: After this change, opening the modal with `Alt+Meta+i` should immediately allow arrow up/down navigation without needing to click first.

- [x] **Run verification gate:** Execute `npx tsc --noEmit 2>&1 | head -20 && npx vitest run 2>&1 | tail -10`. All types must compile and all existing tests must pass. If there are test failures related to the focus `useEffect` removal in InboxListView, update the tests to match the new focus behavior (focus is now in the shell component).
