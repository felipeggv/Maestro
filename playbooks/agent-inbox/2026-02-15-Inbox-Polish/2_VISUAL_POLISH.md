# Phase 2: Implement — Visual Polish (Modal + Cards + Pipes + Expand + Shortcuts)

## Context

- **Playbook:** Unified Inbox Polish
- **Agent:** maestro.app
- **Project:** /Users/felipegobbi/Documents/Vibework/Maestro
- **Loop:** 00001
- **Date:** 2026-02-15
- **Working Folder:** /Users/felipegobbi/Documents/Vibework/Maestro/playbooks/agent-inbox/2026-02-15-Inbox-Polish/

## Purpose

Increase modal width, increase card height with multi-line messages, replace Row 1 icons with flat pipe separators, add expand toggle, persist user preferences, and add numeric shortcuts. ALL patterns must match existing codebase conventions discovered via brownfield analysis — no invented components or styles.

## Key Paths

- **Component:** `src/renderer/components/AgentInbox.tsx`
- **Hook:** `src/renderer/hooks/useAgentInbox.ts`
- **Modal store:** `src/renderer/stores/modalStore.ts`
- **List navigation hook:** `src/renderer/hooks/keyboard/useListNavigation.ts` (NOTE: in `keyboard/` subdirectory)
- **QuickActionsModal (reference for number badges):** `src/renderer/components/QuickActionsModal.tsx`
- **TabSwitcherModal (reference for footer hints):** `src/renderer/components/TabSwitcherModal.tsx`
- **Shortcut formatter:** `src/renderer/utils/shortcutFormatter.ts` (for `formatShortcutKeys`)
- **Theme tokens:** `src/shared/themes.ts`

## Design System Reference (from brownfield)

```
FONT SIZES:    11px badges | 12px metadata/timestamps | 13px body | 14px titles
ICON SIZES:    w-3 h-3 small | w-4 h-4 standard | w-5 h-5 emphasis
CLOSE BUTTON:  p-1.5 rounded + JS hover (accent+20 bg) — this is the ACTUAL AgentInbox close button pattern
ACTION BUTTON: p-1 rounded hover:bg-white/10 transition-colors — used in AutoRunExpanded, BatchRunner
BADGE PILL:    fontSize: 11, padding: '1px 8px', borderRadius: 10, bg: statusColor+'20'
MONOSPACE:     'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace'
MODAL WIDTHS:  w-[600px] standard | w-[700px] data-heavy | w-[780px] settings | w-[1200px] max-w-[95vw] wide
               ALL modals use Tailwind w-[Npx] classes, NOT inline style={{ width: N }}
FOOTER HINTS:  px-4 py-2 border-t text-xs flex items-center justify-between | left: count | right: hints with ' • '
TRANSITIONS:   150ms buttons | 200ms modals | 300ms progress
NUMBER BADGES: w-5 h-5 rounded flex items-center justify-center text-xs font-bold | bgMain bg, textDim text
NUMBER HOTKEYS: Cmd/Ctrl+1-9,0 (Meta key required) — via useListNavigation hook with enableNumberHotkeys: true
```

---

