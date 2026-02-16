# INBOX-POLISH-01 — Critical Bug Fixes: Collapse Selection Drift, Header-to-Parent Sync, Cmd+N Mismatch

> **Scope:** `src/renderer/components/AgentInbox/InboxListView.tsx` + `src/renderer/components/AgentInbox/index.tsx` only. ZERO changes to FocusModeView.
> **Branch:** `feature/focus-mode`
> **Codebase:** `~/Documents/Vibework/Maestro`
> **Gate:** `npx tsc --noEmit 2>&1 | head -10 && npx vitest run src/__tests__/renderer/components/AgentInbox.test.tsx 2>&1 | tail -10`

---

## BUG-1: Collapsing a group leaves selectedRowIndex pointing at the wrong item (HIGH)

**Symptom:** User has an item selected inside a group. They press `T` to collapse the group. The group's items vanish from `rows`, but `selectedRowIndex` stays at the same numeric index. That index now points at a completely different row (an item from another group, or a header). The selection silently jumps to a random card instead of moving to the header or nearest visible item.

**Root cause:** `toggleGroup` (line 540 of `InboxListView.tsx`) only toggles the `collapsedGroups` Set. The `rows` memo (line 579) rebuilds without the collapsed items. But no code adjusts `selectedRowIndex` after `rows` changes to track which row the user was actually looking at.

The clamp effect at line 606 only handles `selectedRowIndex >= rows.length` (out-of-bounds). It does NOT handle the case where the index is still in-bounds but now points at a different row identity.

**Fix approach:** Add a `useEffect` that tracks the identity of the selected row. When `rows` changes and the identity at the current `selectedRowIndex` differs from what was previously selected, find the old identity's new position (or fall back to the nearest item row).

---

- [x] Invoke `/AIOS:agents:dev` to fix collapse-selection drift. Make these changes in `src/renderer/components/AgentInbox/InboxListView.tsx`:

  **Step 1: Add a ref to track the selected row's identity.** Insert this right after the `selectedRowIndex` state declaration (after line 599):

  ```typescript
  // Track the identity of the selected row so we can re-find it after rows change
  type RowIdentity = { type: 'header'; groupName: string } | { type: 'item'; sessionId: string; tabId: string };
  const selectedRowIdentityRef = useRef<RowIdentity | null>(null);
  ```

  **Step 2: Update the identity ref whenever selectedRowIndex changes intentionally.** Insert this `useEffect` right after the ref declaration:

  ```typescript
  // Keep the identity ref in sync with selectedRowIndex
  useEffect(() => {
  	const row = rows[selectedRowIndex];
  	if (!row) {
  		selectedRowIdentityRef.current = null;
  		return;
  	}
  	if (row.type === 'header') {
  		selectedRowIdentityRef.current = { type: 'header', groupName: row.groupName };
  	} else {
  		selectedRowIdentityRef.current = { type: 'item', sessionId: row.item.sessionId, tabId: row.item.tabId };
  	}
  }, [selectedRowIndex, rows]);
  ```

  **Step 3: Add a stabilization effect that runs when `rows` changes.** Replace the existing clamp effect at lines 606-621:

  ```typescript
  // Before (lines 606-621):
  useEffect(() => {
  	if (rows.length === 0) {
  		setSelectedRowIndex(0);
  		return;
  	}
  	// Clamp if out of bounds
  	if (selectedRowIndex >= rows.length) {
  		for (let i = rows.length - 1; i >= 0; i--) {
  			if (rows[i].type === 'item') {
  				setSelectedRowIndex(i);
  				return;
  			}
  		}
  		setSelectedRowIndex(0);
  	}
  }, [rows.length, selectedRowIndex]);
  ```

  Replace with:

  ```typescript
  // Stabilize selectedRowIndex after rows change (collapse/expand/filter)
  useEffect(() => {
  	if (rows.length === 0) {
  		setSelectedRowIndex(0);
  		return;
  	}

  	const identity = selectedRowIdentityRef.current;
  	if (!identity) return;

  	// Check if the current index still points at the same identity
  	const currentRow = rows[selectedRowIndex];
  	if (currentRow) {
  		if (identity.type === 'header' && currentRow.type === 'header' && currentRow.groupName === identity.groupName) {
  			return; // Still correct
  		}
  		if (identity.type === 'item' && currentRow.type === 'item' && currentRow.item.sessionId === identity.sessionId && currentRow.item.tabId === identity.tabId) {
  			return; // Still correct
  		}
  	}

  	// Identity drifted — search for the old identity in the new rows
  	for (let i = 0; i < rows.length; i++) {
  		const r = rows[i];
  		if (identity.type === 'header' && r.type === 'header' && r.groupName === identity.groupName) {
  			setSelectedRowIndex(i);
  			return;
  		}
  		if (identity.type === 'item' && r.type === 'item' && r.item.sessionId === identity.sessionId && r.item.tabId === identity.tabId) {
  			setSelectedRowIndex(i);
  			return;
  		}
  	}

  	// Old identity no longer in rows (collapsed away) — find nearest item or clamp
  	const clamped = Math.min(selectedRowIndex, rows.length - 1);
  	// Search downward from clamped position for an item row
  	for (let i = clamped; i < rows.length; i++) {
  		if (rows[i].type === 'item') {
  			setSelectedRowIndex(i);
  			return;
  		}
  	}
  	// Search upward
  	for (let i = clamped - 1; i >= 0; i--) {
  		if (rows[i].type === 'item') {
  			setSelectedRowIndex(i);
  			return;
  		}
  	}
  	// Only headers remain — select the first header
  	setSelectedRowIndex(0);
  }, [rows, selectedRowIndex]);
  ```

  **Important notes:**
  - The `type RowIdentity` can be declared outside the component (before the `InboxListView` function) or inline inside the component. Either is fine.
  - The dependency array for the stabilization effect MUST include `rows` (not `rows.length`) so it fires when the array identity changes after collapse/expand.
  - Do NOT remove any other effects. The sort/filter reset effect (lines 624-638) and the parent sync effect (lines 641-646) remain unchanged.

