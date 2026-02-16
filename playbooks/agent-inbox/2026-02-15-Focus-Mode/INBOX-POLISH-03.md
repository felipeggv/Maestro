# INBOX-POLISH-03 — Polish & Nice-to-Haves: Display Name, Empty State, Double-Click, Tooltip, Missing Dep

> **Scope:** `src/renderer/components/AgentInbox/InboxListView.tsx` + `src/renderer/components/AgentInbox/index.tsx` only. ZERO changes to FocusModeView.
> **Branch:** `feature/focus-mode`
> **Codebase:** `~/Documents/Vibework/Maestro`
> **Gate:** `npx tsc --noEmit 2>&1 | head -10 && npx vitest run src/__tests__/renderer/components/AgentInbox.test.tsx 2>&1 | tail -10`

---

## Issues

| ID | Severity | Summary |
|----|----------|---------|
| UX-3 | LOW | toolType in group header shows raw ID "claude-code" instead of display name "Claude Code" |
| UX-4 | LOW | Empty state "All caught up" is misleading when agents are busy/connecting (not "caught up") |
| UX-6 | LOW | No mouse-only way to enter Focus Mode — must use keyboard F key |
| UX-7 | LOW | Context usage bar has no tooltip — users don't know what the colored bar means |
| ARCH-4 | LOW | `handleExitFocus` missing from useEffect dependency array in index.tsx |

---

## UX-3: toolType raw ID shown instead of display name

**Symptom:** In "By Agent" sort mode, the group header shows the raw `toolType` string from the `InboxItem` — e.g., `(claude-code)`, `(codex)`, `(factory-droid)`. Users see internal IDs instead of human-readable names like "Claude Code", "Codex", "Factory Droid".

**Root cause:** Line 437 of `InboxListView.tsx` renders `({agentToolType})` directly. The `agentToolType` value comes from `row.item.toolType` (line 401), which is the raw agent ID string from the session data.

**Fix:** Add a display-name mapping constant and use it in the header rendering.

---

- [x] Invoke `/AIOS:agents:dev` to add agent display name mapping. All changes in `src/renderer/components/AgentInbox/InboxListView.tsx`:

  **Step 1: Add the display name constant.** Insert this right before the `RowExtraProps` interface (around line 360), outside any component:

  ```typescript
  // Human-readable agent display names for group headers
  const TOOL_TYPE_LABELS: Record<string, string> = {
  	'claude-code': 'Claude Code',
  	'codex': 'Codex',
  	'opencode': 'OpenCode',
  	'factory-droid': 'Factory Droid',
  	'terminal': 'Terminal',
  };
  ```

  **Step 2: Use it in the header rendering.** Find the `agentToolType` display in the `InboxRow` function (around line 433-438):

  ```tsx
  {sortMode === 'byAgent' && agentToolType && (
  	<span
  		style={{ fontSize: 11, color: theme.colors.textDim, fontWeight: 400, marginLeft: 4 }}
  	>
  		({agentToolType})
  	</span>
  )}
  ```

  Replace `({agentToolType})` with:

  ```tsx
  ({TOOL_TYPE_LABELS[agentToolType] ?? agentToolType})
  ```

  This falls back to the raw ID if an unknown agent type appears, so it's safe for future agents.

---

## UX-4: Empty state message misleading for "All" filter

**Symptom:** When the "All" filter shows zero items, the empty state says "All caught up -- no sessions need attention." But sessions might exist that are busy or connecting -- they just don't have unread messages. The message implies everything is handled, which is misleading.

**Root cause:** Line 38 of `InboxListView.tsx`:
```typescript
all: { text: 'All caught up — no sessions need attention.', showIcon: true },
```

**Fix:** Use a neutral message that doesn't imply task completion.

---

- [x] Invoke `/AIOS:agents:dev` to update the empty state message. In `src/renderer/components/AgentInbox/InboxListView.tsx`, find the `EMPTY_STATE_MESSAGES` constant (around line 37-42). Replace the `all` entry:

  ```typescript
  // BEFORE:
  all: { text: 'All caught up — no sessions need attention.', showIcon: true },
  ```

  With:

  ```typescript
  // AFTER:
  all: { text: 'No active sessions to show.', showIcon: true },
  ```

  Do NOT change the other filter messages (`unread`, `read`, `starred`) -- those are accurate.

---

## UX-6: Double-click to enter Focus Mode

**Symptom:** Mouse-only users cannot enter Focus Mode without knowing the `F` keyboard shortcut. There is no click-based affordance to drill into a card's focus view.

**Fix:** Add `onDoubleClick` to `InboxItemCardContent` so double-clicking a card enters Focus Mode on that item.

---

