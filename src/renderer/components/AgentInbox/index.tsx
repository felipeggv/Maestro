import React, { useState, useEffect, useRef, useCallback } from 'react';
import InboxListView from './InboxListView';
import type { Theme, Session, Group } from '../../types';
import type { InboxItem, InboxViewMode } from '../../types/agent-inbox';
import { useModalLayer } from '../../hooks/ui/useModalLayer';
import { MODAL_PRIORITIES } from '../../constants/modalPriorities';
import { useModalStore, selectModalData } from '../../stores/modalStore';

// Re-export so existing test imports don't break
export { resolveContextUsageColor } from './InboxListView';

interface AgentInboxProps {
	theme: Theme;
	sessions: Session[];
	groups: Group[];
	onClose: () => void;
	onNavigateToSession?: (sessionId: string, tabId?: string) => void;
}

export default function AgentInbox({
	theme,
	sessions,
	groups,
	onClose,
	onNavigateToSession,
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
	const [_focusItem, setFocusItem] = useState<InboxItem | null>(null);

	const handleEnterFocus = useCallback((item: InboxItem) => {
		setFocusItem(item);
		setViewMode('focus');
	}, []);

	const handleExitFocus = useCallback(() => {
		setFocusItem(null);
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

	// ---- Expanded state (lifted to shell for dialog width control) ----
	const inboxData = useModalStore(selectModalData('agentInbox'));
	const [isExpanded, setIsExpanded] = useState(inboxData?.isExpanded ?? false);

	// ---- Keyboard handler ref from InboxListView ----
	const listKeyDownRef = useRef<((e: React.KeyboardEvent) => void) | null>(null);

	// ---- Shell-level keydown: focus mode Escape + delegate to InboxListView ----
	const handleShellKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (viewMode === 'focus' && e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			handleExitFocus();
			return;
		}
		// Delegate to InboxListView's keyboard handler in list mode
		if (viewMode === 'list' && listKeyDownRef.current) {
			listKeyDownRef.current(e);
		}
	}, [viewMode, handleExitFocus]);

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
				className={`${isExpanded ? 'w-[1200px] max-w-[95vw]' : 'w-[780px]'} rounded-xl shadow-2xl border overflow-hidden flex flex-col outline-none`}
				style={{
					backgroundColor: theme.colors.bgActivity,
					borderColor: theme.colors.border,
					maxHeight: isExpanded ? '90vh' : '80vh',
					transition: 'width 200ms ease, max-height 200ms ease',
				}}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={handleShellKeyDown}
			>
				{viewMode === 'list' ? (
					<InboxListView
						theme={theme}
						sessions={sessions}
						groups={groups}
						onClose={handleClose}
						onNavigateToSession={onNavigateToSession}
						onEnterFocus={handleEnterFocus}
						containerRef={containerRef}
						keyDownRef={listKeyDownRef}
						isExpanded={isExpanded}
						onToggleExpanded={setIsExpanded}
					/>
				) : (
					<div style={{ color: theme.colors.textDim, padding: 40, textAlign: 'center' }}>
						Focus Mode placeholder — Phase 02
					</div>
				)}
			</div>
		</div>
	);
}
