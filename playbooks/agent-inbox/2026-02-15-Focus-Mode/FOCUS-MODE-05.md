# Phase 05: Reply Input + Dual Send Mechanism

> **Feature:** Focus Mode (Inbox Triage View)
> **Codebase:** `~/Documents/Vibework/Maestro` | **Branch:** `feature/focus-mode`
> **Depends on:** Phase 04 (conversation tail rendering)

This phase adds the reply input at the bottom of FocusModeView with TWO send modes:

1. **Quick Reply** (Enter) — sends directly to the agent's PTY, stays in focus mode, auto-advances to next item
2. **Open & Reply** (Shift+Enter or button) — navigates to session with pre-filled input, closes modal

Quick Reply is the primary mechanism — it keeps the user in the triage loop. Open & Reply is for when the user needs full terminal context.

---

## Understand the Send Paths

**Quick Reply** (stays in modal):

1. User types text, presses Enter
2. Calls `processService.write(sessionId, text + '\n')` directly via IPC
3. Adds a user log entry to the tab's logs (for immediate UI feedback)
4. Clears reply input
5. Auto-advances to next item

**Open & Reply** (exits modal):

1. User types text, presses Shift+Enter or clicks "Open" button
2. Navigates to session, sets `inputValue` on the target tab
3. Closes modal — user sees pre-filled input in the terminal
4. User presses Enter in the terminal to confirm send

---

## Add Reply Input to FocusModeView

- [x] **Add a reply input bar above the footer in `src/renderer/components/AgentInbox/FocusModeView.tsx`.** Changes:
  1. **Add two new props** to FocusModeViewProps:

     ```ts
     onQuickReply?: (sessionId: string, tabId: string, text: string) => void;
     onOpenAndReply?: (sessionId: string, tabId: string, text: string) => void;
     ```

  2. **Add reply state:**

     ```ts
     const [replyText, setReplyText] = useState('');
     const replyInputRef = useRef<HTMLTextAreaElement>(null);
     ```

  3. **Reset reply text when item changes** (prev/next navigation):

     ```ts
     useEffect(() => {
     	setReplyText('');
     }, [item.sessionId, item.tabId]);
     ```

  4. **Add the `handleQuickReply` callback:**

     ```ts
     const handleQuickReply = useCallback(() => {
     	const text = replyText.trim();
     	if (!text) return;
     	if (onQuickReply) {
     		onQuickReply(item.sessionId, item.tabId, text);
     	}
     	setReplyText('');
     	// Auto-advance to next item after reply
     	if (items.length > 1) {
     		const nextIndex = (currentIndex + 1) % items.length;
     		onNavigateItem(nextIndex);
     	}
     }, [replyText, item, items, currentIndex, onQuickReply, onNavigateItem]);
     ```

  5. **Add the `handleOpenAndReply` callback:**

     ```ts
     const handleOpenAndReply = useCallback(() => {
     	const text = replyText.trim();
     	if (!text) return;
     	if (onOpenAndReply) {
     		onOpenAndReply(item.sessionId, item.tabId, text);
     	}
     }, [replyText, item, onOpenAndReply]);
     ```

  6. **Add the reply input bar** between the conversation body and the footer:

     ```tsx
     {
     	/* Reply input bar */
     }
     <div
     	className="flex items-end gap-2 px-4 py-2 border-t"
     	style={{ borderColor: theme.colors.border }}
     >
     	<textarea
     		ref={replyInputRef}
     		value={replyText}
     		onChange={(e) => setReplyText(e.target.value)}
     		onKeyDown={(e) => {
     			if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
     				e.preventDefault();
     				handleQuickReply();
     			} else if (e.key === 'Enter' && e.shiftKey) {
     				e.preventDefault();
     				handleOpenAndReply();
     			}
     			// CRITICAL: Prevent focus-mode keyboard shortcuts from firing while typing
     			e.stopPropagation();
     		}}
     		placeholder="Reply to agent..."
     		rows={1}
     		aria-label="Reply to agent"
     		className="flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none"
     		style={{
     			backgroundColor: theme.colors.bgActivity,
     			color: theme.colors.textMain,
     			border: `1px solid ${theme.colors.border}`,
     			minHeight: 36,
     			maxHeight: 80,
     		}}
     		onInput={(e) => {
     			// Auto-resize textarea
     			const target = e.target as HTMLTextAreaElement;
     			target.style.height = 'auto';
     			target.style.height = Math.min(target.scrollHeight, 80) + 'px';
     		}}
     	/>
     	{/* Quick Reply button (primary) */}
     	<button
     		onClick={handleQuickReply}
     		disabled={!replyText.trim()}
     		className="p-2 rounded-lg transition-colors flex-shrink-0"
     		style={{
     			backgroundColor: replyText.trim() ? theme.colors.accent : `${theme.colors.accent}30`,
     			color: replyText.trim() ? theme.colors.accentForeground : theme.colors.textDim,
     			cursor: replyText.trim() ? 'pointer' : 'default',
     		}}
     		title="Quick reply (Enter)"
     	>
     		<ArrowUp className="w-4 h-4" />
     	</button>
     	{/* Open & Reply button (secondary) */}
     	<button
     		onClick={handleOpenAndReply}
     		disabled={!replyText.trim()}
     		className="p-1.5 rounded-lg transition-colors flex-shrink-0 text-xs"
     		style={{
     			border: `1px solid ${theme.colors.border}`,
     			color: replyText.trim() ? theme.colors.textMain : theme.colors.textDim,
     			backgroundColor: 'transparent',
     			cursor: replyText.trim() ? 'pointer' : 'default',
     			opacity: replyText.trim() ? 1 : 0.5,
     		}}
     		title="Open session & reply (Shift+Enter)"
     	>
     		<ExternalLink className="w-3.5 h-3.5" />
     	</button>
     </div>;
     ```

  7. **Import** `ArrowUp, ExternalLink` from lucide-react.

  8. **NOTE:** The textarea background uses `theme.colors.bgActivity` (NOT `bgActive`).

  Run `npx tsc --noEmit` to verify.

