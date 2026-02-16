# FOCUS-MODE-FIX-08 — Fix Sidebar: Tab Names + Collapsible Groups

> **Goal:** Fix the Focus Mode sidebar to (1) show tab names instead of lastMessage, and (2) add toggle to expand/collapse agent groups.

---

## Current State

The `FocusSidebar` component in `FocusModeView.tsx` (~line 298) groups items by agent name with headers, but:
- Item rows show `itm.tabName || itm.lastMessage?.slice(0, 30) || 'Tab'` — should show `itm.tabName || 'Tab'`
- Agent group headers are static — no expand/collapse toggle

---

## Tasks

- [x] **Invoke `/AIOS:agents:dev` and implement both sidebar fixes.** The dev agent must:

  **Change 1 — Fix item display text** in `src/renderer/components/AgentInbox/FocusModeView.tsx`, in the `FocusSidebar` component, find the item row text (~line 432):
  ```typescript
  {itm.tabName || itm.lastMessage?.slice(0, 30) || 'Tab'}
  ```
  Change to:
  ```typescript
  {itm.tabName || 'Tab'}
  ```

  **Change 2 — Add collapsible groups** in the same `FocusSidebar` component:

  1. Add `ChevronDown` to the lucide-react import at the top of the file (ChevronRight is already imported).

  2. Add state inside `FocusSidebar`:
     ```typescript
     const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
     ```

  3. Replace the group header rendering (~line 373-386) with a clickable version:
     ```tsx
     <div
       key={`header-${row.groupName}-${rowIdx}`}
       onClick={() => {
         setCollapsedGroups(prev => {
           const next = new Set(prev);
           if (next.has(row.groupName)) next.delete(row.groupName);
           else next.add(row.groupName);
           return next;
         });
       }}
       className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider cursor-pointer"
       style={{
         color: theme.colors.textDim,
         fontWeight: 600,
         backgroundColor: theme.colors.bgSidebar,
       }}
     >
       {collapsedGroups.has(row.groupName)
         ? <ChevronRight className="w-3 h-3" />
         : <ChevronDown className="w-3 h-3" />
       }
       {row.groupName}
       <span style={{ color: theme.colors.textDim, opacity: 0.5, marginLeft: 'auto' }}>
         {items.filter(i => i.sessionName === row.groupName).length}
       </span>
     </div>
     ```

  4. For the item list rendering, use a mutable variable to track the active group and skip collapsed items:
     ```typescript
     let activeGroup: string | null = null;
     {rows.map((row, rowIdx) => {
       if (row.type === 'header') {
         activeGroup = row.groupName;
         return (/* header JSX from step 3 */);
       }
       // Skip items in collapsed groups
       if (activeGroup && collapsedGroups.has(activeGroup)) return null;
       // ... rest of existing item rendering unchanged
     })}
     ```

  5. Add `useState` to the imports inside `FocusSidebar` if not already used there (it IS already imported at the file top level, so it's available).

- [x] **Invoke `/AIOS:agents:qa` to validate.** The QA agent must:
  1. Run `npx tsc --noEmit 2>&1 | head -20` — zero new errors.
  2. Run `npx vitest run src/__tests__/renderer/components/FocusModeView.test.tsx src/__tests__/renderer/components/AgentInbox.test.tsx 2>&1 | tail -15` — all tests passing.
  3. Verify that `ChevronDown` was added to the lucide-react import AND to the lucide-react mocks in both test files (`AgentInbox.test.tsx` and `FocusModeView.test.tsx`).
  4. Verify sidebar items no longer reference `lastMessage`.
  5. If tests fail due to missing icon mocks, add the mock and re-run.

  > **QA Results (2026-02-16):**
  > - `tsc --noEmit`: 3 pre-existing errors (unused `React` in History files), zero new errors from sidebar changes
  > - Tests: **196/196 passed** (48 FocusModeView + 148 AgentInbox)
  > - `ChevronDown` confirmed in lucide-react mock in both `FocusModeView.test.tsx` (line 55) and `AgentInbox.test.tsx` (line 25)
  > - `lastMessage` grep on `FocusModeView.tsx`: **0 matches** — fully removed from sidebar item rendering
  > - No icon mock fixes needed — all mocks were already in place

- [ ] **Invoke `/AIOS:agents:analyst` to review.** The analyst must:
  1. Read the `FocusSidebar` component in `FocusModeView.tsx`.
  2. Verify the collapse toggle doesn't interfere with the `currentIndex` navigation (i.e., collapsing a group that contains the current item should still highlight correctly when expanded).
  3. Check: does clicking a group header propagate the click event to parent handlers? Ensure `e.stopPropagation()` is not needed here.
  4. Report findings — no code changes unless a critical issue is found.
