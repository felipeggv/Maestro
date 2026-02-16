# Phase 02: FocusModeView Component Shell + ARIA + Smoke Tests

> **Feature:** Focus Mode (Inbox Triage View)
> **Codebase:** `~/Documents/Vibework/Maestro` | **Branch:** `feature/focus-mode`
> **Depends on:** Phase 01b (InboxListView extraction + shell complete)

This phase creates the `FocusModeView` component with its visual shell: header, subheader, empty body, and footer. No conversation data or reply input yet — just the layout and navigation chrome. Includes ARIA attributes and smoke tests.

---

## Create FocusModeView Shell

- [x] **Create `src/renderer/components/AgentInbox/FocusModeView.tsx` with the full visual layout.** The component renders inside the AgentInbox dialog shell (no overlay of its own). Structure:

  **Props interface:**

  ```ts
  import type { Theme, Session } from '../../types';
  import type { InboxItem } from '../../types/agent-inbox';

  interface FocusModeViewProps {
  	theme: Theme;
  	item: InboxItem;
  	items: InboxItem[]; // Full filtered+sorted list for prev/next
  	sessions: Session[]; // For accessing AITab.logs
  	currentIndex: number; // Position of item in items[]
  	onClose: () => void; // Close the entire modal
  	onExitFocus: () => void; // Return to list view
  	onNavigateItem: (index: number) => void; // Jump to item at index
  	onNavigateToSession?: (sessionId: string, tabId?: string) => void;
  }
  ```

  **Layout (top to bottom):**
  1. **Header bar (48px)**: Flex row, `px-4`, border-bottom.
     - Left: `← Inbox` back button (calls `onExitFocus`). Use `<ArrowLeft>` icon from lucide-react (16px) + "Inbox" text in `text-sm font-medium`. Button style: transparent bg, `gap-1.5`.
     - Center: Agent name from `item.sessionName`, `text-sm font-bold`, truncated to 30 chars. If `item.tabName` exists, show it after a `·` separator in `text-xs` with `color: theme.colors.textDim`.
     - Right: Close button (X icon from lucide, calls `onClose`). Style: same as InboxListView close button.

  2. **Subheader info bar (32px)**: Flex row, `px-4`, `text-xs`, border-bottom, background `${theme.colors.bgActivity}` (NOTE: token is `bgActivity`, NOT `bgActive`).
     - Git branch badge: monospace, `px-1.5 py-0.5 rounded`, background `${theme.colors.border}40`. Truncate to 25 chars. Show only if `item.gitBranch` exists.
     - Context usage: `"Context: XX%"` text, colored using `resolveContextUsageColor` (import from `./InboxListView`). Show only if `item.contextUsage !== undefined`.
     - Status pill: `STATUS_LABELS[item.state]` text, colored using `STATUS_COLORS[item.state]` resolved to theme colors (same `resolveStatusColor` logic as InboxListView — import it or duplicate the 5-line function).
     - All items right-aligned with `gap-3`.

  3. **Body (flex: 1, overflow-y: auto)**: Placeholder for now. Add `role="log"` for ARIA:

     ```tsx
     <div
     	role="log"
     	aria-label="Agent conversation"
     	className="flex-1 flex items-center justify-center"
     	style={{ color: theme.colors.textDim }}
     >
     	<span className="text-sm">Conversation view — Phase 04</span>
     </div>
     ```

  4. **Footer (44px)**: Flex row, `px-4`, border-top, `justify-between`.
     - Left: `[← Prev]` button, `aria-disabled={items.length <= 1 ? 'true' : undefined}`, disabled if `items.length <= 1`. Calls `onNavigateItem((currentIndex - 1 + items.length) % items.length)`.
     - Center: Counter with `aria-live="polite"`: `<span aria-live="polite">{currentIndex + 1} / {items.length}</span>`
     - Right: `[Next →]` button, `aria-disabled={items.length <= 1 ? 'true' : undefined}`, disabled if `items.length <= 1`. Calls `onNavigateItem((currentIndex + 1) % items.length)`.
     - Button style: `text-xs px-3 py-1 rounded`, border, hover background at `accent` 10%.

  **ARIA requirements** (blocker from review):
  - Body container: `role="log"` + `aria-label="Agent conversation"`
  - Navigation counter: `aria-live="polite"` (screen readers announce "2 of 5" on change)
  - Prev/Next buttons: `aria-disabled` when inactive (in addition to `disabled` attribute)
  - Back button: `aria-label="Return to inbox list"`

  **Styling rules:**
  - Use tabs for indentation
  - NEVER hardcode hex colors — always `theme.colors.{token}`
  - Tailwind for layout, inline styles for theme colors
  - The entire component should be a single flex column that fills the dialog shell

  Run `npx tsc --noEmit` after creation.

---

## Wire FocusModeView into AgentInbox Shell

