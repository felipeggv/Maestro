import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
	ArrowLeft,
	X,
	Bot,
	User,
	ArrowUp,
	ExternalLink,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	Eye,
	Brain,
	FileText,
} from 'lucide-react';
import type { Theme, Session, LogEntry } from '../../types';
import type { InboxItem, InboxFilterMode, InboxSortMode } from '../../types/agent-inbox';
import { STATUS_LABELS, STATUS_COLORS } from '../../types/agent-inbox';
import { resolveContextUsageColor } from './InboxListView';
import { formatRelativeTime } from '../../utils/formatters';
import { MarkdownRenderer } from '../MarkdownRenderer';

const MAX_LOG_ENTRIES = 50;

function FocusLogEntry({
	log,
	theme,
	showRawMarkdown,
	onToggleRaw,
}: {
	log: LogEntry;
	theme: Theme;
	showRawMarkdown: boolean;
	onToggleRaw: () => void;
}) {
	const isUser = log.source === 'user';
	const isAI = log.source === 'ai' || log.source === 'stdout';
	const isThinking = log.source === 'thinking';
	const isTool = log.source === 'tool';

	// Thinking entry — left border accent + badge
	if (isThinking) {
		return (
			<div
				className="px-4 py-2 text-sm font-mono border-l-2"
				style={{
					color: theme.colors.textMain,
					borderColor: theme.colors.accent,
				}}
			>
				<div className="flex items-center gap-2 mb-1">
					<span
						className="text-[10px] px-1.5 py-0.5 rounded"
						style={{
							backgroundColor: `${theme.colors.accent}30`,
							color: theme.colors.accent,
						}}
					>
						thinking
					</span>
					<span className="text-xs" style={{ color: theme.colors.textDim, opacity: 0.7 }}>
						{formatRelativeTime(log.timestamp)}
					</span>
				</div>
				<div
					style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.5 }}
				>
					{log.text}
				</div>
			</div>
		);
	}

	// Tool entry — compact badge with status
	if (isTool) {
		const toolInput = (log.metadata as any)?.toolState?.input as
			| Record<string, unknown>
			| undefined;
		const safeStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
		const toolDetail = toolInput
			? safeStr(toolInput.command) ||
				safeStr(toolInput.pattern) ||
				safeStr(toolInput.file_path) ||
				safeStr(toolInput.query) ||
				safeStr(toolInput.description) ||
				safeStr(toolInput.prompt) ||
				safeStr(toolInput.task_id) ||
				null
			: null;
		const toolStatus = (log.metadata as any)?.toolState?.status as string | undefined;

		return (
			<div
				className="px-4 py-1.5 text-xs font-mono border-l-2"
				style={{
					color: theme.colors.textMain,
					borderColor: theme.colors.accent,
				}}
			>
				<div className="flex items-start gap-2">
					<span
						className="px-1.5 py-0.5 rounded shrink-0"
						style={{
							backgroundColor: `${theme.colors.accent}30`,
							color: theme.colors.accent,
						}}
					>
						{log.text}
					</span>
					{toolStatus === 'running' && (
						<span className="animate-pulse shrink-0 pt-0.5" style={{ color: theme.colors.warning }}>
							●
						</span>
					)}
					{toolStatus === 'completed' && (
						<span className="shrink-0 pt-0.5" style={{ color: theme.colors.success }}>
							✓
						</span>
					)}
					{toolDetail && (
						<span
							className="opacity-70 break-words whitespace-pre-wrap"
							style={{ color: theme.colors.textMain }}
						>
							{toolDetail}
						</span>
					)}
				</div>
			</div>
		);
	}

	// User entry — right-aligned with User icon
	if (isUser) {
		return (
			<div className="flex gap-2" style={{ flexDirection: 'row-reverse' }}>
				<div
					className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
					style={{ backgroundColor: `${theme.colors.success}20` }}
				>
					<User className="w-3.5 h-3.5" style={{ color: theme.colors.success }} />
				</div>
				<div
					className="flex-1 min-w-0 p-4 pb-10 rounded-xl border rounded-tr-none relative overflow-hidden text-sm"
					style={{
						backgroundColor: `color-mix(in srgb, ${theme.colors.accent} 20%, ${theme.colors.bgSidebar})`,
						borderColor: `${theme.colors.accent}40`,
						color: theme.colors.textMain,
						maxWidth: '85%',
					}}
				>
					<div
						style={{
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-word',
							fontSize: 13,
							lineHeight: 1.5,
						}}
					>
						{log.text}
					</div>
					<div
						className="absolute bottom-2 right-3 text-xs"
						style={{ color: theme.colors.textDim, opacity: 0.7 }}
					>
						{formatRelativeTime(log.timestamp)}
					</div>
				</div>
			</div>
		);
	}

	// AI / stdout entry — left-aligned with Bot icon + markdown
	if (isAI) {
		const handleCopy = (text: string) => {
			navigator.clipboard.writeText(text).catch(() => {});
		};

		return (
			<div className="flex gap-2 group">
				<div
					className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
					style={{ backgroundColor: `${theme.colors.accent}20` }}
				>
					<Bot className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
				</div>
				<div
					className="flex-1 min-w-0 p-4 pb-10 rounded-xl border rounded-tl-none relative overflow-hidden text-sm"
					style={{
						backgroundColor: theme.colors.bgActivity,
						borderColor: theme.colors.border,
						color: theme.colors.textMain,
					}}
				>
					{/* Raw/rendered toggle */}
					<div className="flex justify-end">
						<button
							onClick={onToggleRaw}
							className="p-1 rounded opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
							style={{ color: showRawMarkdown ? theme.colors.accent : theme.colors.textDim }}
							title={showRawMarkdown ? 'Show formatted' : 'Show plain text'}
						>
							{showRawMarkdown ? (
								<Eye className="w-3.5 h-3.5" />
							) : (
								<FileText className="w-3.5 h-3.5" />
							)}
						</button>
					</div>

					{showRawMarkdown ? (
						<div
							style={{
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
								fontSize: 13,
								lineHeight: 1.5,
							}}
						>
							{log.text}
						</div>
					) : (
						<MarkdownRenderer content={log.text} theme={theme} onCopy={handleCopy} />
					)}

					<div
						className="absolute bottom-2 right-3 text-xs"
						style={{ color: theme.colors.textDim, opacity: 0.7 }}
					>
						{formatRelativeTime(log.timestamp)}
					</div>
				</div>
			</div>
		);
	}

	// Fallback — should not reach here given the filter
	return null;
}