## Task 1: Increase modal width and card height

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/components/AgentInbox.tsx`. Make three changes: (1) Find the constant `ITEM_HEIGHT = 100` (around line 21) and change it to `ITEM_HEIGHT = 120`. (2) Find the modal container div with class `w-[600px]` (around line 659). Change it to `w-[780px]` (same width as SettingsModal — verified in `SettingsModal.tsx:953`). Keep it as a Tailwind class, NOT inline style — every modal in the codebase uses `w-[Npx]` Tailwind classes. (3) Update the `listHeight` calculation (around line 643) — change the `600` max constraint to `700` so the taller cards have room: `Math.min(window.innerHeight * 0.8 - MODAL_HEADER_HEIGHT - MODAL_FOOTER_HEIGHT - 80, 700)`. Use TABS for indentation. Success criteria: `ITEM_HEIGHT` is 120, modal class is `w-[780px]`, listHeight max is 700.
    > ✅ Done. ITEM_HEIGHT=120, w-[780px], listHeight max=700. Test assertion updated (88px→108px). 99/99 tests pass.

## Task 2: Multi-line lastMessage display

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/components/AgentInbox.tsx`. Find the Row 2 div that displays `item.lastMessage` (around line 200-210). Currently it has `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'` which forces 1 line. Change this to support 3 lines: remove `whiteSpace: 'nowrap'` and `textOverflow: 'ellipsis'`, and add `display: '-webkit-box'`, `WebkitLineClamp: 3`, `WebkitBoxOrient: 'vertical' as const`, `overflow: 'hidden'`, `lineHeight: '1.4'`. This gives 3 lines of text with ellipsis on the last line (3 lines fits the 120px card height with room for Row 1 + Row 3). Also go to `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/hooks/useAgentInbox.ts` and change `MAX_MESSAGE_LENGTH` from `90` to `250` (line 5) so the hook passes enough text for 3 lines. Use TABS for indentation. Success criteria: lastMessage div uses `-webkit-box` with `WebkitLineClamp: 3`, and `MAX_MESSAGE_LENGTH` is 250.
    > ✅ Done. Row 2 uses `-webkit-box` with `WebkitLineClamp: 3`, `lineHeight: '1.4'`. MAX_MESSAGE_LENGTH=250. Test assertions updated (90→250). 139/139 tests pass.

## Task 3: Replace Row 1 with flat pipe separators (title bar style)

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/components/AgentInbox.tsx`. Find the Row 1 div inside `InboxItemCardContent` (around lines 143-197). Currently it shows: `groupName / (agent_icon) sessionName / (pencil_icon) tabName + timestamp`. Replace the entire Row 1 content with a flat pipe-separated format matching the Maestro title bar: `GROUPNAME | sessionName | tabName` with timestamp on the right. Specifically: (1) Remove the `getAgentIcon(item.toolType)` span (the robot emoji). (2) Remove the `<Edit3>` icon component from the tab name area. (3) Replace all `/` separator spans with `|` pipe characters, styled with `color: theme.colors.textDim, padding: '0 6px'`. (4) Make the groupName display in UPPERCASE using `textTransform: 'uppercase'` and `letterSpacing: '0.5px'`. (5) Keep the timestamp span on the right as-is. The result should look like: `WORKSPACE | vibework-chat | Vitascience Rename    2m ago`. Remove the `import { Edit3 }` from the lucide-react imports at the top of the file ONLY if Edit3 is not used elsewhere in the file (search first). Use TABS for indentation. Success criteria: Row 1 uses `|` pipes, no agent icon emoji, no Edit3 pencil icon, groupName is uppercase. The visual output matches the pattern `GROUP | session | tab    timestamp`.
    > ✅ Done. Row 1 now uses flat `|` pipe separators. Removed `Edit3` import and `getAgentIcon` import (both confirmed unused elsewhere). groupName has `textTransform: 'uppercase'` + `letterSpacing: '0.5px'`. Tests updated: separator assertions → `|`, agent icon test → verifies absence, tab name test → pipe check. 139/139 tests pass (99 component + 40 hook).

## Task 4: Add Normal ↔ Expanded toggle button

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/components/AgentInbox.tsx`. Add an expand/collapse toggle. Reference the Maximize2/Minimize2 usage in `AutoRun.tsx` (line 1645, expand button) and `AutoRunExpandedModal.tsx` (line 430, collapse button) for icon precedent.
    > ✅ Done. Expand toggle added before close button using Maximize2/Minimize2 icons. Normal mode: `w-[780px]`, maxHeight `80vh`. Expanded mode: `w-[1200px] max-w-[95vw]`, maxHeight `90vh`. Smooth 200ms transition via inline style. Button uses same `p-1.5 rounded` + JS hover pattern as close button. `isExpanded` state lives at top level of AgentInbox component. listHeight uses 700 max normal, 1000 max expanded. Tab cycle test updated (9→10 buttons). 9 new tests added. 148/148 tests pass (108 component + 40 hook).