---

## Wire Send Handlers in the AgentInbox Shell

- [x] **Add `onQuickReply` and `onOpenAndReply` props and handlers in `src/renderer/components/AgentInbox/index.tsx`.** Changes:
  1. **Add to AgentInboxProps:**

     ```ts
     onQuickReply?: (sessionId: string, tabId: string, text: string) => void;
     onOpenAndReply?: (sessionId: string, tabId: string, text: string) => void;
     ```

  2. **Pass through to FocusModeView:**
     ```tsx
     <FocusModeView
     	...
     	onQuickReply={onQuickReply}
     	onOpenAndReply={onOpenAndReply}
     />
     ```

  Run `npx tsc --noEmit` to verify.

---

## Wire Handlers in AppModals + App.tsx

- [x] **Wire the two handlers from App.tsx through AppModals.tsx to AgentInbox.** Changes:
  1. **In `src/renderer/components/AppModals.tsx`:** Add `onQuickReply` and `onOpenAndReply` to the props interfaces (`AppInfoModalsProps` and `AppModalsProps`). Pass them through to `<AgentInbox>`.

  2. **In `src/renderer/App.tsx`:** Create both handlers near where `onNavigateToSession` is defined for AgentInbox.

     **Quick Reply handler** (sends directly, stays in modal):

     ```ts
     const handleQuickReply = useCallback(
     	(sessionId: string, tabId: string, text: string) => {
     		// Write directly to the agent's PTY stdin
     		window.maestro.process.write(sessionId, text + '\n').catch((err) => {
     			console.error('Quick reply failed:', err);
     		});

     		// Add a user log entry for immediate UI feedback
     		setSessions((prev) =>
     			prev.map((s) => {
     				if (s.id !== sessionId) return s;
     				return {
     					...s,
     					aiTabs: s.aiTabs.map((t) => {
     						if (t.id !== tabId) return t;
     						return {
     							...t,
     							hasUnread: false,
     							logs: [
     								...t.logs,
     								{
     									id: `user-${Date.now()}`,
     									timestamp: Date.now(),
     									source: 'user' as const,
     									text: text,
     								},
     							],
     						};
     					}),
     				};
     			})
     		);
     	},
     	[setSessions]
     );
     ```

     **IMPORTANT:** Verify that `window.maestro.process.write` is the correct IPC call for sending text to an agent's stdin. Check `src/renderer/services/process.ts` — the `processService.write(sessionId, data)` method wraps this. You can use either the service or the direct IPC call. The direct call is simpler here since we don't need error handling beyond a console.error.

     **Open & Reply handler** (navigates to session, pre-fills input):

     ```ts
     const handleOpenAndReply = useCallback(
     	(sessionId: string, tabId: string, text: string) => {
     		// Activate the session
     		setActiveSessionId(sessionId);

     		// Switch to the correct tab and pre-fill input
     		updateSession(sessionId, (s) => ({
     			...s,
     			activeTabId: tabId,
     			aiTabs: s.aiTabs.map((t) =>
     				t.id === tabId ? { ...t, inputValue: text, hasUnread: false } : t
     			),
     		}));

     		// Close the modal
     		setAgentInboxOpen(false);
     	},
     	[setActiveSessionId, updateSession, setAgentInboxOpen]
     );
     ```

     **NOTE:** Before implementing `handleOpenAndReply`, verify that `InputArea.tsx` reads `inputValue` from the session state on tab switch. If `InputArea` uses local state that doesn't sync from props, the pre-fill won't work. Search for `inputValue` in `InputArea.tsx` and trace how it initializes.

  3. Pass both handlers through AppModals to AgentInbox.

  Run `npx tsc --noEmit` to verify the full chain compiles.

---

## Smoke Test for Reply

- [x] **Add reply smoke tests to `src/__tests__/renderer/components/FocusModeView.test.tsx`.** Append to the existing smoke test file created in Phase 02:

  ```ts
  describe('FocusModeView (reply)', () => {
  	it('renders reply textarea with placeholder', () => {
  		// Assert: textarea with placeholder "Reply to agent..." exists
  	});

  	it('send button is disabled when input is empty', () => {
  		// Assert: ArrowUp button is disabled
  	});

  	it('calls onQuickReply on Enter', () => {
  		// Type "hello" in textarea
  		// Press Enter (without shift)
  		// Assert: onQuickReply called with (sessionId, tabId, "hello")
  	});

  	it('calls onOpenAndReply on Shift+Enter', () => {
  		// Type "hello" in textarea
  		// Press Shift+Enter
  		// Assert: onOpenAndReply called with (sessionId, tabId, "hello")
  	});

  	it('clears input and auto-advances after quick reply', () => {
  		// Type "hello", press Enter
  		// Assert: textarea value is empty
  		// Assert: onNavigateItem called with next index
  	});
  });
  ```

  Run: `npx vitest run src/__tests__/renderer/components/FocusModeView.test.tsx`

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
  git add src/renderer/components/AgentInbox/FocusModeView.tsx \
          src/renderer/components/AgentInbox/index.tsx \
          src/renderer/components/AppModals.tsx \
          src/renderer/App.tsx \
          src/__tests__/renderer/components/FocusModeView.test.tsx
  git commit -m "FOCUS-MODE: Phase 05 — dual reply (Quick Reply + Open & Reply) with smoke tests"
  ```
