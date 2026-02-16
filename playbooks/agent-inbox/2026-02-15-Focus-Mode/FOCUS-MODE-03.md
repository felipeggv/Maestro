# Phase 03: Focus Mode Entry Button + Keyboard Shortcuts

> **Feature:** Focus Mode (Inbox Triage View)
> **Codebase:** `~/Documents/Vibework/Maestro` | **Branch:** `feature/focus-mode`
> **Depends on:** Phase 02 (FocusModeView shell wired in)

This phase adds the "Focus" entry button to the InboxListView header and wires keyboard shortcuts for both entering and navigating within focus mode.

---

## Focus Button in InboxListView Header

- [x] **Add a "Focus" button to the InboxListView header row 1, next to the close button.** Open `src/renderer/components/AgentInbox/InboxListView.tsx`. In the header row 1 (the row with "Unified Inbox" title + badge + close button), add a button between the badge and the close button:

  **Button spec:**

  ```tsx
  <button
  	onClick={() => {
  		if (items.length > 0 && items[selectedIndex]) {
  			onEnterFocus(items[selectedIndex]);
  		}
  	}}
  	disabled={items.length === 0}
  	className="text-xs px-2.5 py-1 rounded transition-colors"
  	style={{
  		backgroundColor: items.length > 0 ? `${theme.colors.accent}15` : 'transparent',
  		color: items.length > 0 ? theme.colors.accent : theme.colors.textDim,
  		cursor: items.length > 0 ? 'pointer' : 'default',
  		opacity: items.length === 0 ? 0.5 : 1,
  	}}
  	onMouseEnter={(e) => {
  		if (items.length > 0) {
  			e.currentTarget.style.backgroundColor = `${theme.colors.accent}25`;
  		}
  	}}
  	onMouseLeave={(e) => {
  		if (items.length > 0) {
  			e.currentTarget.style.backgroundColor = `${theme.colors.accent}15`;
  		}
  	}}
  	title="Enter Focus Mode (F)"
  >
  	Focus ▶
  </button>
  ```

  Place it in the header row 1, right side, in a flex container with `gap-2` alongside the close button. The order should be: `[Focus ▶] [X]`.

  Run `npx tsc --noEmit` to verify.

---

## Keyboard Shortcuts

- [x] **Wire keyboard shortcuts for Focus Mode in the AgentInbox shell + lift selectedIndex.** Open `src/renderer/components/AgentInbox/index.tsx`. Changes:

  **Step 1: Lift selectedIndex to the shell.**
  Add to the shell:

  ```ts
  const [selectedIndex, setSelectedIndex] = useState(0);
  ```

  Update InboxListView props to include:

  ```ts
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  ```

  Remove `useState` for `selectedIndex` from InboxListView. Pass `selectedIndex` and `setSelectedIndex` as props.

  **Step 2: Update `handleShellKeyDown` in the shell.**

  When `viewMode === 'focus'`, handle focus-mode-specific keys. **Do NOT add a blanket `return` that consumes all keys** — only consume keys that are explicitly handled. Unrecognized keys should propagate (future-proof for new interactive elements):

  ```ts
  const handleShellKeyDown = useCallback(
  	(e: React.KeyboardEvent) => {
  		if (viewMode === 'focus') {
  			switch (e.key) {
  				case 'Escape':
  					e.preventDefault();
  					e.stopPropagation();
  					handleExitFocus();
  					return;
  				case 'ArrowLeft':
  					e.preventDefault();
  					if (items.length > 1) {
  						setFocusIndex((prev) => (prev - 1 + items.length) % items.length);
  					}
  					return;
  				case 'ArrowRight':
  					e.preventDefault();
  					if (items.length > 1) {
  						setFocusIndex((prev) => (prev + 1) % items.length);
  					}
  					return;
  				case 'Backspace':
  				case 'b':
  				case 'B':
  					// Guard: only exit if NOT typing in the reply textarea
  					if (document.activeElement?.tagName !== 'TEXTAREA') {
  						e.preventDefault();
  						handleExitFocus();
  					}
  					return;
  			}
  			// Let unrecognized keys propagate (don't consume them)
  			return;
  		}

  		// List mode: F to enter focus
  		if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) {
  			e.preventDefault();
  			if (items.length > 0 && items[selectedIndex]) {
  				handleEnterFocus(items[selectedIndex]);
  			}
  		}
  	},
  	[viewMode, items, selectedIndex, handleEnterFocus, handleExitFocus]
  );
  ```

  **Key fix (C7):** The `Backspace`/`B` shortcut now checks `document.activeElement?.tagName !== 'TEXTAREA'` before exiting focus mode. This prevents accidentally leaving focus mode while typing in the reply input (Phase 05). Without this guard, pressing Backspace to delete text would exit focus mode.

  Run `npx tsc --noEmit` to verify.

---

## Update Footer Hints

- [x] **Update keyboard hints in both views.**

  **InboxListView footer** (already has `↑↓ Navigate`, `Enter Open`, `Esc Close`):
  - Add `F Focus` hint: `<span>F Focus</span>` (if not already added in Phase 01a)

  **FocusModeView footer** (currently has Prev/Next buttons):
  - Add keyboard hints in the center between nav buttons: `←→ Navigate · Esc Back`

  Run `npx tsc --noEmit` to verify.

---

## Verification Gate

- [x] **Run full verification.** Execute:
  ```bash
  cd ~/Documents/Vibework/Maestro && npx tsc --noEmit && npx vitest run && npx eslint src/renderer/components/AgentInbox/ --ext .ts,.tsx
  ```
  Lifting `selectedIndex` may require updating existing tests that checked internal state. Fix as needed. All tests must pass.

---

## Commit

- [x] **Commit this phase.**
  ```bash
  git add src/renderer/components/AgentInbox/
  git commit -m "FOCUS-MODE: Phase 03 — Focus button, keyboard shortcuts, lifted selectedIndex"
  ```