**ARCHITECTURE NOTE:** The `isExpanded` state MUST live at the top level of the `AgentInbox` component (near `filterMode`, `sortMode`, `selectedIndex`), NOT inside any child component. Future Focus Mode will extract the list — `isExpanded` must stay in the parent shell.

Implementation: (1) Add `import { Maximize2, Minimize2 } from 'lucide-react'` to the existing lucide imports (these icons are already used in the codebase — `AutoRun.tsx` imports Maximize2, `AutoRunExpandedModal.tsx` imports Minimize2). (2) Add state: `const [isExpanded, setIsExpanded] = useState(false)`. (3) Find the modal container div with class `w-[780px]` (from Task 1). Make the class dynamic using a template literal: ``className={`${isExpanded ? 'w-[1200px] max-w-[95vw]' : 'w-[780px]'} rounded-xl shadow-2xl border overflow-hidden flex flex-col outline-none`}``. This follows the exact width pattern: `w-[1200px] max-w-[95vw]` is used by SymphonyModal, MarketplaceModal, and DirectorNotesModal for wide modals; `w-[780px]` matches SettingsModal for normal. Add `transition: 'width 200ms ease, max-height 200ms ease'` to the existing inline `style` object — keep width in Tailwind, use inline only for the transition animation. Also update `maxHeight` in the style: `maxHeight: isExpanded ? '90vh' : '80vh'`. (4) In the header row 1 (around line 682), add an expand toggle button BEFORE the close button. **Match the EXISTING close button pattern** already in the file (lines 698-715) — it uses `p-1.5 rounded` with JS `onMouseEnter`/`onMouseLeave` handlers for hover state, NOT CSS-only `hover:bg-white/10`:

```tsx
<button
	onClick={() => setIsExpanded((prev) => !prev)}
	className="p-1.5 rounded"
	style={{ color: theme.colors.textDim }}
	onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${theme.colors.accent}20`)}
	onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
	title={isExpanded ? 'Collapse' : 'Expand'}
	aria-label={isExpanded ? 'Collapse modal' : 'Expand modal'}
