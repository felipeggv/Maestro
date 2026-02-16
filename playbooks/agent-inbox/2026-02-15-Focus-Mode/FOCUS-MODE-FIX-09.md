# FOCUS-MODE-FIX-09 — Thinking Toggle: Replicate Official 3-State System

> **Goal:** Replace the custom boolean thinking toggle in Focus Mode with an exact replica of the official 3-state thinking toggle from InputArea.tsx.

---

## Current State

FocusModeView has a custom `showThinking` boolean toggle (~line 594) that uses `Brain` icon and just toggles true/false. The official system has 3 states:

- **off** → hidden (dim, transparent border)
- **on** → temporary streaming (accent color, accent border)
- **sticky** → persistent (warning/orange color, warning border, + Pin icon)

Cycle: `off → on → sticky → off`

The official button is in `src/renderer/components/InputArea.tsx:1052-1092` and the cycling logic is in `src/renderer/App.tsx:4644-4676` (`handleToggleTabShowThinking`).

---

## Tasks

- [x] **Invoke `/AIOS:agents:dev` and replace the thinking toggle.** The dev agent must make these changes in `src/renderer/components/AgentInbox/FocusModeView.tsx`:

  1. **Add `Pin` to the lucide-react import** (~line 2-14). The import already has `Brain`. Add `Pin`:
     ```typescript
     import { ..., Brain, Pin, FileText } from 'lucide-react';
     ```

  2. **Import `ThinkingMode` type** (~line 15):
     ```typescript
     import type { Theme, Session, LogEntry, ThinkingMode } from '../../types';
     ```

  3. **Change local state from boolean to ThinkingMode** in the main `FocusModeView` component (~line 485):
     ```typescript
     // OLD:
     const [showThinking, setShowThinking] = useState(false);
     // NEW:
     const [showThinking, setShowThinking] = useState<ThinkingMode>('off');
     ```

  4. **Add a cycle function** (matching `App.tsx:4650`):
     ```typescript
     const cycleThinking = useCallback(() => {
       setShowThinking((current) => {
         if (current === 'off') return 'on';
         if (current === 'on') return 'sticky';
         return 'off';
       });
     }, []);
     ```

  5. **Update the visibleLogs filter** (~line 510). Currently checks `if (showThinking) return logs;`. Change:
     ```typescript
     const visibleLogs = useMemo(() => {
       if (showThinking !== 'off') return logs;
       return logs.filter((log) => log.source !== 'thinking' && log.source !== 'tool');
     }, [logs, showThinking]);
     ```

  6. **Replace the button JSX** in the subheader (~line 592-605) with the official 3-state version from `InputArea.tsx:1055-1091`:
     ```tsx
     {/* Thinking toggle — 3-state: off → on → sticky → off */}
     <button
       onClick={cycleThinking}
       className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full cursor-pointer transition-all ${
         showThinking !== 'off' ? '' : 'opacity-40 hover:opacity-70'
       }`}
       style={{
         backgroundColor:
           showThinking === 'sticky'
             ? `${theme.colors.warning}30`
             : showThinking === 'on'
               ? `${theme.colors.accent}25`
               : 'transparent',
         color:
           showThinking === 'sticky'
             ? theme.colors.warning
             : showThinking === 'on'
               ? theme.colors.accent
               : theme.colors.textDim,
         border:
           showThinking === 'sticky'
             ? `1px solid ${theme.colors.warning}50`
             : showThinking === 'on'
               ? `1px solid ${theme.colors.accent}50`
               : '1px solid transparent',
       }}
       title={
         showThinking === 'off'
           ? 'Show Thinking - Click to stream AI reasoning'
           : showThinking === 'on'
             ? 'Thinking (temporary) - Click for sticky mode'
             : 'Thinking (sticky) - Click to turn off'
       }
     >
       <Brain className="w-3 h-3" />
       <span>Thinking</span>
       {showThinking === 'sticky' && <Pin className="w-2.5 h-2.5" />}
     </button>
     ```

     **Note:** The official `InputArea.tsx` uses `theme.colors.accentText` for the 'on' state. Check if `accentText` exists in the theme type (`src/shared/themes.ts`). If it does, use it. If not, `theme.colors.accent` is the safe fallback.

- [ ] **Invoke `/AIOS:agents:qa` to validate.** The QA agent must:
  1. Run `npx tsc --noEmit 2>&1 | head -20` — zero new errors.
  2. Run `npx vitest run src/__tests__/renderer/components/FocusModeView.test.tsx src/__tests__/renderer/components/AgentInbox.test.tsx 2>&1 | tail -15` — all tests passing.
  3. Add `Pin` to the lucide-react mock in BOTH test files (`FocusModeView.test.tsx` and `AgentInbox.test.tsx`):
     ```typescript
     Pin: ({ className }: { className?: string }) => (
       <span data-testid="pin-icon" className={className}>📌</span>
     ),
     ```
  4. Update any test assertions that reference old thinking toggle titles (`'Hide thinking & tools'` / `'Show thinking & tools'`) to match the new 3-state titles.
  5. If tests fail, fix and re-run until green.

- [ ] **Invoke `/AIOS:agents:analyst` to review.** The analyst must:
  1. Read the thinking toggle implementation in `FocusModeView.tsx`.
  2. Compare side-by-side with the official in `InputArea.tsx:1052-1092` — confirm styling matches exactly.
  3. Verify the `ThinkingMode` import resolves correctly from `../../types`.
  4. Check: in Focus Mode, the thinking state is LOCAL to the modal (not persisted to the tab's `showThinking` property). Is this correct behavior or should it sync with the tab? Report the tradeoff.
  5. Report findings — no code changes unless a critical issue is found.