---

## BUG-2: Header selection orphans parent selectedIndex (MEDIUM)

**Symptom:** When the user navigates to a group header row (using arrow keys), the parent `selectedIndex` in `index.tsx` stays on whichever item was last selected. If the user then presses `F` to enter Focus Mode, they enter focus on the wrong item (the stale one) instead of the first item under the selected header.

**Root cause:** The sync effect at line 641-646 of `InboxListView.tsx` only calls `setSelectedIndex(row.index)` when `row.type === 'item'`. When `row.type === 'header'`, the parent `selectedIndex` is stale.

**Fix approach:** When `selectedRowIndex` points at a header, find the nearest item row below (or above if at end) and sync that item's index to the parent.

---

- [x] Invoke `/AIOS:agents:dev` to fix header-to-parent sync. Make this change in `src/renderer/components/AgentInbox/InboxListView.tsx`:

  **Replace the parent sync effect at lines 641-646:**

  ```typescript
  // Before (lines 641-646):
  useEffect(() => {
  	const row = rows[selectedRowIndex];
  	if (row && row.type === 'item') {
  		setSelectedIndex(row.index);
  	}
  }, [selectedRowIndex, rows, setSelectedIndex]);
  ```

  Replace with:

  ```typescript
  // Sync selectedRowIndex -> parent selectedIndex (used by Focus Mode entry)
  useEffect(() => {
  	const row = rows[selectedRowIndex];
  	if (!row) return;

  	if (row.type === 'item') {
  		setSelectedIndex(row.index);
  		return;
  	}

  	// Header selected — find nearest item below, then above
  	for (let i = selectedRowIndex + 1; i < rows.length; i++) {
  		const r = rows[i];
  		if (r.type === 'header') break; // hit next group, stop
  		if (r.type === 'item') {
  			setSelectedIndex(r.index);
  			return;
  		}
  	}
  	// No item below in same group — search upward
  	for (let i = selectedRowIndex - 1; i >= 0; i--) {
  		const r = rows[i];
  		if (r.type === 'item') {
  			setSelectedIndex(r.index);
  			return;
  		}
  	}
  }, [selectedRowIndex, rows, setSelectedIndex]);
  ```

  **Why this works:** When a user is on a group header and presses `F`, the parent `selectedIndex` already points at the first visible item in that group. Focus Mode opens on the correct item.

  **Note:** If ALL items under the header are collapsed (header is collapsed), the header row won't have item rows adjacent. But that can't happen because collapsed groups hide item rows, and the stabilization effect from BUG-1 would have already moved the selection off the header. This is a safe fallback.

---

## BUG-3: Cmd+1-9 hotkeys use flat items[] index, mismatches visible badge numbers when groups collapsed (MEDIUM)

**Symptom:** In "Grouped" or "By Agent" sort mode with some groups collapsed, the number badges (1-9, 0) on visible cards show the item's position in the flat `items[]` array. If items[0] through items[2] are in a collapsed group, the first visible card shows badge "4" (its flat index). But the user expects Cmd+1 to select the first visible card, not items[0] which is hidden.

**Root cause:** Two mismatches:
1. Badge numbers are computed from `row.index` (flat `items[]` position) at line 459-460.
2. `Cmd+N` navigates to `items[N-1]` (flat index) at lines 759-766.

Both should use a "visible item index" (a counter that only increments for visible item rows).

**Fix approach:** Compute a `visibleItemIndex` map for item rows, use it for badge display and Cmd+N navigation.

---