- [x] **Replace the focus mode placeholder in `src/renderer/components/AgentInbox/index.tsx` with the real FocusModeView.** Changes:
  1. Import `FocusModeView` from `./FocusModeView`
  2. Import `useAgentInbox` from `../../hooks/useAgentInbox` (the shell needs the filtered items list)
  3. Add state for tracking the current focus index:
     ```ts
     const [focusIndex, setFocusIndex] = useState(0);
     ```
  4. **Lift filter/sort state to the shell.** Move `filterMode`/`sortMode`/`setFilterMode`/`setSortMode` from InboxListView to the shell. Compute items in the shell:

     ```ts
     const [filterMode, setFilterMode] = useState<InboxFilterMode>('all');
     const [sortMode, setSortMode] = useState<InboxSortMode>('newest');
     const items = useAgentInbox(sessions, groups, filterMode, sortMode);
     ```

     Import `InboxFilterMode, InboxSortMode` from `../../types/agent-inbox`.

  5. **Update InboxListView props** to receive items + filter/sort from parent:

     ```ts
     interface InboxListViewProps {
     	theme: Theme;
     	sessions: Session[]; // Still needed for group resolution
     	groups: Group[]; // Still needed for group resolution
     	items: InboxItem[];
     	filterMode: InboxFilterMode;
     	setFilterMode: (mode: InboxFilterMode) => void;
     	sortMode: InboxSortMode;
     	setSortMode: (mode: InboxSortMode) => void;
     	onClose: () => void;
     	onNavigateToSession?: (sessionId: string, tabId?: string) => void;
     	onEnterFocus: (item: InboxItem) => void;
     	containerRef: React.RefObject<HTMLDivElement | null>;
     }
     ```

     **In InboxListView:** Remove `useAgentInbox` call, remove `useState` for filterMode/sortMode. Use `items`/`filterMode`/`sortMode` from props. Keep `collapsedGroups` state inside InboxListView (it's a list-only concern).

  6. When entering focus mode, compute the index:

     ```ts
     const handleEnterFocus = useCallback(
     	(item: InboxItem) => {
     		const idx = items.findIndex(
     			(i) => i.sessionId === item.sessionId && i.tabId === item.tabId
     		);
     		setFocusIndex(idx >= 0 ? idx : 0);
     		setViewMode('focus');
     	},
     	[items]
     );
     ```

  7. Render FocusModeView when `viewMode === 'focus'` and `items[focusIndex]` exists:
     ```tsx
     <FocusModeView
     	theme={theme}
     	item={items[focusIndex]}
     	items={items}
     	sessions={sessions}
     	currentIndex={focusIndex}
     	onClose={handleClose}
     	onExitFocus={handleExitFocus}
     	onNavigateItem={setFocusIndex}
     	onNavigateToSession={onNavigateToSession}
     />
     ```

  Run `npx tsc --noEmit` after all changes.

---

## Smoke Tests

- [x] **Add a smoke test for FocusModeView at `src/__tests__/renderer/components/FocusModeView.test.tsx`.** Minimal test that validates the component renders without crashing and shows the key elements:

  ```ts
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import FocusModeView from '../../../renderer/components/AgentInbox/FocusModeView';
  // Import a default theme from the themes constant
  // Import mock data helpers

  describe('FocusModeView (smoke)', () => {
  	it('renders header with agent name', () => {
  		// Render with minimal mock data: 1 item, 1 session
  		// Assert: item.sessionName is visible
  		// Assert: "Inbox" back button is visible
  		// Assert: close button (X) is visible
  	});

  	it('renders footer with counter', () => {
  		// Assert: "1 / 1" counter is visible
  		// Assert: Prev/Next buttons exist
  	});

  	it('renders ARIA attributes', () => {
  		// Assert: element with role="log" exists
  		// Assert: element with aria-live="polite" exists
  	});
  });
  ```

  Use `vi.fn()` for callbacks. Create minimal mock data (1 session, 1 AI tab, 1 InboxItem). The test should pass with `npx vitest run src/__tests__/renderer/components/FocusModeView.test.tsx`.

---

## Verification Gate

- [x] **Run full verification.** Execute:
  ```bash
  cd ~/Documents/Vibework/Maestro && npx tsc --noEmit && npx vitest run && npx eslint src/renderer/components/AgentInbox/ --ext .ts,.tsx
  ```
  All existing tests must pass. The lift of filter/sort state may require test updates if tests were setting internal state — fix as needed. The key invariant: InboxListView renders identically to the old AgentInbox for `viewMode === 'list'`.

---

## Commit

- [x] **Commit this phase.**
  ```bash
  git add src/renderer/components/AgentInbox/FocusModeView.tsx \
          src/renderer/components/AgentInbox/index.tsx \
          src/renderer/components/AgentInbox/InboxListView.tsx \
          src/__tests__/renderer/components/FocusModeView.test.tsx
  git commit -m "FOCUS-MODE: Phase 02 — FocusModeView shell with ARIA, lifted filter/sort, smoke tests"
  ```
