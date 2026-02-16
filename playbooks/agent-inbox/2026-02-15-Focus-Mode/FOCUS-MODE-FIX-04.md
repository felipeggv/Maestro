# FOCUS-MODE-FIX Phase 04 — Register Shortcuts + Update Tests

> **Goal:** Register all Focus Mode shortcuts in the shortcut editor for visibility, and update tests to match the new behavior.

---

## Context

### Shortcuts Visibility
Focus Mode shortcuts (Cmd+←, Cmd+→, Enter, Shift+Enter, Esc) are hardcoded in the shell keydown handler and not visible in the shortcut editor. Register them in `FIXED_SHORTCUTS` for display.

### Test Updates
Several behaviors changed in phases 01-03:
- Log filter now includes `'stdout'`, `'thinking'`, `'tool'`
- Auto-advance after reply removed
- Mark-as-Read button removed (auto-read on view)
- Navigation changed from ArrowLeft/Right to Cmd+ArrowLeft/Right
- New sidebar mini-list component
- New auto-focus behavior

---

## Tasks

- [x] **Register Focus Mode shortcuts in the editor.** In `src/renderer/constants/shortcuts.ts`, add to the `FIXED_SHORTCUTS` object (before the closing `}`):
  ```typescript
  // Focus Mode shortcuts (active only inside Unified Inbox Focus Mode)
  focusPrevItem: {
    id: 'focusPrevItem',
    label: 'Focus Mode: Previous Item',
    keys: ['Meta', 'ArrowLeft'],
  },
  focusNextItem: {
    id: 'focusNextItem',
    label: 'Focus Mode: Next Item',
    keys: ['Meta', 'ArrowRight'],
  },
  focusExitToList: {
    id: 'focusExitToList',
    label: 'Focus Mode: Back to List',
    keys: ['Escape'],
  },
  focusQuickReply: {
    id: 'focusQuickReply',
    label: 'Focus Mode: Quick Reply',
    keys: ['Enter'],
  },
  focusOpenAndReply: {
    id: 'focusOpenAndReply',
    label: 'Focus Mode: Open & Reply',
    keys: ['Shift', 'Enter'],
  },
  inboxEnterFocus: {
    id: 'inboxEnterFocus',
    label: 'Inbox: Enter Focus Mode',
    keys: ['f'],
  },
  ```

- [x] **Update FocusModeView and AgentInbox tests.** _(Tests 1-4 and 6 were already updated in phases 01-03. Added test 13b for auto-focus behavior.)_ Find test files with glob `src/__tests__/**/FocusModeView*` and `src/__tests__/**/AgentInbox*`. Update the following:

  1. **Log filter tests:** Any test verifying which log sources are displayed should now accept `'stdout'`, `'thinking'`, and `'tool'` in addition to `'ai'` and `'user'`. Add a test case with `source: 'stdout'` mock logs to confirm they render.

  2. **Auto-advance tests:** Tests asserting that `onNavigateItem` is called after Quick Reply should be updated to assert it is NOT called. The user stays on the current item.

  3. **Mark-as-Read tests:** Tests for the "Mark Read" button or M shortcut should be removed or replaced with tests for auto-read behavior (verify `onMarkAsRead` is called automatically when an unread item is viewed).

  4. **Navigation tests:** Tests simulating ArrowLeft/ArrowRight should now simulate `metaKey: true` + ArrowLeft/ArrowRight. Plain arrow keys should NOT trigger navigation.

  5. **Auto-focus test:** Add a test verifying that after component mount, the reply textarea receives focus (use `jest.useFakeTimers` / `vi.useFakeTimers` and advance by 200ms).

  6. **Sidebar mini-list tests:** Add basic tests for the FocusSidebar:
     - Renders correct number of items
     - Highlights the current item
     - Calls `onNavigateItem` when item is clicked

- [x] **Run full verification gate:** _(460 test files passed, 19687 tests passed, 0 failures. TSC: 3 pre-existing warnings in History files. ESLint: clean.)_
  ```bash
  npx tsc --noEmit 2>&1 | head -20
  npx eslint src/renderer/components/AgentInbox/ src/renderer/constants/shortcuts.ts --no-error-on-unmatched-pattern 2>&1 | head -20
  npx vitest run 2>&1 | tail -20
  ```
  All must pass.