- [ ] Invoke `/AIOS:agents:dev` to fix Cmd+N badge/navigation mismatch. Make these changes in `src/renderer/components/AgentInbox/InboxListView.tsx`:

  **Step 1: Add a visibleItemIndex map.** Insert this `useMemo` right after the `rows` memo (after line 587):

  ```typescript
  // Map from row index to visible-item-number (1-based, only for item rows)
  // Also build reverse map: visibleItemNumber -> row index (for Cmd+N)
  const { visibleItemNumbers, visibleItemByNumber } = useMemo(() => {
  	const numbers = new Map<number, number>(); // rowIndex -> 1-based visible number
  	const byNumber = new Map<number, number>(); // 1-based visible number -> rowIndex
  	let counter = 0;
  	for (let i = 0; i < rows.length; i++) {
  		if (rows[i].type === 'item') {
  			counter++;
  			numbers.set(i, counter);
  			byNumber.set(counter, i);
  		}
  	}
  	return { visibleItemNumbers: numbers, visibleItemByNumber: byNumber };
  }, [rows]);
  ```

  **Step 2: Update RowExtraProps to pass the map.** At line 361, add to the `RowExtraProps` interface:

  ```typescript
  interface RowExtraProps {
  	rows: ListRow[];
  	theme: Theme;
  	selectedRowIndex: number;
  	onNavigate: (item: InboxItem) => void;
  	collapsedGroups: Set<string>;
  	onToggleGroup: (groupName: string) => void;
  	sortMode: InboxSortMode;
  	visibleItemNumbers: Map<number, number>;  // ADD THIS
  }
  ```

  **Step 3: Use it in InboxRow for badge display.** In the `InboxRow` component, destructure `visibleItemNumbers` from props (add it to the destructured params at line 379). Then replace lines 458-460:

  ```typescript
  // Before (lines 458-460):
  const isLastRow = index === rows.length - 1;
  const showNumber = row.index >= 0 && row.index < 10;
  const numberBadge = row.index === 9 ? 0 : row.index + 1;
  ```

  With:

  ```typescript
  const isLastRow = index === rows.length - 1;
  const visibleNum = visibleItemNumbers.get(index);
  const showNumber = visibleNum !== undefined && visibleNum >= 1 && visibleNum <= 10;
  const numberBadge = visibleNum === 10 ? 0 : visibleNum;
  ```

  **Step 4: Update Cmd+N handler.** Replace lines 758-767:

  ```typescript
  // Before (lines 758-767):
  if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(e.key)) {
  	e.preventDefault();
  	const number = e.key === '0' ? 10 : parseInt(e.key);
  	const targetItemIndex = number - 1;
  	if (targetItemIndex >= 0 && targetItemIndex < items.length) {
  		handleNavigate(items[targetItemIndex]);
  	}
  	return;
  }
  ```

  With:

  ```typescript
  if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(e.key)) {
  	e.preventDefault();
  	const number = e.key === '0' ? 10 : parseInt(e.key);
  	const targetRowIndex = visibleItemByNumber.get(number);
  	if (targetRowIndex !== undefined) {
  		const targetRow = rows[targetRowIndex];
  		if (targetRow && targetRow.type === 'item') {
  			handleNavigate(targetRow.item);
  		}
  	}
  	return;
  }
  ```

  **Step 5: Add `visibleItemByNumber` to handleKeyDown deps.** In the dependency array of `handleKeyDown` (lines 769-779), replace `items` with `visibleItemByNumber`:

  ```typescript
  // Before:
  [getHeaderFocusables, containerRef, rows, selectedRowIndex, sortMode, items, toggleGroup, handleNavigate]
  // After:
  [getHeaderFocusables, containerRef, rows, selectedRowIndex, sortMode, visibleItemByNumber, toggleGroup, handleNavigate]
  ```

  **Step 6: Add `visibleItemNumbers` to `rowProps`.** In the `rowProps` useMemo (lines 800-811), add:

  ```typescript
  const rowProps: RowExtraProps = useMemo(
  	() => ({
  		rows,
  		theme,
  		selectedRowIndex,
  		onNavigate: handleNavigate,
  		collapsedGroups,
  		onToggleGroup: toggleGroup,
  		sortMode,
  		visibleItemNumbers,  // ADD THIS
  	}),
  	[rows, theme, selectedRowIndex, handleNavigate, collapsedGroups, toggleGroup, sortMode, visibleItemNumbers]
  );
  ```

  **Verification:** After this fix:
  - With no collapsed groups, badges show 1-9, 0 in order (same as before).
  - With collapsed groups, badges show 1-9, 0 for visible items only.
  - Cmd+1 always selects the first visible card, Cmd+2 the second, etc.

---

## Gate

- [ ] Invoke `/AIOS:agents:dev` to run the gate check: `npx tsc --noEmit 2>&1 | head -10 && npx vitest run src/__tests__/renderer/components/AgentInbox.test.tsx 2>&1 | tail -10`. Fix any type errors or test failures before completing. If tests reference `row.index` for badge assertions, update them to expect `visibleItemNumbers`-based values instead.
