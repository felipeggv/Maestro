# FOCUS-MODE-FIX Phase 03 — Breadcrumb, Auto-Focus, Sidebar Mini-List

> **Goal:** Fix breadcrumb to show full path (GROUP | agent · tab), auto-focus the reply input, and add a sidebar mini-list for navigating between inbox items.

---

## Context

### Breadcrumb
FocusModeView header currently shows only `sessionName · tabName`. Must show the full breadcrumb: `GROUP | agent-name · tab-name`, matching the InboxListView card format.

### Auto-Focus Input
When Focus Mode opens or user navigates between items, the cursor should automatically land in the reply textarea. This prevents accidental keyboard shortcut triggers.

### Sidebar Mini-List
Add a narrow sidebar panel on the left side of FocusModeView showing all inbox items as a condensed navigable list. The current item is highlighted. Clicking an item navigates to it. This gives spatial awareness of "where am I in the queue."

**Pattern to reuse:** The `InboxItemCardContent` component from `InboxListView.tsx` (lines 100-298) already renders inbox item cards. Create a condensed version for the sidebar.

---

## Tasks

- [x] **Fix breadcrumb and add auto-focus.** In `src/renderer/components/AgentInbox/FocusModeView.tsx`:

  1. **Update the header center breadcrumb** (around lines 230-264) to show the full path. Add groupName before sessionName:
     ```tsx
     <div className="flex-1 flex items-center justify-center gap-1" style={{ overflow: 'hidden' }}>
       {item.groupName && (
         <>
           <span className="text-xs" style={{
             color: theme.colors.textDim,
             whiteSpace: 'nowrap',
             textTransform: 'uppercase',
             letterSpacing: '0.5px',
           }}>
             {item.groupName}
           </span>
           <span className="text-xs" style={{ color: theme.colors.textDim, padding: '0 4px' }}>|</span>
         </>
       )}
       <span className="text-sm font-bold" style={{
         color: theme.colors.textMain,
         whiteSpace: 'nowrap',
         overflow: 'hidden',
         textOverflow: 'ellipsis',
       }}>
         {truncate(item.sessionName, 30)}
       </span>
       {item.tabName && (
         <>
           <span className="text-xs" style={{ color: theme.colors.textDim }}>·</span>
           <span className="text-xs" style={{
             color: theme.colors.textDim,
             whiteSpace: 'nowrap',
             overflow: 'hidden',
             textOverflow: 'ellipsis',
           }}>
             {item.tabName}
           </span>
         </>
       )}
     </div>
     ```

  2. **Add auto-focus on the reply textarea.** After the `replyInputRef` declaration (around line 157), add:
     ```typescript
     // Auto-focus reply input when entering focus mode or switching items
     useEffect(() => {
       const timer = setTimeout(() => {
         replyInputRef.current?.focus();
       }, 200);
       return () => clearTimeout(timer);
     }, [item.sessionId, item.tabId]);
     ```

- [x] **Add sidebar mini-list for item navigation.** This is a layout change to FocusModeView. The current layout is a single column (header → body → reply → footer). Change it to a two-column layout: narrow sidebar (200px) on the left + main content on the right.

  1. **Create a `FocusSidebar` inline component** inside `FocusModeView.tsx` (or as a separate small component). It receives `items`, `currentIndex`, `theme`, and `onNavigateItem`. It renders:
     - A scrollable list of condensed inbox item rows
     - Each row shows: session name (truncated), status dot (colored by state), unread indicator
     - The current item row has a highlighted background (`theme.colors.accent + '15'`)
     - Clicking a row calls `onNavigateItem(index)`
     - The list auto-scrolls to keep the current item visible

  2. **Condensed row format** — each row should be ~40px tall with:
     ```
     [status dot] agent-name · tab    [timestamp]
     ```
     Use the same `STATUS_COLORS` mapping and `formatRelativeTime` that InboxListView uses.
     If the item has `starred`, show a small ★.
     If the item has `hasUnread`, show a small accent-colored dot.

  3. **Layout change:** Wrap the FocusModeView body in a flex row:
     ```tsx
     <div className="flex flex-1" style={{ minHeight: 0 }}>
       {/* Sidebar */}
       <div className="flex-shrink-0 border-r overflow-y-auto" style={{
         width: 220,
         borderColor: theme.colors.border,
         backgroundColor: theme.colors.bgSidebar,
       }}>
         <FocusSidebar items={items} currentIndex={currentIndex} theme={theme} onNavigateItem={onNavigateItem} />
       </div>
       {/* Main content (existing body + reply) */}
       <div className="flex-1 flex flex-col" style={{ minWidth: 0, minHeight: 0 }}>
         {/* ... existing conversation body + reply input ... */}
       </div>
     </div>
     ```
     The header and footer remain full-width outside this flex row.

  4. **Auto-scroll sidebar** to keep the current item visible. Use a ref on the current item and `scrollIntoView({ block: 'nearest' })` when `currentIndex` changes.

- [x] **Run verification gate:** Execute `npx tsc --noEmit 2>&1 | head -20 && npx vitest run 2>&1 | tail -10`.