interface FocusModeViewProps {
	theme: Theme;
	item: InboxItem;
	items: InboxItem[]; // Full filtered+sorted list for prev/next
	sessions: Session[]; // For accessing AITab.logs
	currentIndex: number; // Position of item in items[]
	enterToSendAI?: boolean; // false = Cmd+Enter sends, true = Enter sends
	filterMode?: InboxFilterMode;
	setFilterMode?: (mode: InboxFilterMode) => void;
	sortMode?: InboxSortMode;
	onClose: () => void; // Close the entire modal
	onExitFocus: () => void; // Return to list view
	onNavigateItem: (index: number) => void; // Jump to item at index
	onNavigateToSession?: (sessionId: string, tabId?: string) => void;
	onQuickReply?: (sessionId: string, tabId: string, text: string) => void;
	onOpenAndReply?: (sessionId: string, tabId: string, text: string) => void;
	onMarkAsRead?: (sessionId: string, tabId: string) => void;
}

// Maps STATUS_COLORS key to actual hex from theme
function resolveStatusColor(state: InboxItem['state'], theme: Theme): string {
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
// Compact filter control for sidebar
// ============================================================================
const FILTER_OPTIONS: { value: InboxFilterMode; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'unread', label: 'Unread' },
	{ value: 'starred', label: '★' },
];

