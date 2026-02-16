# Phase 06: Navigation Polish + Mark as Read + Edge Cases

> **Feature:** Focus Mode (Inbox Triage View)
> **Codebase:** `~/Documents/Vibework/Maestro` | **Branch:** `feature/focus-mode`
> **Depends on:** Phase 05 (reply input wired)

This phase polishes the prev/next navigation, adds a "Mark as Read" dismiss action, handles edge cases, and adds smooth transitions when changing items.

---

## Polish Navigation Buttons and Counter

- [x] **Refine the Prev/Next buttons and counter in `src/renderer/components/AgentInbox/FocusModeView.tsx` footer.** The footer was created in Phase 02 as a skeleton. Now polish it:
  1. **Import icons:** Add `ChevronLeft, ChevronRight` to the lucide-react imports.

  2. **Footer layout** (44px, border-top):

     ```tsx
     <div
     	className="flex items-center justify-between px-4 border-t"
     	style={{
     		height: 44,
     		borderColor: theme.colors.border,
     	}}
     >
     	{/* Prev button */}
     	<button
     		onClick={() => onNavigateItem((currentIndex - 1 + items.length) % items.length)}
     		disabled={items.length <= 1}
     		aria-disabled={items.length <= 1 ? 'true' : undefined}
     		className="flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors"
     		style={{
     			border: `1px solid ${theme.colors.border}`,
     			color: items.length > 1 ? theme.colors.textMain : theme.colors.textDim,
     			backgroundColor: 'transparent',
     			cursor: items.length > 1 ? 'pointer' : 'default',
     			opacity: items.length <= 1 ? 0.4 : 1,
     		}}
     		onMouseEnter={(e) => {
     			if (items.length > 1) e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
     		}}
     		onMouseLeave={(e) => {
     			e.currentTarget.style.backgroundColor = 'transparent';
     		}}
     		title="Previous item (←)"
     	>
     		<ChevronLeft className="w-3 h-3" />
     		Prev
     	</button>

     	{/* Center: counter + keyboard hints */}
     	<div className="flex flex-col items-center gap-0.5">
     		<span
     			aria-live="polite"
     			className="text-sm font-medium"
     			style={{ color: theme.colors.textMain }}
     		>
     			{currentIndex + 1} / {items.length}
     		</span>
     		<span className="text-xs" style={{ color: theme.colors.textDim, opacity: 0.6 }}>
     			←→ Navigate · Esc Back
     		</span>
     	</div>

     	{/* Next button */}
     	<button
     		onClick={() => onNavigateItem((currentIndex + 1) % items.length)}
     		disabled={items.length <= 1}
     		aria-disabled={items.length <= 1 ? 'true' : undefined}
     		className="flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors"
     		style={{
     			border: `1px solid ${theme.colors.border}`,
     			color: items.length > 1 ? theme.colors.textMain : theme.colors.textDim,
     			backgroundColor: 'transparent',
     			cursor: items.length > 1 ? 'pointer' : 'default',
     			opacity: items.length <= 1 ? 0.4 : 1,
     		}}
     		onMouseEnter={(e) => {
     			if (items.length > 1) e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
     		}}
     		onMouseLeave={(e) => {
     			e.currentTarget.style.backgroundColor = 'transparent';
     		}}
     		title="Next item (→)"
     	>
     		Next
     		<ChevronRight className="w-3 h-3" />
     	</button>
     </div>
     ```

  3. **Remove duplicate counter** from the header if it exists. The header should show: `[← Inbox] [Agent Name · Tab] [X]`. The counter lives only in the footer now.

  Run `npx tsc --noEmit` to verify.

---

## Mark as Read / Dismiss Action