- [x] Invoke `/AIOS:agents:dev` to add double-click Focus Mode entry. All changes in `src/renderer/components/AgentInbox/InboxListView.tsx`:

  **Step 1: Add `onDoubleClick` prop to `InboxItemCardContent`.** Find the function signature (around line 99-108):

  ```typescript
  function InboxItemCardContent({
  	item,
  	theme,
  	isSelected,
  	onClick,
  }: {
  	item: InboxItem;
  	theme: Theme;
  	isSelected: boolean;
  	onClick: () => void;
  }) {
  ```

  Change to:

  ```typescript
  function InboxItemCardContent({
  	item,
  	theme,
  	isSelected,
  	onClick,
  	onDoubleClick,
  }: {
  	item: InboxItem;
  	theme: Theme;
  	isSelected: boolean;
  	onClick: () => void;
  	onDoubleClick?: () => void;
  }) {
  ```

  **Step 2: Add `onDoubleClick` to the card div.** Find the `<div role="option"` (around line 117-122) and add the handler next to `onClick`:

  ```tsx
  <div
  	role="option"
  	aria-selected={isSelected}
  	id={`inbox-item-${item.sessionId}-${item.tabId}`}
  	tabIndex={isSelected ? 0 : -1}
  	onClick={onClick}
  	onDoubleClick={onDoubleClick}
  	style={{
  ```

  **Step 3: Add `onEnterFocus` to `RowExtraProps`.** Find the `RowExtraProps` interface (around line 361-369). Add:

  ```typescript
  interface RowExtraProps {
  	rows: ListRow[];
  	theme: Theme;
  	selectedRowIndex: number;
  	onNavigate: (item: InboxItem) => void;
  	collapsedGroups: Set<string>;
  	onToggleGroup: (groupName: string) => void;
  	sortMode: InboxSortMode;
  	onEnterFocus: (item: InboxItem) => void;  // ADD THIS
  }
  ```

  **Note:** If INBOX-POLISH-01 has already been applied, the interface may also include `visibleItemNumbers: Map<number, number>`. Keep that too -- just add `onEnterFocus` alongside it.

  **Step 4: Destructure `onEnterFocus` in `InboxRow`.** In the `InboxRow` component function params (around line 371-385), add `onEnterFocus` to the destructured props.

  **Step 5: Pass `onDoubleClick` to `InboxItemCardContent`.** Find where `InboxItemCardContent` is rendered for item rows (around line 486-491):

  ```tsx
  <InboxItemCardContent
  	item={row.item}
  	theme={theme}
  	isSelected={isRowSelected}
  	onClick={() => onNavigate(row.item)}
  />
  ```

  Change to:

  ```tsx
  <InboxItemCardContent
  	item={row.item}
  	theme={theme}
  	isSelected={isRowSelected}
  	onClick={() => onNavigate(row.item)}
  	onDoubleClick={() => onEnterFocus(row.item)}
  />
  ```

  **Step 6: Include `onEnterFocus` in `rowProps`.** Find the `rowProps` useMemo (around line 800-811). Add `onEnterFocus` to both the object and the dependency array:

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
  		onEnterFocus,  // ADD (from InboxListViewProps, already a prop)
  	}),
  	[rows, theme, selectedRowIndex, handleNavigate, collapsedGroups, toggleGroup, sortMode, onEnterFocus]
  );
  ```

  **Note:** `onEnterFocus` is already available as a prop in `InboxListViewProps` (line 22). You just need to pass it through to `rowProps`.

---

## UX-7: Context usage bar has no tooltip

**Symptom:** The colored progress bar at the bottom of each card (showing context window usage percentage) has no tooltip. Users see a colored bar but have no way to know what it represents without reading the smaller "Context: 45%" text in the badges row.

**Root cause:** The bar wrapper div at line 276 of `InboxListView.tsx` has no `title` attribute.

**Fix:** Add a descriptive `title` attribute.

---

- [ ] Invoke `/AIOS:agents:dev` to add a tooltip to the context bar. In `src/renderer/components/AgentInbox/InboxListView.tsx`, find the context usage bar wrapper (around line 276-283):

  ```tsx
  <div
  	data-testid="context-usage-bar"
  	style={{
  		height: 4,
  		width: '100%',
  ```

  Add a `title` attribute:

  ```tsx
  <div
  	data-testid="context-usage-bar"
  	title={`Context window: ${item.contextUsage}% used`}
  	style={{
  		height: 4,
  		width: '100%',
  ```

---

## ARCH-4: Missing dependency in useEffect (index.tsx)

**Symptom:** React `exhaustive-deps` lint rule would flag this. The useEffect at line 78 of `src/renderer/components/AgentInbox/index.tsx` calls `handleExitFocus()` but does not include it in the dependency array.

**Root cause:** Line 78-85:
```typescript
useEffect(() => {
	if (viewMode === 'focus' && items.length > 0 && focusIndex >= items.length) {
		setFocusIndex(items.length - 1);
	}
	if (viewMode === 'focus' && items.length === 0) {
		handleExitFocus();
	}
}, [items.length, focusIndex, viewMode]);
```

`handleExitFocus` is used inside the effect but missing from `[items.length, focusIndex, viewMode]`. This is technically safe because `handleExitFocus` is a stable `useCallback` with `[]` deps, so it never changes. But it violates the `exhaustive-deps` rule and would break if someone later adds deps to `handleExitFocus`.

**Fix:** Add `handleExitFocus` to the dependency array.

---

- [ ] Invoke `/AIOS:agents:dev` to fix the missing dependency. In `src/renderer/components/AgentInbox/index.tsx`, find the useEffect at lines 78-85:

  ```typescript
  useEffect(() => {
  	if (viewMode === 'focus' && items.length > 0 && focusIndex >= items.length) {
  		setFocusIndex(items.length - 1);
  	}
  	if (viewMode === 'focus' && items.length === 0) {
  		handleExitFocus();
  	}
  }, [items.length, focusIndex, viewMode]);
  ```

  Change the dependency array from:

  ```typescript
  }, [items.length, focusIndex, viewMode]);
  ```

  To:

  ```typescript
  }, [items.length, focusIndex, viewMode, handleExitFocus]);
  ```

  This is safe because `handleExitFocus` is defined with `useCallback(() => { setViewMode('list'); }, [])` at line 96-98 — it has no dependencies and never changes identity. Adding it to the array is purely a correctness/lint fix.

---

## Gate

- [ ] Invoke `/AIOS:agents:dev` to run the gate check: `npx tsc --noEmit 2>&1 | head -10 && npx vitest run src/__tests__/renderer/components/AgentInbox.test.tsx 2>&1 | tail -10`. Fix any type errors or test failures before completing.
