# Phase 4: Implement — By Agent Sort Mode

## Context

- **Playbook:** Unified Inbox Polish
- **Agent:** maestro.app
- **Project:** /Users/felipegobbi/Documents/Vibework/Maestro
- **Loop:** 00001
- **Date:** 2026-02-15
- **Working Folder:** /Users/felipegobbi/Documents/Vibework/Maestro/playbooks/agent-inbox/2026-02-15-Inbox-Polish/

## Purpose

Implement the `byAgent` sort mode that groups inbox items by their parent agent (session), with agents that have unread items expanded at the top and agents with zero unreads collapsed at the bottom.

## Key Paths

- **Hook:** `src/renderer/hooks/useAgentInbox.ts`
- **Component:** `src/renderer/components/AgentInbox.tsx`
- **Types (reference):** `src/renderer/types/agent-inbox.ts`

---

## Task 1: Add byAgent sorting logic in the hook

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/hooks/useAgentInbox.ts`. Find the `sortItems` function (around lines 125-147). Add a new case `'byAgent'` to the switch statement. Here is the exact pseudocode to implement:

```typescript
case 'byAgent': {
	// Step 1: Group items by sessionName
	const agentGroups = new Map<string, InboxItem[]>()
	for (const item of sorted) {
		const key = item.sessionName
		if (!agentGroups.has(key)) agentGroups.set(key, [])
		agentGroups.get(key)!.push(item)
	}

	// Step 2: Pre-compute metadata per group
	const groupMeta: { key: string; unreadCount: number; items: InboxItem[] }[] = []
	for (const [key, groupItems] of agentGroups) {
		const unreadCount = groupItems.filter(i => i.hasUnread).length
		// Sort items within group: newest first
		groupItems.sort((a, b) => b.timestamp - a.timestamp)
		groupMeta.push({ key, unreadCount, items: groupItems })
	}

	// Step 3: Sort groups — unreads first (by count desc), then zero-unreads (alphabetical)
	groupMeta.sort((a, b) => {
		if (a.unreadCount > 0 && b.unreadCount === 0) return -1
		if (a.unreadCount === 0 && b.unreadCount > 0) return 1
		if (a.unreadCount > 0 && b.unreadCount > 0) return b.unreadCount - a.unreadCount
		return a.key.localeCompare(b.key)
	})

	// Step 4: Flatten back
	sorted.length = 0
	for (const group of groupMeta) {
		sorted.push(...group.items)
	}
	break
}
```

Use TABS for indentation (the above is shown with tabs). Success criteria: when `sortMode === 'byAgent'`, items are grouped by `sessionName` with unread groups first, sorted by unread count descending, zero-unread groups alphabetical. Run `npx tsc --noEmit --pretty 2>&1 | head -30` from `/Users/felipegobbi/Documents/Vibework/Maestro` — there should be ZERO type errors now (all sort/filter modes are handled).

## Task 2: Add byAgent group headers and metadata in the component

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/components/AgentInbox.tsx`. This is a combined task with 4 sub-changes. Read the ENTIRE task before starting.

**Sub-change A: Update RowExtraProps.** Find the `RowExtraProps` interface (around line 344). Add `sortMode: InboxSortMode` to it. Then find where `rowProps` is constructed (around line 628) and add `sortMode` to the object.

**Sub-change B: Update buildRows.** Find the `buildRows` function (around lines 42-59). Change the early return condition from `if (sortMode !== 'grouped')` to `if (sortMode !== 'grouped' && sortMode !== 'byAgent')`. Then inside the loop, determine the grouping key based on sort mode:

```typescript
function buildRows(items: InboxItem[], sortMode: InboxSortMode): ListRow[] {
	if (sortMode !== 'grouped' && sortMode !== 'byAgent') {
		return items.map((item, index) => ({ type: 'item' as const, item, index }));
	}
	const rows: ListRow[] = [];
	let lastGroup: string | null = null;
	let itemIndex = 0;
	for (const item of items) {
		// For 'grouped': group by Left Bar group name
		// For 'byAgent': group by session/agent name
		const groupKey = sortMode === 'byAgent' ? item.sessionName : (item.groupName ?? 'Ungrouped');
		if (groupKey !== lastGroup) {
			rows.push({ type: 'header', groupName: groupKey });
			lastGroup = groupKey;
		}
		rows.push({ type: 'item', item, index: itemIndex });
		itemIndex++;
	}
	return rows;
}
```

**Sub-change C: Update group header rendering.** Find the group header rendering inside `InboxRow` (around lines 370-395). When `sortMode === 'byAgent'`, add two elements after the group name text:

1. **Agent type label:** Look up the `toolType` from the first item after this header. Scan `rows` from `index + 1` until finding a row with `type === 'item'`, then read `row.item.toolType`. Display: `<span style={{ fontSize: 11, color: theme.colors.textDim, fontWeight: 400, marginLeft: 4 }}>({toolType})</span>`. If no item found, skip.

2. **Unread count badge:** Count unread items in this group by scanning `rows` from `index + 1` until hitting the next header or end. Count items where `item.hasUnread === true`. Display ONLY if `unreadCount > 0`: `<span style={{ fontSize: 11, marginLeft: 'auto', padding: '1px 6px', borderRadius: 10, backgroundColor: theme.colors.warning + '20', color: theme.colors.warning }}>{unreadCount} unread</span>`. Do NOT show badge when `unreadCount === 0` (cleaner, less noise).

**Sub-change D: Auto-collapse zero-unread agents.** In the main `AgentInbox` component, add a `useEffect` after the existing `collapsedGroups` state. This effect runs when `sortMode` changes:

```typescript
useEffect(() => {
	if (sortMode === 'byAgent') {
		// Compute which agents have zero unreads
		const agentUnreads = new Map<string, number>();
		for (const item of items) {
			const count = agentUnreads.get(item.sessionName) ?? 0;
			agentUnreads.set(item.sessionName, count + (item.hasUnread ? 1 : 0));
		}
		const toCollapse = new Set<string>();
		for (const [agent, count] of agentUnreads) {
			if (count === 0) toCollapse.add(agent);
		}
		setCollapsedGroups(toCollapse);
	} else {
		// Clear auto-collapsed state when leaving byAgent
		setCollapsedGroups(new Set());
	}
}, [sortMode, items]);
```

**Important:** This `useEffect` replaces the collapsed state — any manually expanded groups will reset when `items` changes. This is acceptable because byAgent is a triage view.

Use TABS for indentation. All colors from `theme.colors.*`. Success criteria: (1) byAgent headers show `sessionName (toolType)` with unread badge when > 0, (2) zero-unread agents are auto-collapsed, (3) `sortMode` is available in `RowExtraProps`, (4) `npx tsc --noEmit --pretty` from `/Users/felipegobbi/Documents/Vibework/Maestro` has ZERO errors.