function SidebarFilter({
	value,
	onChange,
	theme,
}: {
	value: InboxFilterMode;
	onChange: (v: InboxFilterMode) => void;
	theme: Theme;
}) {
	return (
		<div
			className="flex"
			style={{
				borderRadius: 6,
				border: `1px solid ${theme.colors.border}`,
				overflow: 'hidden',
			}}
		>
			{FILTER_OPTIONS.map((opt) => (
				<button
					key={opt.value}
					onClick={() => onChange(opt.value)}
					style={{
						padding: '2px 8px',
						fontSize: 10,
						border: 'none',
						cursor: 'pointer',
						transition: 'background 150ms',
						backgroundColor: value === opt.value ? theme.colors.accent : 'transparent',
						color: value === opt.value ? theme.colors.accentForeground : theme.colors.textDim,
						outline: 'none',
					}}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}

// ============================================================================
// FocusSidebar — condensed navigable list of inbox items with agent grouping
// ============================================================================
function FocusSidebar({
	items,
	currentIndex,
	theme,
	sortMode,
	filterMode,
	setFilterMode,
	onNavigateItem,
}: {
	items: InboxItem[];
	currentIndex: number;
	theme: Theme;
	sortMode?: InboxSortMode;
	filterMode?: InboxFilterMode;
	setFilterMode?: (mode: InboxFilterMode) => void;
	onNavigateItem: (index: number) => void;
}) {
	const currentRowRef = useRef<HTMLDivElement>(null);
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

	// Auto-scroll to keep the current item visible
	useEffect(() => {
		currentRowRef.current?.scrollIntoView({ block: 'nearest' });
	}, [currentIndex]);

	// Build grouped rows when sort mode is byAgent or grouped
	const rows = useMemo(() => {
		const effectiveSort = sortMode ?? 'newest';
		if (effectiveSort !== 'grouped' && effectiveSort !== 'byAgent') {
			// Group by agent name by default in focus sidebar for better readability
			const result: (
				| { type: 'header'; groupName: string }
				| { type: 'item'; item: InboxItem; index: number }
			)[] = [];
			let lastAgent: string | null = null;
			items.forEach((itm, idx) => {
				if (itm.sessionName !== lastAgent) {
					result.push({ type: 'header', groupName: itm.sessionName });
					lastAgent = itm.sessionName;
				}
				result.push({ type: 'item', item: itm, index: idx });
			});
			return result;
		}
		// Use the sort mode's grouping logic
		const result: (
			| { type: 'header'; groupName: string }
			| { type: 'item'; item: InboxItem; index: number }
		)[] = [];
		let lastGroup: string | null = null;
		items.forEach((itm, idx) => {
			const groupKey =
				effectiveSort === 'byAgent' ? itm.sessionName : (itm.groupName ?? 'Ungrouped');
			if (groupKey !== lastGroup) {
				result.push({ type: 'header', groupName: groupKey });
				lastGroup = groupKey;
			}
			result.push({ type: 'item', item: itm, index: idx });
		});
		return result;
	}, [items, sortMode]);

	return (
		<div className="flex flex-col">
			{/* Filter control header */}
			{filterMode !== undefined && setFilterMode && (
				<div
					className="flex items-center justify-center px-2 py-2 border-b"
					style={{ borderColor: theme.colors.border }}
				>
					<SidebarFilter value={filterMode} onChange={setFilterMode} theme={theme} />
				</div>
			)}
			{/* Item list */}
			<div className="flex-1 overflow-y-auto py-1">
				{(() => {
					let activeGroup: string | null = null;
					return rows.map((row, rowIdx) => {
					if (row.type === 'header') {
						activeGroup = row.groupName;
						return (
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
						);
					}

					// Skip items in collapsed groups
					if (activeGroup && collapsedGroups.has(activeGroup)) return null;

					const itm = row.item;
					const idx = row.index;
					const isCurrent = idx === currentIndex;
					const statusColor = resolveStatusColor(itm.state, theme);

					return (
						<div
							key={`${itm.sessionId}-${itm.tabId}`}
							ref={isCurrent ? currentRowRef : undefined}
							onClick={() => onNavigateItem(idx)}
							className="flex items-center gap-2 px-3 cursor-pointer transition-colors"
							style={{
								height: 36,
								backgroundColor: isCurrent ? `${theme.colors.accent}15` : 'transparent',
								borderLeft: isCurrent
									? `2px solid ${theme.colors.accent}`
									: '2px solid transparent',
							}}
							onMouseEnter={(e) => {
								if (!isCurrent) e.currentTarget.style.backgroundColor = `${theme.colors.accent}08`;
							}}
							onMouseLeave={(e) => {
								if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent';
							}}
						>
							{/* Status dot */}
							<span
								className="flex-shrink-0"
								style={{
									width: 6,
									height: 6,
									borderRadius: '50%',
									backgroundColor: statusColor,
								}}
							/>
							{/* Tab name or session snippet */}
							<span
								className="flex-1 text-xs truncate"
								style={{
									color: isCurrent ? theme.colors.textMain : theme.colors.textDim,
									fontWeight: isCurrent ? 600 : 400,
								}}
							>
								{itm.tabName || 'Tab'}
							</span>
							{/* Indicators: starred + unread */}
							{itm.starred && (
								<span className="flex-shrink-0 text-xs" style={{ color: theme.colors.warning }}>
									★
								</span>
							)}
							{itm.hasUnread && (
								<span
									className="flex-shrink-0"
									style={{
										width: 6,
										height: 6,
										borderRadius: '50%',
										backgroundColor: theme.colors.accent,
									}}
								/>
							)}
						</div>
					);
				});
				})()}
			</div>
		</div>
	);
}

export default function FocusModeView({
	theme,
	item,
	items,
	sessions,
	currentIndex,
	enterToSendAI,
	filterMode,
	setFilterMode,
	sortMode,
	onClose,
	onExitFocus,
	onNavigateItem,
	onQuickReply,
	onOpenAndReply,
	onMarkAsRead,
}: FocusModeViewProps) {
	const statusColor = resolveStatusColor(item.state, theme);
	const hasValidContext = item.contextUsage !== undefined && !isNaN(item.contextUsage);
	const contextColor = hasValidContext
		? resolveContextUsageColor(item.contextUsage!, theme)
		: undefined;

	// Truncate helper
	const truncate = (str: string, max: number) =>
		str.length > max ? str.slice(0, max) + '...' : str;

	// Session existence check (session may be deleted while focus mode is open)
	const sessionExists = sessions.some((s) => s.id === item.sessionId);

	// ---- Thinking toggle state ----
	const [showThinking, setShowThinking] = useState(false);

	// ---- Raw markdown toggle (per-session, not per-log) ----
	const [showRawMarkdown, setShowRawMarkdown] = useState(false);

	// Compute conversation tail — last N renderable log entries
	const logs = useMemo(() => {
		const session = sessions.find((s) => s.id === item.sessionId);
		if (!session) return [];
		const tab = session.aiTabs.find((t) => t.id === item.tabId);
		if (!tab) return [];
		// Include all renderable log types
		const relevant = tab.logs.filter(
			(log) =>
				log.source === 'ai' ||
				log.source === 'stdout' ||
				log.source === 'user' ||
				log.source === 'thinking' ||
				log.source === 'tool'
		);
		// Take last N entries
		return relevant.slice(-MAX_LOG_ENTRIES);
	}, [sessions, item.sessionId, item.tabId]);

	// Filter out thinking/tool when toggle is off
	const visibleLogs = useMemo(() => {
		if (showThinking) return logs;
		return logs.filter((log) => log.source !== 'thinking' && log.source !== 'tool');
	}, [logs, showThinking]);

	// Auto-scroll to bottom when logs change or item changes
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [visibleLogs, item.sessionId, item.tabId]);

	// ---- Reply state ----
	const [replyText, setReplyText] = useState('');
	const replyInputRef = useRef<HTMLTextAreaElement>(null);

	// Auto-focus reply input when entering focus mode or switching items
	useEffect(() => {
		const timer = setTimeout(() => {
			replyInputRef.current?.focus();
		}, 200);
		return () => clearTimeout(timer);
	}, [item.sessionId, item.tabId]);

	// Reset reply text when item changes (prev/next navigation)
	useEffect(() => {
		setReplyText('');
	}, [item.sessionId, item.tabId]);

	const handleQuickReply = useCallback(() => {
		const text = replyText.trim();
		if (!text) return;
		if (onQuickReply) {
			onQuickReply(item.sessionId, item.tabId, text);
		}
		setReplyText('');
	}, [replyText, item, onQuickReply]);

	const handleOpenAndReply = useCallback(() => {
		const text = replyText.trim();
		if (!text) return;
		if (onOpenAndReply) {
			onOpenAndReply(item.sessionId, item.tabId, text);
		}
	}, [replyText, item, onOpenAndReply]);

	// ---- Smooth transition on item change ----
	const [isTransitioning, setIsTransitioning] = useState(false);
	const prevItemRef = useRef<string>(`${item.sessionId}-${item.tabId}`);

	useEffect(() => {
		const currentKey = `${item.sessionId}-${item.tabId}`;
		if (prevItemRef.current !== currentKey) {
			setIsTransitioning(true);
			const timer = setTimeout(() => setIsTransitioning(false), 150);
			prevItemRef.current = currentKey;
			return () => clearTimeout(timer);
		}
	}, [item.sessionId, item.tabId]);

	// Auto-mark as read when viewing an item in focus mode
	useEffect(() => {
		if (item.hasUnread && onMarkAsRead) {
			onMarkAsRead(item.sessionId, item.tabId);
		}
	}, [item.sessionId, item.tabId, item.hasUnread, onMarkAsRead]);

	return (
		<div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
			{/* Header bar — 48px */}
			<div
				className="flex items-center px-4 border-b"
				style={{
					height: 48,
					backgroundColor: theme.colors.bgSidebar,
					borderColor: theme.colors.border,
				}}
			>
				{/* Left: Back button */}
				<button
					aria-label="Return to inbox list"
					onClick={onExitFocus}
					className="flex items-center gap-1.5 text-sm font-medium"
					style={{
						background: 'transparent',
						border: 'none',
						cursor: 'pointer',
						color: theme.colors.textDim,
						padding: 0,
					}}
					onMouseEnter={(e) => (e.currentTarget.style.color = theme.colors.textMain)}
					onMouseLeave={(e) => (e.currentTarget.style.color = theme.colors.textDim)}
				>
					<ArrowLeft style={{ width: 16, height: 16 }} />
					<span>Inbox</span>
				</button>

				{/* Center: GROUP | Agent name · tab */}
				<div
					className="flex-1 flex items-center justify-center gap-1"
					style={{ overflow: 'hidden' }}
				>
					{item.groupName && (
						<>
							<span
								className="text-xs"
								style={{
									color: theme.colors.textDim,
									whiteSpace: 'nowrap',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								}}
							>
								{item.groupName}
							</span>
							<span className="text-xs" style={{ color: theme.colors.textDim, padding: '0 4px' }}>
								|
							</span>
						</>
					)}
					<span
						className="text-sm font-bold"
						style={{
							color: theme.colors.textMain,
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{truncate(item.sessionName, 30)}
					</span>
					{item.tabName && (
						<>
							<span className="text-xs" style={{ color: theme.colors.textDim }}>
								·
							</span>
							<span
								className="text-xs"
								style={{
									color: theme.colors.textDim,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{item.tabName}
							</span>
						</>
					)}
				</div>

				{/* Right: Close button */}
				<button
					onClick={onClose}
					className="p-1.5 rounded"
					style={{ color: theme.colors.textDim }}
					onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${theme.colors.accent}20`)}
					onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
					title="Close (Esc)"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Subheader info bar — 32px */}
			<div
				className="flex items-center justify-end px-4 gap-3 text-xs border-b"
				style={{
					height: 32,
					borderColor: theme.colors.border,
					backgroundColor: theme.colors.bgActivity,
				}}
			>
				{item.gitBranch && (
					<span
						className="px-1.5 py-0.5 rounded"
						style={{
							fontFamily: "'SF Mono', 'Menlo', monospace",
							backgroundColor: `${theme.colors.border}40`,
							color: theme.colors.textDim,
						}}
					>
						{truncate(item.gitBranch, 25)}
					</span>
				)}
				{hasValidContext && (
					<span style={{ color: contextColor }}>Context: {item.contextUsage}%</span>
				)}
				{item.starred && (
					<span style={{ color: theme.colors.warning, fontSize: 12 }}>★ Starred</span>
				)}
				<span
					style={{
						padding: '1px 8px',
						borderRadius: 10,
						backgroundColor: `${statusColor}20`,
						color: statusColor,
						whiteSpace: 'nowrap',
					}}
				>
					{STATUS_LABELS[item.state]}
				</span>
				{/* Thinking toggle pill */}
				<button
					onClick={() => setShowThinking((v) => !v)}
					className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full cursor-pointer transition-colors"
					style={{
						backgroundColor: showThinking ? `${theme.colors.accent}20` : 'transparent',
						color: showThinking ? theme.colors.accent : theme.colors.textDim,
						border: `1px solid ${showThinking ? theme.colors.accent + '40' : theme.colors.border}`,
					}}
					title={showThinking ? 'Hide thinking & tools' : 'Show thinking & tools'}
				>
					<Brain className="w-3 h-3" />
					Thinking
				</button>
			</div>

			{/* Two-column layout: sidebar + main content */}
			<div className="flex flex-1" style={{ minHeight: 0 }}>
				{/* Sidebar mini-list */}
				<div
					className="flex-shrink-0 border-r overflow-y-auto"
					style={{
						width: 220,
						borderColor: theme.colors.border,
						backgroundColor: theme.colors.bgSidebar,
					}}
					data-testid="focus-sidebar"
				>
					<FocusSidebar
						items={items}
						currentIndex={currentIndex}
						theme={theme}
						sortMode={sortMode}
						filterMode={filterMode}
						setFilterMode={setFilterMode}
						onNavigateItem={onNavigateItem}
					/>
				</div>

				{/* Main content: conversation body + reply input */}
				<div className="flex-1 flex flex-col" style={{ minWidth: 0, minHeight: 0 }}>
					{/* Body — conversation tail */}
					{!sessionExists ? (
						<div
							className="flex-1 flex items-center justify-center"
							style={{ color: theme.colors.textDim }}
						>
							<span className="text-sm">Session no longer available</span>
						</div>
					) : (
						<div
							ref={scrollRef}
							role="log"
							aria-label="Agent conversation"
							className="flex-1 overflow-y-auto px-4 py-3"
							style={{
								minHeight: 0,
								opacity: isTransitioning ? 0.3 : 1,
								transition: 'opacity 150ms ease',
							}}
						>
							{visibleLogs.length === 0 ? (
								<div
									className="flex items-center justify-center h-full"
									style={{ color: theme.colors.textDim }}
								>
									<span className="text-sm">No conversation yet</span>
								</div>
							) : (
								<div className="flex flex-col gap-3">
									{visibleLogs.map((log) => (
										<FocusLogEntry
											key={log.id}
											log={log}
											theme={theme}
											showRawMarkdown={showRawMarkdown}
											onToggleRaw={() => setShowRawMarkdown((v) => !v)}
										/>
									))}
								</div>
							)}
						</div>
					)}

					{/* Reply input bar */}
					<div
						className="flex items-center gap-2 px-4 py-2 border-t"
						style={{ borderColor: theme.colors.border }}
					>
						<textarea
							ref={replyInputRef}
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									if (enterToSendAI) {
										// Enter sends, Shift+Enter = Open & Reply
										if (!e.shiftKey && !e.metaKey) {
											e.preventDefault();
											handleQuickReply();
										} else if (e.shiftKey && !e.metaKey) {
											e.preventDefault();
											handleOpenAndReply();
										}
									} else {
										// Cmd+Enter sends, Shift+Enter = Open & Reply
										if (e.metaKey && !e.shiftKey) {
											e.preventDefault();
											handleQuickReply();
										} else if (e.shiftKey && !e.metaKey) {
											e.preventDefault();
											handleOpenAndReply();
										}
									}
									e.stopPropagation();
									return;
								}
								// CRITICAL: Prevent focus-mode keyboard shortcuts from firing while typing
								e.stopPropagation();
							}}
							placeholder="Reply to agent..."
							rows={1}
							aria-label="Reply to agent"
							className="flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none"
							style={{
								backgroundColor: theme.colors.bgActivity,
								color: theme.colors.textMain,
								border: `1px solid ${theme.colors.border}`,
								minHeight: 36,
								maxHeight: 80,
							}}
							onInput={(e) => {
								// Auto-resize textarea
								const target = e.target as HTMLTextAreaElement;
								target.style.height = 'auto';
								target.style.height = Math.min(target.scrollHeight, 80) + 'px';
							}}
						/>
						{/* Quick Reply button (primary) */}
						<button
							onClick={handleQuickReply}
							disabled={!replyText.trim()}
							className="p-2 rounded-lg transition-colors flex-shrink-0"
							style={{
								backgroundColor: replyText.trim()
									? theme.colors.accent
									: `${theme.colors.accent}30`,
								color: replyText.trim() ? theme.colors.accentForeground : theme.colors.textDim,
								cursor: replyText.trim() ? 'pointer' : 'default',
							}}
							title={enterToSendAI ? 'Quick reply (Enter)' : 'Quick reply (⌘Enter)'}
						>
							<ArrowUp className="w-4 h-4" />
						</button>
						{/* Open & Reply button (secondary) */}
						<button
							onClick={handleOpenAndReply}
							disabled={!replyText.trim()}
							className="p-1.5 rounded-lg transition-colors flex-shrink-0 text-xs"
							style={{
								border: `1px solid ${theme.colors.border}`,
								color: replyText.trim() ? theme.colors.textMain : theme.colors.textDim,
								backgroundColor: 'transparent',
								cursor: replyText.trim() ? 'pointer' : 'default',
								opacity: replyText.trim() ? 1 : 0.5,
							}}
							title="Open session & reply (Shift+Enter)"
						>
							<ExternalLink className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			</div>

			{/* Footer — 44px */}
			<div
				className="flex items-center justify-between px-4 border-t"
				style={{
					height: 44,
					borderColor: theme.colors.border,
				}}
			>
				{/* Prev button */}
				<button
					onClick={() => onNavigateItem((currentIndex - 1 + items.length) % items.length)}
					disabled={items.length <= 1}
					aria-disabled={items.length <= 1 ? 'true' : undefined}
					className="flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors"
					style={{
						border: `1px solid ${theme.colors.border}`,
						color: items.length > 1 ? theme.colors.textMain : theme.colors.textDim,
						backgroundColor: 'transparent',
						cursor: items.length > 1 ? 'pointer' : 'default',
						opacity: items.length <= 1 ? 0.4 : 1,
					}}
					onMouseEnter={(e) => {
						if (items.length > 1)
							e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					title="Previous item (⌘←)"
				>
					<ChevronLeft className="w-3 h-3" />
					Prev
				</button>

				{/* Center: counter + keyboard hints */}
				<div className="flex flex-col items-center gap-0.5">
					<span
						aria-live="polite"
						className="text-sm font-medium"
						style={{ color: theme.colors.textMain }}
					>
						{currentIndex + 1} / {items.length}
					</span>
					<span className="text-xs" style={{ color: theme.colors.textDim, opacity: 0.6 }}>
						⌘←→ Navigate · Esc Back
					</span>
				</div>

				{/* Next button */}
				<button
					onClick={() => onNavigateItem((currentIndex + 1) % items.length)}
					disabled={items.length <= 1}
					aria-disabled={items.length <= 1 ? 'true' : undefined}
					className="flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors"
					style={{
						border: `1px solid ${theme.colors.border}`,
						color: items.length > 1 ? theme.colors.textMain : theme.colors.textDim,
						backgroundColor: 'transparent',
						cursor: items.length > 1 ? 'pointer' : 'default',
						opacity: items.length <= 1 ? 0.4 : 1,
					}}
					onMouseEnter={(e) => {
						if (items.length > 1)
							e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					title="Next item (⌘→)"
				>
					Next
					<ChevronRight className="w-3 h-3" />
				</button>
			</div>
		</div>
	);
}
