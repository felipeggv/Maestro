# INBOX-POLISH-02 — Navigation Clamp, Badge Label, Header Border, Number Badge Visibility

> **Scope:** `src/renderer/components/AgentInbox/InboxListView.tsx` + `src/renderer/components/AgentInbox/index.tsx` only. ZERO changes to FocusModeView.
> **Branch:** `feature/focus-mode`
> **Codebase:** `~/Documents/Vibework/Maestro`
> **Gate:** `npx tsc --noEmit 2>&1 | head -10 && npx vitest run src/__tests__/renderer/components/AgentInbox.test.tsx 2>&1 | tail -10`

---

## Issues

| ID | Severity | Summary |
|----|----------|---------|
| UX-1 | MEDIUM | Arrow navigation wraps from last to first and first to last — causes spatial confusion |
| UX-8 | MEDIUM | Focus Mode Cmd+Arrow wraps around — same confusion in focus mode |
| BUG-5 | LOW | Header badge says "N need action" regardless of filter — misleading for Read/Starred tabs |
| UX-2 | LOW | Group header left-border shows at 40% opacity on ALL headers — visual noise, selected indistinguishable |
| UX-5 | LOW | Number badges (Cmd+1-9) nearly invisible — bgMain blends into card background |

---

## UX-1 + UX-8: Arrow navigation wraps around instead of clamping

**Symptom:** Pressing ArrowDown on the last inbox row wraps to the first row. Pressing ArrowUp on the first row wraps to the last. In Focus Mode, Cmd+ArrowLeft/Right wraps similarly. Users lose spatial orientation because the list "jumps" unexpectedly.

**Root cause:**
- `InboxListView.tsx` line 715: `setSelectedRowIndex((prev) => (prev + 1) % rows.length)` — modulo causes wrap.
- `InboxListView.tsx` line 721: `setSelectedRowIndex((prev) => (prev - 1 + rows.length) % rows.length)` — same.
- `index.tsx` line 152: `setFocusIndex((prev) => (prev - 1 + items.length) % items.length)` — Cmd+ArrowLeft wraps.
- `index.tsx` line 160: `setFocusIndex((prev) => (prev + 1) % items.length)` — Cmd+ArrowRight wraps.

**Fix:** Replace modulo arithmetic with `Math.min`/`Math.max` clamping.

---

- [x] Invoke `/AIOS:agents:dev` to clamp arrow navigation. Two files need changes:

  **File 1: `src/renderer/components/AgentInbox/InboxListView.tsx`**

  In `handleKeyDown` callback, find the ArrowDown handler (around line 712-716). Change:

  ```typescript
  // BEFORE:
  if (e.key === 'ArrowDown') {
  	e.preventDefault();
  	if (rows.length === 0) return;
  	setSelectedRowIndex((prev) => (prev + 1) % rows.length);
  	return;
  }
  ```

  To:

  ```typescript
  // AFTER:
  if (e.key === 'ArrowDown') {
  	e.preventDefault();
  	if (rows.length === 0) return;
  	setSelectedRowIndex((prev) => Math.min(prev + 1, rows.length - 1));
  	return;
  }
  ```

  Then find the ArrowUp handler (around line 718-722). Change:

  ```typescript
  // BEFORE:
  if (e.key === 'ArrowUp') {
  	e.preventDefault();
  	if (rows.length === 0) return;
  	setSelectedRowIndex((prev) => (prev - 1 + rows.length) % rows.length);
  	return;
  }
  ```

  To:

  ```typescript
  // AFTER:
  if (e.key === 'ArrowUp') {
  	e.preventDefault();
  	if (rows.length === 0) return;
  	setSelectedRowIndex((prev) => Math.max(prev - 1, 0));
  	return;
  }
  ```

  **File 2: `src/renderer/components/AgentInbox/index.tsx`**

  In `handleShellKeyDown` callback, find the ArrowLeft case (around line 149-155). Change:

  ```typescript
  // BEFORE:
  case 'ArrowLeft':
  	if (e.metaKey || e.ctrlKey) {
  		e.preventDefault();
  		if (items.length > 1) {
  			setFocusIndex((prev) => (prev - 1 + items.length) % items.length);
  		}
  	}
  	return;
  ```

  To:

  ```typescript
  // AFTER:
  case 'ArrowLeft':
  	if (e.metaKey || e.ctrlKey) {
  		e.preventDefault();
  		if (items.length > 1) {
  			setFocusIndex((prev) => Math.max(prev - 1, 0));
  		}
  	}
  	return;
  ```

  Then find the ArrowRight case (around line 156-163). Change:

  ```typescript
  // BEFORE:
  case 'ArrowRight':
  	if (e.metaKey || e.ctrlKey) {
  		e.preventDefault();
  		if (items.length > 1) {
  			setFocusIndex((prev) => (prev + 1) % items.length);
  		}
  	}
  	return;
  ```

  To:

  ```typescript
  // AFTER:
  case 'ArrowRight':
  	if (e.metaKey || e.ctrlKey) {
  		e.preventDefault();
  		if (items.length > 1) {
  			setFocusIndex((prev) => Math.min(prev + 1, items.length - 1));
  		}
  	}
  	return;
  ```

