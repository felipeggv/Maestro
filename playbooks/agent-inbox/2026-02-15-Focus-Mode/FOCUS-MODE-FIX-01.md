# FOCUS-MODE-FIX Phase 01 — Show Real Conversations with Markdown

> **Goal:** Replace the custom LogBubble renderer with the same rendering pipeline used by the main chat interface. Show ALL log types including AI responses, thinking, and tool calls — with full markdown rendering.

---

## Context

### Root Cause of Missing AI Messages
In `useBatchedSessionUpdates.ts` line 223, AI output is stored as `source: 'stdout'` (not `'ai'`). The FocusModeView filter (`source === 'ai' || source === 'user'`) excluded all AI responses.

### Design Decision: Use Same Renderer as Main Chat
The main chat uses `LogItemComponent` from `TerminalOutput.tsx` which renders via `MarkdownRenderer.tsx` (react-markdown + remark-gfm + syntax highlighting). FocusModeView must use the same component to get identical rendering: markdown, code blocks, file links, images, thinking content.

### Components to Reuse
- `MarkdownRenderer` from `src/renderer/components/MarkdownRenderer.tsx` — the markdown engine
- `LogItemComponent` from `src/renderer/components/TerminalOutput.tsx` — the per-message renderer (handles AI/user/thinking/tool/error sources)
- Reading the sources from `tab.logs` without filtering out `'stdout'`, `'thinking'`, or `'tool'`

---

## Tasks

- [x] **Replace LogBubble with MarkdownRenderer-based rendering in FocusModeView.** Open `src/renderer/components/AgentInbox/FocusModeView.tsx` and make these changes:

  1. **Update the log filter** (around line 141) to include ALL renderable log types. Change from:
     ```typescript
     const relevant = tab.logs.filter((log) => log.source === 'ai' || log.source === 'user');
     ```
     To:
     ```typescript
     const relevant = tab.logs.filter(
       (log) => log.source === 'ai' || log.source === 'stdout' || log.source === 'user' ||
       log.source === 'thinking' || log.source === 'tool'
     );
     ```

  2. **Import MarkdownRenderer.** Add at the top:
     ```typescript
     import MarkdownRenderer from '../MarkdownRenderer';
     ```

  3. **Replace the LogBubble component** entirely with a new `FocusLogEntry` component. The new component should:
     - For `source === 'user'`: render with the User icon on the right, message on left, text displayed with `whiteSpace: pre-wrap` (no markdown needed for user messages).
     - For `source === 'stdout' || source === 'ai'`: render with Bot icon on the left, message on right, text rendered via `<MarkdownRenderer content={log.text} theme={theme} />`. Add a raw/rendered toggle button (eye icon) matching the pattern from `TerminalOutput.tsx` lines 760-768. Pass `isAIMode={true}` concept.
     - For `source === 'thinking'`: render with a subtle border-left accent styling + "thinking" badge (matching `TerminalOutput.tsx` lines 457-481). Only show if the thinking toggle is enabled.
     - For `source === 'tool'`: render with a compact tool badge showing tool name (matching `TerminalOutput.tsx` tool rendering). Only show if thinking toggle is enabled.
     - Preserve the existing timestamp display (`formatRelativeTime`).
     - The new component should respect the same theme colors: `theme.colors.bgActivity` for AI bubbles, `theme.colors.accent + '10'` for user bubbles.

  4. **Add thinking toggle state.** Add a state variable `showThinking` (default false) and a toggle button in the subheader bar (next to the status pill). Use the same `Eye`/`EyeOff` icons. When disabled, filter out `'thinking'` and `'tool'` entries from the displayed logs.

  5. **Remove the old LogBubble** component and its helpers (`truncateLogText`, the old `LogBubble` function). Remove unused imports (`Bot`, `User` from lucide-react) if they're no longer needed after the refactor — BUT keep them if the new FocusLogEntry still uses them for the avatar icons.

  6. **Remove `MAX_LOG_TEXT_LENGTH` and `truncateLogText`** — markdown renderer handles long content with scroll/expand naturally.

  7. **Keep `MAX_LOG_ENTRIES = 20`** for now as a performance guard, but consider increasing to 50 since markdown rendering is lazy.

- [ ] **Run verification gate:** Execute `npx tsc --noEmit 2>&1 | head -20 && npx vitest run 2>&1 | tail -10` to confirm types check and tests pass.
