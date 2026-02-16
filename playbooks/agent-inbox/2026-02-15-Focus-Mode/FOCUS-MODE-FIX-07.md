# FOCUS-MODE-FIX-07 — Fix Reply Sending Empty Message

> **Goal:** Fix the Quick Reply mechanism so it actually sends the user's typed text to the agent, instead of sending an empty string.

---

## Root Cause

`handleQuickReply` in `App.tsx` sets `tab.inputValue = text` and `autoSendOnActivate = true`, then calls `setActiveSessionId(sessionId)`.

The `autoSendOnActivate` useEffect (App.tsx ~line 6267) fires and calls `processInput()` with **no arguments**. Inside `processInput` (useInputProcessing.ts line 148):

```typescript
const effectiveInputValue = overrideInputValue ?? inputValue;
```

`overrideInputValue` is `undefined` (no arg passed), and `inputValue` is the hook's **local state** — which is `''` because the user is typing in the Focus Mode modal textarea, not in the main InputArea.

**Two sub-bugs:**
1. `processInput()` is called without the override text → sends empty
2. If the target session is ALREADY the active session, `activeSession?.id` doesn't change → the useEffect never fires at all

---

## Tasks

- [x] **Invoke `/AIOS:agents:dev` and implement the fix for `handleQuickReply` and the `autoSendOnActivate` effect.** The dev agent must:

  **Change 1 — `handleQuickReply` in `src/renderer/App.tsx` (~line 917):**
  Replace the current implementation. Key changes:
  - Remove `inputValue: text` and `autoSendOnActivate: true` from the tab `setSessions` update — no longer needed.
  - Keep the optimistic user log entry (the `logs: [...]` addition) for immediate UI feedback.
  - Keep `setActiveSessionId(sessionId)` to activate the session.
  - After activation, call `processInputRef.current(text)` via `setTimeout` (150ms delay for React to settle). The `text` parameter maps to `overrideInputValue` in `processInput`, bypassing the hook's stale local `inputValue`.

  New implementation:
  ```typescript
  const handleQuickReply = useCallback(
    (sessionId: string, tabId: string, text: string) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            activeTabId: tabId,
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
      setActiveSessionId(sessionId);
      setTimeout(() => {
        processInputRef.current(text);
      }, 150);
    },
    [setSessions, setActiveSessionId]
  );
  ```

  **Change 2 — `autoSendOnActivate` useEffect in `src/renderer/App.tsx` (~line 6286):**
  Safety net for other callers (context merge). Change:
  ```typescript
  setTimeout(() => {
    processInput();
  }, 100);
  ```
  To:
  ```typescript
  const tabInputValue = activeTab.inputValue;
  setTimeout(() => {
    processInputRef.current(tabInputValue);
  }, 100);
  ```

- [x] **Invoke `/AIOS:agents:qa` to validate the fix.** The QA agent must:
  1. Run `npx tsc --noEmit 2>&1 | head -20` — zero new errors expected.
  2. Run `npx vitest run src/__tests__/renderer/components/AgentInbox.test.tsx src/__tests__/renderer/components/FocusModeView.test.tsx 2>&1 | tail -15` — all tests passing.
  3. Verify `handleQuickReply` no longer references `autoSendOnActivate` or `inputValue` in the tab update.
  4. Verify `processInputRef.current` is called with `text` argument (not empty).
  5. If any tests fail, fix them and re-run.

- [x] **Invoke `/AIOS:agents:analyst` to review the implementation.** The analyst must:
  1. Read `src/renderer/App.tsx` lines around `handleQuickReply` and the `autoSendOnActivate` useEffect.
  2. Confirm the `overrideInputValue` parameter correctly bypasses the hook's local `inputValue` state.
  3. Confirm the 150ms delay is sufficient for `setActiveSessionId` to settle (compare with the existing 100ms delay in autoSendOnActivate).
  4. Check for race conditions: what happens if the user sends two quick replies in rapid succession?
  5. Report findings — no code changes unless a critical issue is found.
