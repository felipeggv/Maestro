import { useState, useEffect, useRef, useCallback } from 'react';
import InboxListView from './InboxListView';
import FocusModeView from './FocusModeView';
import type { Theme, Session, Group } from '../../types';
import type {
	InboxItem,
	InboxViewMode,
	InboxFilterMode,
	InboxSortMode,
} from '../../types/agent-inbox';
import { useModalLayer } from '../../hooks/ui/useModalLayer';
import { MODAL_PRIORITIES } from '../../constants/modalPriorities';
import { useModalStore, selectModalData } from '../../stores/modalStore';
import { useAgentInbox } from '../../hooks/useAgentInbox';

// Re-export so existing test imports don't break
export { resolveContextUsageColor } from './InboxListView';

interface AgentInboxProps {
	theme: Theme;
	sessions: Session[];
	groups: Group[];
	enterToSendAI?: boolean;
	onClose: () => void;
	onNavigateToSession?: (sessionId: string, tabId?: string) => void;
	onQuickReply?: (sessionId: string, tabId: string, text: string) => void;
	onOpenAndReply?: (sessionId: string, tabId: string, text: string) => void;
	onMarkAsRead?: (sessionId: string, tabId: string) => void;
}

export default function AgentInbox({
	theme,
	sessions,
	groups,
	enterToSendAI,
	onClose,
	onNavigateToSession,
	onQuickReply,
	onOpenAndReply,
	onMarkAsRead,
}: AgentInboxProps) {
	// ---- Focus restoration ----
	// Capture trigger element synchronously during initial render (before child effects)
	const triggerRef = useRef<Element | null>(document.activeElement);
	const rafIdRef = useRef<number | null>(null);
	useEffect(() => {
		return () => {
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, []);

	const handleClose = useCallback(() => {
		onClose();
		rafIdRef.current = requestAnimationFrame(() => {
			rafIdRef.current = null;
			if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
				triggerRef.current.focus();
			}
		});
	}, [onClose]);

	// ---- View mode state ----
	const [viewMode, setViewMode] = useState<InboxViewMode>('list');
	const [focusIndex, setFocusIndex] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// ---- Filter/sort state (lifted from InboxListView for shared access) ----
	const inboxData = useModalStore(selectModalData('agentInbox'));
	const [filterMode, setFilterMode] = useState<InboxFilterMode>(inboxData?.filterMode ?? 'unread');
	const [sortMode, setSortMode] = useState<InboxSortMode>(inboxData?.sortMode ?? 'newest');

	// ---- Compute items at the shell level ----
	const items = useAgentInbox(sessions, groups, filterMode, sortMode);

	// ---- Edge case: items shrink while in focus mode ----
	useEffect(() => {
		if (viewMode === 'focus' && items.length > 0 && focusIndex >= items.length) {
			setFocusIndex(items.length - 1);
		}
		if (viewMode === 'focus' && items.length === 0) {
			handleExitFocus();
		}
	}, [items.length, focusIndex, viewMode]);

	const handleEnterFocus = useCallback(
		(item: InboxItem) => {
			const idx = items.findIndex((i) => i.sessionId === item.sessionId && i.tabId === item.tabId);
			setFocusIndex(idx >= 0 ? idx : 0);
			setViewMode('focus');
		},
		[items]
	);

	const handleExitFocus = useCallback(() => {
		setViewMode('list');
	}, []);

	// ---- Layer stack: viewMode-aware Escape ----
	const handleLayerEscape = useCallback(() => {
		if (viewMode === 'focus') {
			handleExitFocus();
		} else {
			handleClose();
		}
	}, [viewMode, handleExitFocus, handleClose]);

	useModalLayer(MODAL_PRIORITIES.AGENT_INBOX, 'Unified Inbox', handleLayerEscape);

	// ---- Container ref for keyboard focus ----
	const containerRef = useRef<HTMLDivElement>(null);

	// Auto-focus container on mount for immediate keyboard navigation
	useEffect(() => {
		const raf = requestAnimationFrame(() => {
			containerRef.current?.focus();
		});
		return () => cancelAnimationFrame(raf);
	}, []);

	// ---- Expanded state (lifted to shell for dialog width control) ----
	const [isExpanded, setIsExpanded] = useState(inboxData?.isExpanded ?? false);

	// ---- Compute dialog dimensions (focus mode or expanded → wide) ----
	const isWide = isExpanded || viewMode === 'focus';
	const expandedWidth = Math.min(
		typeof window !== 'undefined' ? window.innerWidth * 0.9 : 1200,
		1200
	);
	const dialogWidth = viewMode === 'focus' ? expandedWidth : isWide ? expandedWidth : 780;
	const dialogHeight = viewMode === 'focus' ? '80vh' : undefined;
	const dialogMaxHeight = viewMode === 'focus' ? undefined : isWide ? '90vh' : '80vh';

	// ---- Keyboard handler ref from InboxListView ----
	const listKeyDownRef = useRef<((e: React.KeyboardEvent) => void) | null>(null);

	// ---- Shell-level keydown: focus mode keys + list mode delegation ----
	const handleShellKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (viewMode === 'focus') {
				switch (e.key) {
					case 'Escape':
						e.preventDefault();
						e.stopPropagation();
						handleExitFocus();
						return;
					case 'ArrowLeft':
						if (e.metaKey || e.ctrlKey) {
							e.preventDefault();
							if (items.length > 1) {
								setFocusIndex((prev) => (prev - 1 + items.length) % items.length);
							}
						}
						return;
					case 'ArrowRight':
						if (e.metaKey || e.ctrlKey) {
							e.preventDefault();
							if (items.length > 1) {
								setFocusIndex((prev) => (prev + 1) % items.length);
							}
						}
						return;
					case 'Backspace':
					case 'b':
					case 'B':
						// Guard: only exit if NOT typing in the reply textarea
						if (document.activeElement?.tagName !== 'TEXTAREA') {
							e.preventDefault();
							handleExitFocus();
						}
						return;
				}
				// Let unrecognized keys propagate (don't consume them)
				return;
			}

			// List mode: F to enter focus
			if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) {
				e.preventDefault();
				if (items.length > 0 && items[selectedIndex]) {
					handleEnterFocus(items[selectedIndex]);
				}
				return;
			}

			// Delegate to InboxListView's keyboard handler in list mode
			if (viewMode === 'list' && listKeyDownRef.current) {
				listKeyDownRef.current(e);
			}
		},
		[viewMode, items, selectedIndex, focusIndex, handleEnterFocus, handleExitFocus]
	);

	return (
		<div
			className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] animate-in fade-in duration-150"
			onClick={handleClose}
		>
			<div
				ref={containerRef}
				tabIndex={-1}
				role="dialog"
				aria-modal="true"
				aria-label="Unified Inbox"
				className="rounded-xl shadow-2xl border overflow-hidden flex flex-col outline-none"
				style={{
					backgroundColor: theme.colors.bgActivity,
					borderColor: theme.colors.border,
					width: dialogWidth,
					maxWidth: '95vw',
					height: dialogHeight,
					maxHeight: dialogMaxHeight,
					transition: 'width 200ms ease, height 200ms ease, max-height 200ms ease',
				}}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={handleShellKeyDown}
			>
				<div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
					{viewMode === 'list' ? (
						<InboxListView
							theme={theme}
							items={items}
							selectedIndex={selectedIndex}
							setSelectedIndex={setSelectedIndex}
							filterMode={filterMode}
							setFilterMode={setFilterMode}
							sortMode={sortMode}
							setSortMode={setSortMode}
							onClose={handleClose}
							onNavigateToSession={onNavigateToSession}
							onEnterFocus={handleEnterFocus}
							containerRef={containerRef}
							keyDownRef={listKeyDownRef}
							isExpanded={isExpanded}
							onToggleExpanded={setIsExpanded}
						/>
					) : items[focusIndex] ? (
						<FocusModeView
							theme={theme}
							item={items[focusIndex]}
							items={items}
							sessions={sessions}
							currentIndex={focusIndex}
							enterToSendAI={enterToSendAI}
							filterMode={filterMode}
							setFilterMode={setFilterMode}
							sortMode={sortMode}
							onClose={handleClose}
							onExitFocus={handleExitFocus}
							onNavigateItem={setFocusIndex}
							onNavigateToSession={onNavigateToSession}
							onQuickReply={onQuickReply}
							onOpenAndReply={onOpenAndReply}
							onMarkAsRead={onMarkAsRead}
						/>
					) : (
						<div style={{ color: theme.colors.textDim, padding: 40, textAlign: 'center' }}>
							<span className="text-sm">No items to focus on</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