---

## BUG-5: Badge "N need action" does not adapt to filter

**Symptom:** The header badge always says "5 need action" even when the user switches to the "Read" or "Starred" filter tab. "Need action" only makes sense for the default "All"/"Unread" view. For "Read", it should say "5 read". For "Starred", "5 starred".

**Root cause:** Line 857 of `InboxListView.tsx` has:
```tsx
{actionCount} need action
```
And line 997 (footer) has:
```tsx
{actionCount} items
```
Neither adapts to the active `filterMode`.

**Fix:** Build a filter-aware label.

---

- [x] Invoke `/AIOS:agents:dev` to fix the badge and footer labels. All changes in `src/renderer/components/AgentInbox/InboxListView.tsx`:

  **Step 1: Add a filter-aware label helper.** Insert this right before the `return` statement of `InboxListView` (just before `return (<>` around line 827):

  ```typescript
  // Filter-aware count label
  const countLabel = filterMode === 'unread'
  	? `${actionCount} unread`
  	: filterMode === 'starred'
  		? `${actionCount} starred`
  		: filterMode === 'read'
  			? `${actionCount} read`
  			: `${actionCount} need action`;
  ```

  **Step 2: Update the header badge.** Find the badge `<span>` in the header (around line 849-858). Replace:

  ```tsx
  {actionCount} need action
  ```

  With:

  ```tsx
  {countLabel}
  ```

  **Step 3: Update the footer.** Find the footer `<span>` (around line 997). Replace:

  ```tsx
  <span>{actionCount} items</span>
  ```

  With:

  ```tsx
  <span>{countLabel}</span>
  ```

---

## UX-2: Header left-border shows on ALL headers (visual noise)

**Symptom:** Every group header has a semi-transparent accent border on the left (`3px solid accent+40`). This makes all headers look "selected", diluting the visual signal of the actually-selected header.

**Root cause:** Line 421 of `InboxListView.tsx`:
```typescript
borderLeft: `3px solid ${isRowSelected ? theme.colors.accent : theme.colors.accent + '40'}`,
```
The non-selected state uses `accent + '40'` (40% opacity) instead of transparent.

**Fix:** Use transparent for non-selected headers.

---

- [x] Invoke `/AIOS:agents:dev` to fix the header border. In `src/renderer/components/AgentInbox/InboxListView.tsx`, find the group header style block in `InboxRow` (around line 421). Replace:

  ```typescript
  borderLeft: `3px solid ${isRowSelected ? theme.colors.accent : theme.colors.accent + '40'}`,
  ```

  With:

  ```typescript
  borderLeft: isRowSelected ? `3px solid ${theme.colors.accent}` : '3px solid transparent',
  ```

---

## UX-5: Number badges nearly invisible

**Symptom:** The Cmd+1-9 number badges on each card are styled with `backgroundColor: theme.colors.bgMain` and `color: theme.colors.textDim`, but no border. In most themes, `bgMain` is close to the card background, making the badges nearly invisible.

**Root cause:** Line 477 of `InboxListView.tsx`:
```typescript
style={{ backgroundColor: theme.colors.bgMain, color: theme.colors.textDim }}
```
No `border` property.

**Fix:** Add a visible border using the theme's border color.

---

- [x] Invoke `/AIOS:agents:dev` to fix number badge visibility. In `src/renderer/components/AgentInbox/InboxListView.tsx`, find the number badge `div` (around line 476-478). Replace the style:

  ```typescript
  style={{ backgroundColor: theme.colors.bgMain, color: theme.colors.textDim }}
  ```

  With:

  ```typescript
  style={{
  	backgroundColor: theme.colors.bgMain,
  	color: theme.colors.textDim,
  	border: `1px solid ${theme.colors.border}`,
  }}
  ```

  This adds a subtle border that makes the badge pop against any card background without being visually heavy.

---

## Gate

- [x] Invoke `/AIOS:agents:dev` to run the gate check: `npx tsc --noEmit 2>&1 | head -10 && npx vitest run src/__tests__/renderer/components/AgentInbox.test.tsx 2>&1 | tail -10`. Fix any type errors or test failures before completing.
  > Gate passed: tsc clean (no errors in modified files), 148/148 AgentInbox tests + 48/48 FocusModeView tests pass.
