import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { ArrowLeft, X, Bot, User, ArrowUp, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Theme, Session, LogEntry } from '../../types';
import type { InboxItem } from '../../types/agent-inbox';
import { STATUS_LABELS, STATUS_COLORS } from '../../types/agent-inbox';
import { resolveContextUsageColor } from './InboxListView';
import { formatRelativeTime } from '../../utils/formatters';

const MAX_LOG_ENTRIES = 20;
const MAX_LOG_TEXT_LENGTH = 500;

function truncateLogText(text: string): string {
	if (text.length <= MAX_LOG_TEXT_LENGTH) return text;
	return text.slice(0, MAX_LOG_TEXT_LENGTH) + '\n… (truncated)';
}

function LogBubble({ log, theme }: { log: LogEntry; theme: Theme }) {
	const isAI = log.source === 'ai';

	return (
		<div
			className="flex gap-2"
			style={{
				flexDirection: isAI ? 'row' : 'row-reverse',
			}}
		>
			{/* Source icon */}
			<div
				className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
				style={{
					backgroundColor: isAI ? `${theme.colors.accent}20` : `${theme.colors.success}20`,
				}}
			>
				{isAI ? (
					<Bot className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
				) : (
					<User className="w-3.5 h-3.5" style={{ color: theme.colors.success }} />
				)}
			</div>

			{/* Message content */}
			<div
				className="flex-1 rounded-lg px-3 py-2 text-sm"
				style={{
					backgroundColor: isAI ? `${theme.colors.bgActivity}80` : `${theme.colors.accent}10`,
					color: theme.colors.textMain,
					maxWidth: '85%',
				}}
			>
				{/* Text content — preserve whitespace for code */}
				<div
					style={{
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						fontSize: 13,
						lineHeight: 1.5,
					}}
				>
					{truncateLogText(log.text)}
				</div>

				{/* Timestamp */}
				<div className="text-xs mt-1" style={{ color: theme.colors.textDim, opacity: 0.7 }}>
					{formatRelativeTime(log.timestamp)}
				</div>
			</div>
		</div>
	);
}

interface FocusModeViewProps {
	theme: Theme;
	item: InboxItem;
	items: InboxItem[]; // Full filtered+sorted list for prev/next
	sessions: Session[]; // For accessing AITab.logs
	currentIndex: number; // Position of item in items[]
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

export default function FocusModeView({
	theme,
	item,
	items,
	sessions,
	currentIndex,
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

	// Compute conversation tail — last N AI/user log entries
	const logs = useMemo(() => {
		const session = sessions.find((s) => s.id === item.sessionId);
		if (!session) return [];
		const tab = session.aiTabs.find((t) => t.id === item.tabId);
		if (!tab) return [];
		// Filter to only show AI and user messages
		const relevant = tab.logs.filter((log) => log.source === 'ai' || log.source === 'user');
		// Take last N entries
		return relevant.slice(-MAX_LOG_ENTRIES);
	}, [sessions, item.sessionId, item.tabId]);

	// Auto-scroll to bottom when logs change or item changes
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [logs, item.sessionId, item.tabId]);

	// ---- Reply state ----
	const [replyText, setReplyText] = useState('');
	const replyInputRef = useRef<HTMLTextAreaElement>(null);

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
		// Auto-advance to next item after reply
		if (items.length > 1) {
			const nextIndex = (currentIndex + 1) % items.length;
			onNavigateItem(nextIndex);
		}
	}, [replyText, item, items, currentIndex, onQuickReply, onNavigateItem]);

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

	return (
		<div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
			{/* Header bar — 48px */}
			<div
				className="flex items-center px-4 border-b"
				style={{
					height: 48,
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

				{/* Center: Agent name + tab */}
				<div
					className="flex-1 flex items-center justify-center gap-1"
					style={{ overflow: 'hidden' }}
				>
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
							<span className="text-xs" style={{ color: theme.colors.textDim }}>·</span>
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

				{/* Mark Read button */}
				<button
					onClick={() => {
						if (onMarkAsRead) {
							onMarkAsRead(item.sessionId, item.tabId);
						}
						// Auto-advance after marking as read
						if (items.length > 1) {
							const nextIndex = (currentIndex + 1) % items.length;
							onNavigateItem(nextIndex);
						}
					}}
					className="text-xs px-2 py-1 rounded transition-colors"
					style={{
						border: `1px solid ${theme.colors.border}`,
						color: theme.colors.textDim,
						backgroundColor: 'transparent',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					title="Mark as read and advance (M)"
				>
					✓ Read
				</button>

				{/* Right: Close button */}
				<button
					onClick={onClose}
					className="p-1.5 rounded"
					style={{ color: theme.colors.textDim }}
					onMouseEnter={(e) =>
						(e.currentTarget.style.backgroundColor = `${theme.colors.accent}20`)
					}
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
					<span style={{ color: contextColor }}>
						Context: {item.contextUsage}%
					</span>
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
			</div>

			{/* Body — conversation tail */}
			{!sessionExists ? (
				<div className="flex-1 flex items-center justify-center" style={{ color: theme.colors.textDim }}>
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
					{logs.length === 0 ? (
						<div
							className="flex items-center justify-center h-full"
							style={{ color: theme.colors.textDim }}
						>
							<span className="text-sm">No conversation yet</span>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{logs.map((log) => (
								<LogBubble key={log.id} log={log} theme={theme} />
							))}
						</div>
					)}
				</div>
			)}

			{/* Reply input bar */}
			<div
				className="flex items-end gap-2 px-4 py-2 border-t"
				style={{ borderColor: theme.colors.border }}
			>
				<textarea
					ref={replyInputRef}
					value={replyText}
					onChange={(e) => setReplyText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
							e.preventDefault();
							handleQuickReply();
						} else if (e.key === 'Enter' && e.shiftKey) {
							e.preventDefault();
							handleOpenAndReply();
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
						backgroundColor: replyText.trim() ? theme.colors.accent : `${theme.colors.accent}30`,
						color: replyText.trim() ? theme.colors.accentForeground : theme.colors.textDim,
						cursor: replyText.trim() ? 'pointer' : 'default',
					}}
					title="Quick reply (Enter)"
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
						if (items.length > 1) e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					title="Previous item (←)"
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
						←→ Navigate · M Read · Esc Back
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
						if (items.length > 1) e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					title="Next item (→)"
				>
					Next
					<ChevronRight className="w-3 h-3" />
				</button>
			</div>
		</div>
	);
}
