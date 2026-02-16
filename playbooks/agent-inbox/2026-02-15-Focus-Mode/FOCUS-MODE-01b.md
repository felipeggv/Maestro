# Phase 01b: AgentInbox Shell + Test Import Fixups

> **Feature:** Focus Mode (Inbox Triage View)
> **Codebase:** `~/Documents/Vibework/Maestro` | **Branch:** `feature/focus-mode`
> **Depends on:** Phase 01a (InboxListView extracted)

This phase replaces the old `AgentInbox.tsx` with a thin orchestrator shell at `AgentInbox/index.tsx`, then fixes test imports broken by the directory change.

---

## Create AgentInbox Shell

- [x] **Create `src/renderer/components/AgentInbox/index.tsx` as a thin orchestrator shell, then delete the old `AgentInbox.tsx`.** The shell should:

  1. **Import** `InboxListView` from `./InboxListView`
  2. **Import** types: `Theme, Session, Group` from `../../types`, `InboxItem, InboxViewMode` from `../../types/agent-inbox`
  3. **Re-export** `resolveContextUsageColor` from `./InboxListView` so existing test imports don't break:
     ```ts
     export { resolveContextUsageColor } from './InboxListView';
     ```
  4. **Own the modal layer** with a **viewMode-aware Escape handler** (fixes B2 — layer stack conflict):
     ```ts
     const handleLayerEscape = useCallback(() => {
     	if (viewMode === 'focus') {
     		handleExitFocus();
     	} else {
     		handleClose();
     	}
     }, [viewMode, handleExitFocus, handleClose]);

     useModalLayer(MODAL_PRIORITIES.AGENT_INBOX, 'Unified Inbox', handleLayerEscape);
     ```
     Import `useModalLayer` from `../../hooks/ui/useModalLayer` and `MODAL_PRIORITIES` from `../../constants/modalPriorities`.
  5. **Own focus restoration** (same triggerRef/rafIdRef/handleClose pattern as the current AgentInbox, lines 472-492)
  6. **Own viewMode state:**
     ```ts
     const [viewMode, setViewMode] = useState<InboxViewMode>('list')
     const [focusItem, setFocusItem] = useState<InboxItem | null>(null)
     ```
  7. **Handle focus mode entry/exit:**
     ```ts
     const handleEnterFocus = useCallback((item: InboxItem) => {
     	setFocusItem(item);
     	setViewMode('focus');
     }, []);

     const handleExitFocus = useCallback(() => {
     	setFocusItem(null);
     	setViewMode('list');
     }, []);
     ```
  8. **Render the modal shell** (overlay + dialog wrapper from current AgentInbox lines 648-667). The dialog's `onKeyDown` should intercept Escape in focus mode:
     ```ts
     const handleShellKeyDown = useCallback((e: React.KeyboardEvent) => {
     	if (viewMode === 'focus' && e.key === 'Escape') {
     		e.preventDefault();
     		e.stopPropagation();
     		handleExitFocus();
     		return;
     	}
     	// List mode: let layer stack handle Escape, delegate rest to InboxListView
     }, [viewMode, handleExitFocus]);
     ```
  9. **Conditionally render** inside the dialog:
     ```tsx
     {viewMode === 'list' ? (
     	<InboxListView
     		theme={theme}
     		sessions={sessions}
     		groups={groups}
     		onClose={handleClose}
     		onNavigateToSession={onNavigateToSession}
     		onEnterFocus={handleEnterFocus}
     		containerRef={containerRef}
     	/>
     ) : (
     	<div style={{ color: theme.colors.textDim, padding: 40, textAlign: 'center' }}>
     		Focus Mode placeholder — Phase 02
     	</div>
     )}
     ```
  10. **Modal width**: Keep `w-[600px]` for now. Resize animation comes in Phase 07.

  **Props interface** remains unchanged:
  ```ts
  interface AgentInboxProps {
  	theme: Theme;
  	sessions: Session[];
  	groups: Group[];
  	onClose: () => void;
  	onNavigateToSession?: (sessionId: string, tabId?: string) => void;
  }
  ```

  After creating `index.tsx`, **delete** the old `src/renderer/components/AgentInbox.tsx`.

  Run `npx tsc --noEmit` to verify.

---

## Fix Test Imports

- [x] **Fix test imports broken by the directory change.** Three test files need updates:

  1. **`src/__tests__/renderer/components/AgentInbox.test.tsx`** (line 9):
     - Current: `import AgentInbox from '../../../renderer/components/AgentInbox';`
     - This should resolve to `../../../renderer/components/AgentInbox/index.tsx` automatically. Verify by running the test. If it fails, no change needed — the directory index resolution should handle it.

  2. **`src/__tests__/renderer/helpers/agentInboxHelpers.test.ts`** (line 13):
     - Current: `import { resolveContextUsageColor } from '../../../renderer/components/AgentInbox';`
     - This will work IF the re-export in `index.tsx` (step 3 above) is in place. Verify by running this specific test.

  3. **`src/__tests__/renderer/hooks/useAgentInbox.test.ts`** — should not be affected (imports from hooks, not components).

  Run all three tests:
  ```bash
  cd ~/Documents/Vibework/Maestro && npx vitest run src/__tests__/renderer/components/AgentInbox.test.tsx src/__tests__/renderer/helpers/agentInboxHelpers.test.ts src/__tests__/renderer/hooks/useAgentInbox.test.ts
  ```

  Fix any import errors. The goal: **all existing tests pass with zero changes to test assertions**.

---

## Verification Gate

- [x] **Run full verification.** Execute:
  ```bash
  cd ~/Documents/Vibework/Maestro && npx tsc --noEmit && npx vitest run && npx eslint src/renderer/components/AgentInbox/ --ext .ts,.tsx
  ```
  All existing AgentInbox tests must pass. The rendered behavior must be identical to before the refactor.

---

## Commit

- [x] **Commit this phase.**
  ```bash
  git add src/renderer/components/AgentInbox/index.tsx
  git rm src/renderer/components/AgentInbox.tsx 2>/dev/null || true
  git add src/__tests__/renderer/components/AgentInbox.test.tsx \
          src/__tests__/renderer/helpers/agentInboxHelpers.test.ts
  git commit -m "FOCUS-MODE: Phase 01b — AgentInbox shell with viewMode-aware Escape handler"
  ```