- [x] **Add a "Mark as Read" button to the FocusModeView header.** This completes the triage loop — users can dismiss items without replying.
  1. **Add a new prop** to FocusModeViewProps:

     ```ts
     onMarkAsRead?: (sessionId: string, tabId: string) => void;
     ```

  2. **Add a "Mark Read" button** in the header bar, between the agent name and close button:

     ```tsx
     <button
     	onClick={() => {
     		if (onMarkAsRead) {
     			onMarkAsRead(item.sessionId, item.tabId);
     		}
     		// Auto-advance after marking as read
     		if (items.length > 1) {
     			const nextIndex = (currentIndex + 1) % items.length;
     			onNavigateItem(nextIndex);
     		}
     	}}
     	className="text-xs px-2 py-1 rounded transition-colors"
     	style={{
     		border: `1px solid ${theme.colors.border}`,
     		color: theme.colors.textDim,
     		backgroundColor: 'transparent',
     	}}
     	onMouseEnter={(e) => {
     		e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
     	}}
     	onMouseLeave={(e) => {
     		e.currentTarget.style.backgroundColor = 'transparent';
     	}}
     	title="Mark as read and advance (M)"
     >
     	✓ Read
     </button>
     ```

  3. **Add keyboard shortcut** for Mark as Read — `M` key. Add to the shell's `handleShellKeyDown` in `index.tsx`, inside the `viewMode === 'focus'` block:

     ```ts
     case 'm':
     case 'M':
     	if (document.activeElement?.tagName !== 'TEXTAREA') {
     		e.preventDefault();
     		// Call onMarkAsRead for the current item, then advance
     		if (onMarkAsRead && items[focusIndex]) {
     			onMarkAsRead(items[focusIndex].sessionId, items[focusIndex].tabId);
     			if (items.length > 1) {
     				setFocusIndex(prev => (prev + 1) % items.length);
     			}
     		}
     	}
     	return;
     ```

  4. **Wire `onMarkAsRead` through AppModals + App.tsx.** In App.tsx, create the handler:

     ```ts
     const handleMarkAsRead = useCallback(
     	(sessionId: string, tabId: string) => {
     		updateSession(sessionId, (s) => ({
     			...s,
     			aiTabs: s.aiTabs.map((t) => (t.id === tabId ? { ...t, hasUnread: false } : t)),
     		}));
     	},
     	[updateSession]
     );
     ```

     Pass it through `AppModals.tsx` → `AgentInbox/index.tsx` → `FocusModeView`.

  5. **Add `M Read` to the footer keyboard hints:**
     ```
     ←→ Navigate · M Read · Esc Back
     ```

  Run `npx tsc --noEmit` to verify.

---

## Smooth Item Transitions

- [x] **Add a subtle transition when navigating between items.** When `currentIndex` changes, add a brief opacity fade to the conversation body:
  1. Add transition state:

     ```ts
     const [isTransitioning, setIsTransitioning] = useState(false);
     const prevItemRef = useRef<string>(`${item.sessionId}-${item.tabId}`);

     useEffect(() => {
     	const currentKey = `${item.sessionId}-${item.tabId}`;
     	if (prevItemRef.current !== currentKey) {
     		setIsTransitioning(true);
     		const timer = setTimeout(() => setIsTransitioning(false), 150);
     		prevItemRef.current = currentKey;
     		return () => clearTimeout(timer);
     	}
     }, [item.sessionId, item.tabId]);
     ```

  2. Apply to the conversation body wrapper:
     ```tsx
     style={{
     	minHeight: 0,
     	opacity: isTransitioning ? 0.3 : 1,
     	transition: 'opacity 150ms ease',
     }}
     ```

  Run `npx tsc --noEmit` to verify.

---

## Edge Cases

- [x] **Handle edge cases for navigation in the AgentInbox shell (`index.tsx`).** Ensure:
  1. **Items list shrinks while in focus mode:**

     ```ts
     useEffect(() => {
     	if (viewMode === 'focus' && items.length > 0 && focusIndex >= items.length) {
     		setFocusIndex(items.length - 1);
     	}
     	if (viewMode === 'focus' && items.length === 0) {
     		handleExitFocus();
     	}
     }, [items.length, focusIndex, viewMode]);
     ```

  2. **Guard in FocusModeView render:**
     ```tsx
     {viewMode === 'focus' && items[focusIndex] ? (
     	<FocusModeView item={items[focusIndex]} ... />
     ) : viewMode === 'focus' ? (
     	<div style={{ color: theme.colors.textDim, padding: 40, textAlign: 'center' }}>
     		<span className="text-sm">No items to focus on</span>
     	</div>
     ) : (
     	<InboxListView ... />
     )}
     ```

  Run `npx tsc --noEmit` to verify.

---

## Verification Gate

- [x] **Run full verification.** Execute:
  ```bash
  cd ~/Documents/Vibework/Maestro && npx tsc --noEmit && npx vitest run && npx eslint src/renderer/components/AgentInbox/ --ext .ts,.tsx
  ```
  All tests must pass.

---

## Commit

- [x] **Commit this phase.**
  ```bash
  git add src/renderer/components/AgentInbox/ \
          src/renderer/components/AppModals.tsx \
          src/renderer/App.tsx
  git commit -m "FOCUS-MODE: Phase 06 — Mark as Read, polished navigation, transitions, edge cases"
  ```
