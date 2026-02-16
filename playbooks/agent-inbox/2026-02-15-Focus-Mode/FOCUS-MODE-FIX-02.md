# FOCUS-MODE-FIX Phase 02 — Fix Reply, Navigation, Auto-Read

> **Goal:** Fix Quick Reply process write, change navigation to Cmd+Arrow, remove auto-advance after reply, implement auto-read on focus entry, and show tab status badge.

---

## Context

### Quick Reply Error: "No process found for session"
`handleQuickReply` in `App.tsx` calls `window.maestro.process.write(sessionId, text)` using the bare session ID. But ProcessManager stores processes keyed by `sessionId-ai-tabId`. Fix: use compound key.

### Navigation: Cmd+Arrow instead of plain Arrow
Plain ArrowLeft/Right conflicts with cursor movement in the textarea. Change to Cmd+ArrowLeft/Right.

### No Auto-Advance After Reply
User wants to stay on current item after sending a reply. Remove the auto-advance logic.

### Auto-Read: Remove Manual "Mark as Read"
The "M" shortcut and the "Read" button are confusing. The main interface auto-marks tabs as read when the user views them. Focus Mode should do the same: when user navigates to an inbox item in focus mode, that tab should be automatically marked as read. No manual button needed.

### Tab Status Badge
Show Unread/Starred/Read status in the FocusModeView header so the user knows the state of the current item.

---

## Tasks

- [x] **Fix Quick Reply process write + remove auto-advance + implement auto-read.** Make these changes across multiple files:

  1. **Fix process write in App.tsx.** Find `handleQuickReply` (around line 918). Change the write call from:
     ```typescript
     window.maestro.process.write(sessionId, text + '\n')
     ```
     To:
     ```typescript
     window.maestro.process.write(`${sessionId}-ai-${tabId}`, text + '\n')
     ```
     The `tabId` parameter is already available in the callback signature.

  2. **Remove auto-advance from FocusModeView.** In `src/renderer/components/AgentInbox/FocusModeView.tsx`, in the `handleQuickReply` callback (around lines 171-175), **remove** the auto-advance block entirely:
     ```typescript
     // DELETE these lines:
     if (items.length > 1) {
       const nextIndex = (currentIndex + 1) % items.length;
       onNavigateItem(nextIndex);
     }
     ```
     Keep only `setReplyText('')` and the `onQuickReply` call.

  3. **Remove the "Mark as Read" button and M shortcut.** In `FocusModeView.tsx`:
     - Delete the "Mark Read" button from the header (the `<button>` around lines 267-293 with `✓ Read`).
     - In `src/renderer/components/AgentInbox/index.tsx`, in `handleShellKeyDown`, remove the `case 'm': case 'M':` block (around lines 146-156) that handles the M key.
     - Also remove the auto-advance from the mark-as-read button's onClick handler (it no longer exists).

  4. **Implement auto-read on focus item navigation.** In `FocusModeView.tsx`, add a `useEffect` that fires whenever the current item changes. If the item has `hasUnread: true`, automatically call `onMarkAsRead`:
     ```typescript
     // Auto-mark as read when viewing an item in focus mode
     useEffect(() => {
       if (item.hasUnread && onMarkAsRead) {
         onMarkAsRead(item.sessionId, item.tabId);
       }
     }, [item.sessionId, item.tabId, item.hasUnread, onMarkAsRead]);
     ```
     This mirrors the main interface behavior: viewing a tab = reading it.

  5. **Add tab status badge to FocusModeView header.** In the subheader info bar (around line 309), add a visual indicator showing the tab's current state. Before the status pill, add:
     ```tsx
     {item.starred && (
       <span style={{ color: theme.colors.warning, fontSize: 12 }}>★ Starred</span>
     )}
     ```
     The Unread/Read state is now automatic (auto-read on view), so the badge only needs to show Starred.

- [x] **Change Focus Mode navigation to Cmd+Arrow.** In `src/renderer/components/AgentInbox/index.tsx`, update `handleShellKeyDown` (around lines 133-144):
  - For `case 'ArrowLeft':` — add guard `if (e.metaKey || e.ctrlKey)` before the navigation logic.
  - For `case 'ArrowRight':` — same guard.
  - Without the modifier, let the event propagate naturally (for textarea cursor movement).
  - Update the keyboard hints in FocusModeView footer (line 496) from `←→ Navigate` to `⌘←→ Navigate`.
  - Update Prev/Next button titles to show `(⌘←)` and `(⌘→)`.

- [x] **Run verification gate:** Execute `npx tsc --noEmit 2>&1 | head -20 && npx vitest run 2>&1 | tail -10`.
