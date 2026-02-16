import { ArrowLeft, X } from 'lucide-react';
import type { Theme, Session } from '../../types';
import type { InboxItem } from '../../types/agent-inbox';
import { STATUS_LABELS, STATUS_COLORS } from '../../types/agent-inbox';
import { resolveContextUsageColor } from './InboxListView';

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
	currentIndex,
	onClose,
	onExitFocus,
	onNavigateItem,
}: FocusModeViewProps) {
	const navDisabled = items.length <= 1;
	const statusColor = resolveStatusColor(item.state, theme);
	const hasValidContext = item.contextUsage !== undefined && !isNaN(item.contextUsage);
	const contextColor = hasValidContext
		? resolveContextUsageColor(item.contextUsage!, theme)
		: undefined;

	// Truncate helper
	const truncate = (str: string, max: number) =>
		str.length > max ? str.slice(0, max) + '...' : str;

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

			{/* Body — placeholder */}
			<div
				role="log"
				aria-label="Agent conversation"
				className="flex-1 flex items-center justify-center"
				style={{ color: theme.colors.textDim }}
			>
				<span className="text-sm">Conversation view — Phase 04</span>
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
					aria-disabled={navDisabled ? 'true' : undefined}
					disabled={navDisabled}
					onClick={() =>
						onNavigateItem((currentIndex - 1 + items.length) % items.length)
					}
					className="text-xs px-3 py-1 rounded"
					style={{
						border: `1px solid ${theme.colors.border}`,
						backgroundColor: 'transparent',
						color: navDisabled ? theme.colors.textDim : theme.colors.textMain,
						cursor: navDisabled ? 'default' : 'pointer',
						opacity: navDisabled ? 0.5 : 1,
					}}
					onMouseEnter={(e) => {
						if (!navDisabled) {
							e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
						}
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
				>
					← Prev
				</button>

				{/* Center: counter + keyboard hints */}
				<div className="flex flex-col items-center gap-0.5">
					<span
						aria-live="polite"
						className="text-xs"
						style={{ color: theme.colors.textDim }}
					>
						{currentIndex + 1} / {items.length}
					</span>
					<span
						className="text-xs"
						style={{ color: theme.colors.textDim, opacity: 0.7 }}
					>
						←→ Navigate · Esc Back
					</span>
				</div>

				{/* Next button */}
				<button
					aria-disabled={navDisabled ? 'true' : undefined}
					disabled={navDisabled}
					onClick={() =>
						onNavigateItem((currentIndex + 1) % items.length)
					}
					className="text-xs px-3 py-1 rounded"
					style={{
						border: `1px solid ${theme.colors.border}`,
						backgroundColor: 'transparent',
						color: navDisabled ? theme.colors.textDim : theme.colors.textMain,
						cursor: navDisabled ? 'default' : 'pointer',
						opacity: navDisabled ? 0.5 : 1,
					}}
					onMouseEnter={(e) => {
						if (!navDisabled) {
							e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
						}
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
				>
					Next →
				</button>
			</div>
		</div>
	);
}
