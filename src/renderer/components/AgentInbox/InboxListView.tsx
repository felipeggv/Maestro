import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { List, type ListImperativeAPI } from 'react-window';
import { X, CheckCircle, ChevronDown, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import type { Theme, SessionState } from '../../types';
import type { InboxItem, InboxFilterMode, InboxSortMode } from '../../types/agent-inbox';
import { STATUS_LABELS, STATUS_COLORS } from '../../types/agent-inbox';
import { useListNavigation } from '../../hooks/keyboard/useListNavigation';
import { formatRelativeTime } from '../../utils/formatters';
import { formatShortcutKeys } from '../../utils/shortcutFormatter';
import { getModalActions } from '../../stores/modalStore';

interface InboxListViewProps {
	theme: Theme;
	items: InboxItem[];
	selectedIndex: number;
	setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
	filterMode: InboxFilterMode;
	setFilterMode: (mode: InboxFilterMode) => void;
	sortMode: InboxSortMode;
	setSortMode: (mode: InboxSortMode) => void;
	onClose: () => void;
	onNavigateToSession?: (sessionId: string, tabId?: string) => void;
	onEnterFocus: (item: InboxItem) => void;
	containerRef: React.RefObject<HTMLDivElement | null>;
	keyDownRef?: React.MutableRefObject<((e: React.KeyboardEvent) => void) | null>;
	isExpanded: boolean;
	onToggleExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
}

const ITEM_HEIGHT = 120;
const GROUP_HEADER_HEIGHT = 36;
const MODAL_HEADER_HEIGHT = 80;
const MODAL_FOOTER_HEIGHT = 36;

// ============================================================================
// Empty state messages per filter mode
// ============================================================================
const EMPTY_STATE_MESSAGES: Record<InboxFilterMode, { text: string; showIcon: boolean }> = {
	all: { text: 'All caught up — no sessions need attention.', showIcon: true },
	unread: { text: 'No unread sessions.', showIcon: false },
	read: { text: 'No read sessions with activity.', showIcon: false },
	starred: { text: 'No starred sessions.', showIcon: false },
};

// ============================================================================
// Grouped list model: interleaves group headers with items when sort = 'grouped'
// ============================================================================
type ListRow =
	| { type: 'header'; groupName: string }
	| { type: 'item'; item: InboxItem; index: number };

function buildRows(items: InboxItem[], sortMode: InboxSortMode): ListRow[] {
	if (sortMode !== 'grouped' && sortMode !== 'byAgent') {
		return items.map((item, index) => ({ type: 'item' as const, item, index }));
	}
	const rows: ListRow[] = [];
	let lastGroup: string | null = null;
	let itemIndex = 0;
	for (const item of items) {
		// For 'grouped': group by Left Bar group name
		// For 'byAgent': group by session/agent name
		const groupKey = sortMode === 'byAgent' ? item.sessionName : (item.groupName ?? 'Ungrouped');
		if (groupKey !== lastGroup) {
			rows.push({ type: 'header', groupName: groupKey });
			lastGroup = groupKey;
		}
		rows.push({ type: 'item', item, index: itemIndex });
		itemIndex++;
	}
	return rows;
}

// ============================================================================
// STATUS color resolver — maps STATUS_COLORS key to actual hex
// ============================================================================
function resolveStatusColor(state: SessionState, theme: Theme): string {
	const colorKey = STATUS_COLORS[state];
	const colorMap: Record<string, string> = {
		success: theme.colors.success,
		warning: theme.colors.warning,
		error: theme.colors.error,
		info: theme.colors.accent,
		textMuted: theme.colors.textDim,
	};
	return colorMap[colorKey] ?? theme.colors.textDim;
}

// ============================================================================
// Context usage color resolver — green/orange/red thresholds
// ============================================================================
export function resolveContextUsageColor(percentage: number, theme: Theme): string {
	if (percentage >= 80) return theme.colors.error;
	if (percentage >= 60) return theme.colors.warning;
	return theme.colors.success;
}

// ============================================================================
// InboxItemCard — rendered inside each row
// ============================================================================
function InboxItemCardContent({
	item,
	theme,
	isSelected,
	onClick,
}: {
	item: InboxItem;
	theme: Theme;
	isSelected: boolean;
	onClick: () => void;
}) {
	const statusColor = resolveStatusColor(item.state, theme);
	const hasValidContext = item.contextUsage !== undefined && !isNaN(item.contextUsage);
	const contextColor = hasValidContext
		? resolveContextUsageColor(item.contextUsage!, theme)
		: undefined;

	return (
		<div
			role="option"
			aria-selected={isSelected}
			id={`inbox-item-${item.sessionId}-${item.tabId}`}
			tabIndex={isSelected ? 0 : -1}
			onClick={onClick}
			style={{
				height: ITEM_HEIGHT - 12,
				borderRadius: 8,
				cursor: 'pointer',
				backgroundColor: isSelected ? `${theme.colors.accent}15` : 'transparent',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				overflow: 'hidden',
				position: 'relative',
			}}
			onFocus={(e) => {
				e.currentTarget.style.outline = `2px solid ${theme.colors.accent}`;
				e.currentTarget.style.outlineOffset = '-2px';
			}}
			onBlur={(e) => {
				e.currentTarget.style.outline = 'none';
			}}
		>
			{/* Card content */}
			<div
				style={{
					padding: '8px 12px',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					gap: 6,
					flex: 1,
				}}
			>
				{/* Row 1: GROUP | session | tab    timestamp */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
					{item.groupName && (
						<>
							<span
								style={{
									fontSize: 12,
									color: theme.colors.textDim,
									whiteSpace: 'nowrap',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								}}
							>
								{item.groupName}
							</span>
							<span style={{ fontSize: 12, color: theme.colors.textDim, padding: '0 6px' }}>|</span>
						</>
					)}
					<span
						style={{
							fontSize: 14,
							fontWeight: 600,
							color: theme.colors.textMain,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							flex: 1,
						}}
					>
						{item.sessionName}
						{item.tabName && (
							<>
								<span
									style={{
										fontSize: 12,
										color: theme.colors.textDim,
										padding: '0 6px',
										fontWeight: 400,
									}}
								>
									|
								</span>
								<span style={{ fontWeight: 400, color: theme.colors.textDim }}>{item.tabName}</span>
							</>
						)}
					</span>
					{item.starred && (
						<span style={{ color: theme.colors.warning, fontSize: 12, flexShrink: 0 }}>★</span>
					)}
					<span
						style={{
							fontSize: 12,
							color: theme.colors.textDim,
							whiteSpace: 'nowrap',
							flexShrink: 0,
						}}
					>
						{formatRelativeTime(item.timestamp)}
					</span>
				</div>

				{/* Row 2: last message (2-line clamp) */}
				<div
					style={{
						fontSize: 12,
						color: theme.colors.textDim,
						overflow: 'hidden',
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical' as const,
						lineHeight: '1.4',
					}}
				>
					{item.lastMessage}
				</div>

				{/* Row 3: badges */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					{item.gitBranch && (
						<span
							data-testid="git-branch-badge"
							style={{
								fontSize: 11,
								fontFamily: "'SF Mono', 'Menlo', monospace",
								padding: '1px 6px',
								borderRadius: 4,
								backgroundColor: `${theme.colors.accent}15`,
								color: theme.colors.accent,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								maxWidth: 200,
							}}
						>
							⎇ {item.gitBranch.length > 25 ? item.gitBranch.slice(0, 25) + '...' : item.gitBranch}
						</span>
					)}
					<span
						data-testid="context-usage-text"
						style={{
							fontSize: 11,
							color: hasValidContext ? contextColor : theme.colors.textDim,
						}}
					>
						{hasValidContext ? `Context: ${item.contextUsage}%` : 'Context: \u2014'}
					</span>
					<span
						style={{
							fontSize: 11,
							padding: '1px 8px',
							borderRadius: 10,
							backgroundColor: `${statusColor}20`,
							color: statusColor,
							whiteSpace: 'nowrap',
						}}
					>
						{STATUS_LABELS[item.state]}
					</span>
				</div>
			</div>

			{/* Context usage bar — 4px at bottom of card */}
			{hasValidContext && (
				<div
					data-testid="context-usage-bar"
					style={{
						height: 4,
						width: '100%',
						backgroundColor: `${theme.colors.border}40`,
						flexShrink: 0,
					}}
				>
					<div
						style={{
							height: '100%',
							width: `${Math.min(Math.max(item.contextUsage!, 0), 100)}%`,
							backgroundColor: contextColor,
							borderRadius: item.contextUsage! >= 100 ? 0 : '0 2px 2px 0',
							transition: 'width 0.3s ease',
						}}
					/>
				</div>
			)}
		</div>
	);
}

// ============================================================================
// SegmentedControl
// ============================================================================
interface SegmentedControlProps<T extends string> {
	options: { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
	theme: Theme;
	ariaLabel?: string;
}

function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	theme,
	ariaLabel,
}: SegmentedControlProps<T>) {
	return (
		<div
			aria-label={ariaLabel}
			style={{
				display: 'inline-flex',
				borderRadius: 6,
				border: `1px solid ${theme.colors.border}`,
				overflow: 'hidden',
			}}
		>
			{options.map((opt) => (
				<button
					key={opt.value}
					aria-pressed={value === opt.value}
					onClick={() => onChange(opt.value)}
					style={{
						padding: '4px 10px',
						fontSize: 12,
						border: 'none',
						cursor: 'pointer',
						transition: 'background 150ms',
						backgroundColor: value === opt.value ? theme.colors.accent : 'transparent',
						color: value === opt.value ? theme.colors.accentForeground : theme.colors.textDim,
						outline: 'none',
					}}
					onFocus={(e) => {
						e.currentTarget.style.outline = `2px solid ${theme.colors.accent}`;
						e.currentTarget.style.outlineOffset = '-2px';
					}}
					onBlur={(e) => {
						e.currentTarget.style.outline = 'none';
					}}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}

// ============================================================================
// Row component for react-window v2 List
// ============================================================================
interface RowExtraProps {
	rows: ListRow[];
	theme: Theme;
	selectedIndex: number;
	onNavigate: (item: InboxItem) => void;
	collapsedGroups: Set<string>;
	onToggleGroup: (groupName: string) => void;
	sortMode: InboxSortMode;
}

function InboxRow({
	index,
	style,
	rows,
	theme,
	selectedIndex,
	onNavigate,
	collapsedGroups,
	onToggleGroup,
	sortMode,
}: {
	ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
	index: number;
	style: React.CSSProperties;
} & RowExtraProps) {
	const row = rows[index];
	if (!row) return null;

	if (row.type === 'header') {
		const isCollapsed = collapsedGroups.has(row.groupName);

		// For byAgent mode: derive agent type label and unread count from subsequent rows
		let agentToolType: string | undefined;
		let unreadCount = 0;
		if (sortMode === 'byAgent') {
			for (let i = index + 1; i < rows.length; i++) {
				const r = rows[i];
				if (r.type === 'header') break;
				if (r.type === 'item') {
					if (!agentToolType) agentToolType = r.item.toolType;
					if (r.item.hasUnread) unreadCount++;
				}
			}
		}

		return (
			<div
				style={{
					...style,
					display: 'flex',
					alignItems: 'center',
					paddingLeft: 16,
					paddingRight: 16,
					fontSize: 13,
					fontWeight: 600,
					color: theme.colors.textDim,
					letterSpacing: '0.5px',
					textTransform: 'uppercase',
					borderBottom: `2px solid ${theme.colors.border}40`,
					borderLeft: `3px solid ${theme.colors.accent}40`,
					cursor: 'pointer',
				}}
				onClick={() => onToggleGroup(row.groupName)}
			>
				{isCollapsed ? (
					<ChevronRight style={{ width: 14, height: 14, marginRight: 4, flexShrink: 0 }} />
				) : (
					<ChevronDown style={{ width: 14, height: 14, marginRight: 4, flexShrink: 0 }} />
				)}
				{row.groupName}
				{sortMode === 'byAgent' && agentToolType && (
					<span
						style={{ fontSize: 11, color: theme.colors.textDim, fontWeight: 400, marginLeft: 4 }}
					>
						({agentToolType})
					</span>
				)}
				{sortMode === 'byAgent' && unreadCount > 0 && (
					<span
						style={{
							fontSize: 11,
							marginLeft: 'auto',
							padding: '1px 6px',
							borderRadius: 10,
							backgroundColor: theme.colors.warning + '20',
							color: theme.colors.warning,
						}}
					>
						{unreadCount} unread
					</span>
				)}
			</div>
		);
	}

	const isLastRow = index === rows.length - 1;
	const showNumber = row.index >= 0 && row.index < 10;
	const numberBadge = row.index === 9 ? 0 : row.index + 1;

	return (
		<div
			style={{
				...style,
				paddingLeft: 16,
				paddingRight: 16,
				paddingTop: 6,
				paddingBottom: 6,
				borderBottom: isLastRow ? undefined : `1px solid ${theme.colors.border}40`,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%' }}>
				{showNumber ? (
					<div
						className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
						style={{ backgroundColor: theme.colors.bgMain, color: theme.colors.textDim }}
						data-testid="number-badge"
					>
						{numberBadge}
					</div>
				) : (
					<div className="flex-shrink-0 w-5 h-5" />
				)}
				<div style={{ flex: 1, minWidth: 0 }}>
					<InboxItemCardContent
						item={row.item}
						theme={theme}
						isSelected={row.index === selectedIndex}
						onClick={() => onNavigate(row.item)}
					/>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// InboxListView Component
// ============================================================================
const SORT_OPTIONS: { value: InboxSortMode; label: string }[] = [
	{ value: 'newest', label: 'Newest' },
	{ value: 'oldest', label: 'Oldest' },
	{ value: 'grouped', label: 'Grouped' },
	{ value: 'byAgent', label: 'By Agent' },
];

const FILTER_OPTIONS: { value: InboxFilterMode; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'unread', label: 'Unread' },
	{ value: 'read', label: 'Read' },
	{ value: 'starred', label: '★ Starred' },
];

export default function InboxListView({
	theme,
	items,
	selectedIndex,
	setSelectedIndex,
	filterMode,
	setFilterMode,
	sortMode,
	setSortMode,
	onClose,
	onNavigateToSession,
	onEnterFocus,
	containerRef,
	keyDownRef,
	isExpanded,
	onToggleExpanded,
}: InboxListViewProps) {
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

	// Write state changes back to modalStore for persistence
	useEffect(() => {
		const { updateAgentInboxData } = getModalActions();
		updateAgentInboxData({ filterMode, sortMode, isExpanded });
	}, [filterMode, sortMode, isExpanded]);

	const toggleGroup = useCallback((groupName: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(groupName)) {
				next.delete(groupName);
			} else {
				next.add(groupName);
			}
			return next;
		});
	}, []);

	// Auto-collapse zero-unread agents in byAgent mode
	useEffect(() => {
		if (sortMode === 'byAgent') {
			// Compute which agents have zero unreads
			const agentUnreads = new Map<string, number>();
			for (const item of items) {
				const count = agentUnreads.get(item.sessionName) ?? 0;
				agentUnreads.set(item.sessionName, count + (item.hasUnread ? 1 : 0));
			}
			const toCollapse = new Set<string>();
			for (const [agent, count] of agentUnreads) {
				if (count === 0) toCollapse.add(agent);
			}
			setCollapsedGroups(toCollapse);
		} else {
			// Clear auto-collapsed state when leaving byAgent
			setCollapsedGroups(new Set());
		}
	}, [sortMode, items]);

	const allRows = useMemo(() => buildRows(items, sortMode), [items, sortMode]);
	const rows = useMemo(() => {
		if (collapsedGroups.size === 0) return allRows;
		return allRows.filter((row) => {
			if (row.type === 'header') return true;
			// For byAgent mode, collapse by sessionName; for grouped mode, by groupName
			const collapseKey =
				sortMode === 'byAgent' ? row.item.sessionName : (row.item.groupName ?? 'Ungrouped');
			return !collapsedGroups.has(collapseKey);
		});
	}, [allRows, collapsedGroups, sortMode]);

	// Auto-advance selectedIndex if current item is in a collapsed group
	useEffect(() => {
		if (collapsedGroups.size === 0) return;
		const selectedItem = items[selectedIndex];
		if (!selectedItem) return;
		const groupKey = sortMode === 'byAgent'
			? selectedItem.sessionName
			: (selectedItem.groupName ?? 'Ungrouped');
		if (collapsedGroups.has(groupKey)) {
			// Find next visible item after current index
			for (let i = selectedIndex + 1; i < items.length; i++) {
				const item = items[i];
				const key = sortMode === 'byAgent'
					? item.sessionName
					: (item.groupName ?? 'Ungrouped');
				if (!collapsedGroups.has(key)) {
					setSelectedIndex(i);
					return;
				}
			}
			// Wrap: find first visible item from start
			for (let i = 0; i < selectedIndex; i++) {
				const item = items[i];
				const key = sortMode === 'byAgent'
					? item.sessionName
					: (item.groupName ?? 'Ungrouped');
				if (!collapsedGroups.has(key)) {
					setSelectedIndex(i);
					return;
				}
			}
		}
	}, [collapsedGroups, items, selectedIndex, sortMode, setSelectedIndex]);

	// Ref to the virtualized list
	const listRef = useRef<ListImperativeAPI | null>(null);
	const headerRef = useRef<HTMLDivElement>(null);

	const handleNavigate = useCallback(
		(item: InboxItem) => {
			if (onNavigateToSession) {
				onNavigateToSession(item.sessionId, item.tabId);
			}
			onClose();
		},
		[onNavigateToSession, onClose]
	);

	// useListNavigation handles ArrowUp/Down, Enter, and Cmd/Ctrl+1-9 hotkeys
	const {
		selectedIndex: hookSelectedIndex,
		setSelectedIndex: hookSetSelectedIndex,
		handleKeyDown: listHandleKeyDown,
	} = useListNavigation({
		listLength: items.length,
		onSelect: (index: number) => {
			if (items[index]) handleNavigate(items[index]);
		},
		enableNumberHotkeys: true,
		firstVisibleIndex: 0,
		enabled: true,
		wrap: true,
	});

	// Sync useListNavigation's internal selectedIndex → lifted state
	useEffect(() => {
		setSelectedIndex(hookSelectedIndex);
	}, [hookSelectedIndex, setSelectedIndex]);

	// Sync lifted state → useListNavigation when parent changes it
	useEffect(() => {
		hookSetSelectedIndex(selectedIndex);
	}, [selectedIndex, hookSetSelectedIndex]);

	// Scroll to selected item
	useEffect(() => {
		if (listRef.current && rows.length > 0) {
			const rowIndex = findRowIndexForItem(selectedIndex);
			if (rowIndex >= 0) {
				listRef.current.scrollToRow({ index: rowIndex, align: 'smart' });
			}
		}
	}, [selectedIndex, rows]);

	// Map item index → row index (accounts for group headers)
	const findRowIndexForItem = useCallback(
		(itemIdx: number): number => {
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				if (row.type === 'item' && row.index === itemIdx) return i;
			}
			return 0;
		},
		[rows]
	);

	// Get the selected item's element ID for aria-activedescendant
	const selectedItemId = useMemo(() => {
		if (items.length === 0) return undefined;
		const item = items[selectedIndex];
		if (!item) return undefined;
		return `inbox-item-${item.sessionId}-${item.tabId}`;
	}, [items, selectedIndex]);

	// Collect focusable header elements for Tab cycling
	const getHeaderFocusables = useCallback((): HTMLElement[] => {
		if (!headerRef.current) return [];
		return Array.from(headerRef.current.querySelectorAll<HTMLElement>('button, [tabindex="0"]'));
	}, []);

	// Combined keyboard handler: useListNavigation for arrows/Enter/numbers + Tab cycling + F for focus
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			// Tab cycling is not handled by useListNavigation — handle it here
			if (e.key === 'Tab') {
				const focusables = getHeaderFocusables();
				if (focusables.length === 0) return;
				const active = document.activeElement;
				const focusIdx = focusables.indexOf(active as HTMLElement);

				if (e.shiftKey) {
					// Shift+Tab: go backwards
					if (focusIdx <= 0) {
						e.preventDefault();
						containerRef.current?.focus();
					} else {
						e.preventDefault();
						focusables[focusIdx - 1].focus();
					}
				} else {
					// Tab: go forwards
					if (focusIdx === -1) {
						e.preventDefault();
						focusables[0].focus();
					} else if (focusIdx >= focusables.length - 1) {
						e.preventDefault();
						containerRef.current?.focus();
					} else {
						e.preventDefault();
						focusables[focusIdx + 1].focus();
					}
				}
				return;
			}

			// T to toggle group collapse (only in grouped/byAgent sort modes)
			if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey) {
				if (sortMode === 'grouped' || sortMode === 'byAgent') {
					e.preventDefault();
					const selectedItem = items[selectedIndex];
					if (selectedItem) {
						const groupKey = sortMode === 'byAgent'
							? selectedItem.sessionName
							: (selectedItem.groupName ?? 'Ungrouped');
						toggleGroup(groupKey);
					}
				}
				return;
			}

			// Delegate to useListNavigation for arrows, Enter, Cmd/Ctrl+1-9
			listHandleKeyDown(e);
		},
		[getHeaderFocusables, listHandleKeyDown, containerRef, sortMode, items, selectedIndex, toggleGroup]
	);

	// Expose keyboard handler to shell via ref
	useEffect(() => {
		if (keyDownRef) keyDownRef.current = handleKeyDown;
		return () => {
			if (keyDownRef) keyDownRef.current = null;
		};
	}, [keyDownRef, handleKeyDown]);

	// Row height getter for variable-size rows
	const getRowHeight = useCallback(
		(index: number): number => {
			const row = rows[index];
			if (!row) return ITEM_HEIGHT;
			return row.type === 'header' ? GROUP_HEADER_HEIGHT : ITEM_HEIGHT;
		},
		[rows]
	);

	// Row props passed to react-window v2 List
	const rowProps: RowExtraProps = useMemo(
		() => ({
			rows,
			theme,
			selectedIndex,
			onNavigate: handleNavigate,
			collapsedGroups,
			onToggleGroup: toggleGroup,
			sortMode,
		}),
		[rows, theme, selectedIndex, handleNavigate, collapsedGroups, toggleGroup, sortMode]
	);

	// Calculate list height
	const listHeight = useMemo(() => {
		if (typeof window === 'undefined') return 400;
		if (isExpanded) {
			return Math.min(
				window.innerHeight * 0.85 - MODAL_HEADER_HEIGHT - MODAL_FOOTER_HEIGHT - 80,
				1000
			);
		}
		return Math.min(window.innerHeight * 0.8 - MODAL_HEADER_HEIGHT - MODAL_FOOTER_HEIGHT - 80, 700);
	}, [isExpanded]);

	const actionCount = items.length;

	return (
		<>
			{/* Header — 80px, two rows */}
			<div
				ref={headerRef}
				className="px-4 border-b"
				style={{
					height: MODAL_HEADER_HEIGHT,
					backgroundColor: theme.colors.bgSidebar,
					borderColor: theme.colors.border,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					gap: 8,
				}}
			>
				{/* Header row 1: title + badge + close */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<h2 className="text-base font-semibold" style={{ color: theme.colors.textMain }}>
							Unified Inbox
						</h2>
						<span
							aria-live="polite"
							className="text-xs px-2 py-0.5 rounded-full"
							style={{
								backgroundColor: `${theme.colors.accent}20`,
								color: theme.colors.accent,
							}}
						>
							{actionCount} need action
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => {
								if (items.length > 0 && items[selectedIndex]) {
									onEnterFocus(items[selectedIndex]);
								}
							}}
							disabled={items.length === 0}
							className="text-xs px-2.5 py-1 rounded transition-colors"
							style={{
								backgroundColor: items.length > 0 ? `${theme.colors.accent}15` : 'transparent',
								color: items.length > 0 ? theme.colors.accent : theme.colors.textDim,
								cursor: items.length > 0 ? 'pointer' : 'default',
								opacity: items.length === 0 ? 0.5 : 1,
							}}
							onMouseEnter={(e) => {
								if (items.length > 0) {
									e.currentTarget.style.backgroundColor = `${theme.colors.accent}25`;
								}
							}}
							onMouseLeave={(e) => {
								if (items.length > 0) {
									e.currentTarget.style.backgroundColor = `${theme.colors.accent}15`;
								}
							}}
							title="Enter Focus Mode (F)"
						>
							Focus ▶
						</button>
						<button
							onClick={() => onToggleExpanded((prev) => !prev)}
							className="p-1.5 rounded"
							style={{ color: theme.colors.textDim }}
							onMouseEnter={(e) =>
								(e.currentTarget.style.backgroundColor = `${theme.colors.accent}20`)
							}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
							title={isExpanded ? 'Collapse' : 'Expand'}
							aria-label={isExpanded ? 'Collapse modal' : 'Expand modal'}
						>
							{isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
						</button>
						<button
							onClick={onClose}
							className="p-1.5 rounded"
							style={{ color: theme.colors.textDim }}
							onMouseEnter={(e) =>
								(e.currentTarget.style.backgroundColor = `${theme.colors.accent}20`)
							}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
							onFocus={(e) => {
								e.currentTarget.style.outline = `2px solid ${theme.colors.accent}`;
							}}
							onBlur={(e) => {
								e.currentTarget.style.outline = 'none';
							}}
							title="Close (Esc)"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>
				{/* Header row 2: sort + filter controls */}
				<div className="flex items-center justify-between">
					<SegmentedControl
						options={SORT_OPTIONS}
						value={sortMode}
						onChange={setSortMode}
						theme={theme}
						ariaLabel="Sort sessions"
					/>
					<SegmentedControl
						options={FILTER_OPTIONS}
						value={filterMode}
						onChange={setFilterMode}
						theme={theme}
						ariaLabel="Filter sessions"
					/>
				</div>
			</div>

			{/* Body — virtualized list */}
			<div
				role="listbox"
				aria-activedescendant={selectedItemId}
				aria-label="Inbox items"
				style={{ flex: 1, overflow: 'hidden' }}
			>
				{rows.length === 0 ? (
					<div
						data-testid="inbox-empty-state"
						className="flex flex-col items-center justify-center gap-3"
						style={{ height: listHeight, color: theme.colors.textDim }}
					>
						{EMPTY_STATE_MESSAGES[filterMode].showIcon && (
							<CheckCircle
								data-testid="inbox-empty-icon"
								style={{
									width: 32,
									height: 32,
									color: theme.colors.textDim,
									opacity: 0.5,
								}}
							/>
						)}
						<span
							style={{
								fontSize: 14,
								color: theme.colors.textDim,
								maxWidth: 280,
								textAlign: 'center',
							}}
						>
							{EMPTY_STATE_MESSAGES[filterMode].text}
						</span>
					</div>
				) : (
					<List
						listRef={listRef}
						rowComponent={InboxRow}
						rowCount={rows.length}
						rowHeight={getRowHeight}
						rowProps={rowProps}
						style={{ height: listHeight }}
					/>
				)}
			</div>

			{/* Footer — 36px */}
			<div
				className="flex items-center justify-between px-4 py-2 border-t text-xs"
				style={{
					height: MODAL_FOOTER_HEIGHT,
					borderColor: theme.colors.border,
					color: theme.colors.textDim,
				}}
			>
				<span>{actionCount} items</span>
				<span>{`↑↓ navigate • ${(sortMode === 'grouped' || sortMode === 'byAgent') ? 'T collapse • ' : ''}F focus • Enter open • ${formatShortcutKeys(['Meta'])}1-9 quick select • Esc close`}</span>
			</div>
		</>
	);
}