>
	{isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
</button>
```

This matches the close button's exact hover pattern (`accent+20` background via JS handlers). Do NOT use `hover:bg-white/10` — that's a different pattern used in other components, not in this modal's header. (5) Update the `listHeight` useMemo. Add `isExpanded` to dependency array. When expanded: `Math.min(window.innerHeight * 0.85 - MODAL_HEADER_HEIGHT - MODAL_FOOTER_HEIGHT - 80, 1000)`. When normal: keep the 700 max. Use TABS for indentation. Success criteria: expand button uses the same `p-1.5 rounded` + JS hover pattern as the close button, expanded modal uses `w-[1200px] max-w-[95vw]` (Tailwind class), normal uses `w-[780px]` (Tailwind class), smooth 200ms transition.

## Task 5: Persist filter/sort/expand selection across modal open/close

- [x] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/stores/modalStore.ts`. The real persistence pattern in Maestro is `modalData` — see `SettingsModalData` (around line 49) which persists `tab: SettingsTab` across open/close via `updateModalData('settings', { tab })`. Follow this exact pattern.
    > ✅ Done. Added `AgentInboxModalData` interface + `ModalDataMap` entry in modalStore.ts. `setAgentInboxOpen(true)` reads existing data or falls back to defaults. `setAgentInboxOpen(false)` closes without clearing data (preserves preferences). Added `updateAgentInboxData` helper. AgentInbox.tsx reads initial state from `selectModalData('agentInbox')` with fallbacks, and writes back via `useEffect` on `[filterMode, sortMode, isExpanded]`. 148/148 tests pass. Lint clean.

## Task 6: Add numeric shortcuts (Cmd/Ctrl+1-9) using existing useListNavigation hook

- [ ] Open `/Users/felipegobbi/Documents/Vibework/Maestro/src/renderer/components/AgentInbox.tsx`. The codebase has a `useListNavigation` hook at `src/renderer/hooks/keyboard/useListNavigation.ts` (NOTE: it's in the `keyboard/` subdirectory, NOT directly in `hooks/`). It handles Cmd/Ctrl+number hotkeys, arrow key navigation, and selection. It's used by QuickActionsModal (`QuickActionsModal.tsx:1356`) and TabSwitcherModal.

**Sub-change A: Import and use useListNavigation.** Import `useListNavigation` from `../hooks/keyboard/useListNavigation`. Replace the manual `handleKeyDown` arrow key and Enter logic with a call to this hook:

```typescript
const { selectedIndex, handleKeyDown: listHandleKeyDown } = useListNavigation({
	listLength: items.length,
	onSelect: (index: number) => {
		if (items[index]) handleNavigate(items[index]);
	},
	enableNumberHotkeys: true,
	firstVisibleIndex: 0,
	enabled: true,
});
```

Remove the manual `selectedIndex` useState and the manual ArrowUp/ArrowDown/Enter handlers. Keep the Tab cycling and Escape handling (those aren't in useListNavigation). Merge the hook's `listHandleKeyDown` with the remaining custom handlers in the component's `onKeyDown`.

**Sub-change B: Number badges on cards.** Follow the EXACT pattern from QuickActionsModal (`QuickActionsModal.tsx:1468-1502`). In `InboxRow`, before rendering `InboxItemCardContent`, add a number badge:

```tsx
const showNumber = row.index >= 0 && row.index < 10;
const numberBadge = row.index === 9 ? 0 : row.index + 1;

{
	showNumber ? (
		<div
			className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
			style={{ backgroundColor: theme.colors.bgMain, color: theme.colors.textDim }}
		>
			{numberBadge}
		</div>
	) : (
		<div className="flex-shrink-0 w-5 h-5" />
	);
}
```

This is the EXACT pattern from QuickActionsModal — `w-5 h-5 rounded`, `text-xs font-bold`, `bgMain`/`textDim` colors.

**Sub-change C: Update footer hints.** Change the footer to match the real pattern from TabSwitcherModal (`TabSwitcherModal.tsx:973-983`). The current footer uses `justify-center gap-6` with separate spans — change to `justify-between` with count on left and hints on right. Import `formatShortcutKeys` from `../utils/shortcutFormatter`. Replace the current footer:

```tsx
<div
	className="flex items-center justify-between px-4 py-2 border-t text-xs"
	style={{
		height: MODAL_FOOTER_HEIGHT,
		borderColor: theme.colors.border,
		color: theme.colors.textDim,
	}}
>
	<span>{actionCount} items</span>
	<span>{`↑↓ navigate • Enter open • ${formatShortcutKeys(['Meta'])}1-9 quick select • Esc close`}</span>
</div>
```

Use `•` (middle dot with spaces) as separator — this is the real TabSwitcherModal pattern. Left side shows count, right side shows hints. `formatShortcutKeys(['Meta'])` outputs `⌘` on macOS and `Ctrl` on Windows/Linux — platform-aware.

Use TABS for indentation. Success criteria: (1) `useListNavigation` hook from `keyboard/` subdir handles arrow keys + Cmd/Ctrl+number hotkeys. (2) number badges match QuickActionsModal pattern exactly (`w-5 h-5 rounded text-xs font-bold`). (3) footer matches TabSwitcherModal pattern (`justify-between`, count left, hints right, `•` separator, platform-aware shortcut). (4) `Cmd/Ctrl+1-9` selects and opens cards (Meta key required — bare digit keys do NOT trigger).
