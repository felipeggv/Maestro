/**
 * @fileoverview Comprehensive tests for FocusModeView component
 * Covers: rendering, conversation logs, reply input, mark as read,
 * navigation, ARIA attributes, and edge cases.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FocusModeView from '../../../renderer/components/AgentInbox/FocusModeView';
import type { Theme, Session } from '../../../renderer/types';
import type { InboxItem } from '../../../renderer/types/agent-inbox';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
	ArrowLeft: ({ style }: { style?: React.CSSProperties }) => (
		<span data-testid="arrow-left-icon" style={style}>←</span>
	),
	X: ({ className }: { className?: string }) => (
		<span data-testid="x-icon" className={className}>×</span>
	),
	Bot: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
		<span data-testid="bot-icon" className={className} style={style}>🤖</span>
	),
	User: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
		<span data-testid="user-icon" className={className} style={style}>👤</span>
	),
	ArrowUp: ({ className }: { className?: string }) => (
		<span data-testid="arrow-up-icon" className={className}>↑</span>
	),
	ExternalLink: ({ className }: { className?: string }) => (
		<span data-testid="external-link-icon" className={className}>↗</span>
	),
	ChevronLeft: ({ className }: { className?: string }) => (
		<span data-testid="chevron-left-icon" className={className}>‹</span>
	),
	ChevronRight: ({ className }: { className?: string }) => (
		<span data-testid="chevron-right-icon" className={className}>›</span>
	),
}));

// Mock formatRelativeTime
vi.mock('../../../renderer/utils/formatters', () => ({
	formatRelativeTime: () => '5m ago',
}));

// ============================================================================
// Test factories
// ============================================================================
function createTheme(): Theme {
	return {
		id: 'dracula',
		name: 'Dracula',
		mode: 'dark',
		colors: {
			bgMain: '#282a36',
			bgSidebar: '#21222c',
			bgActivity: '#1e1f29',
			textMain: '#f8f8f2',
			textDim: '#6272a4',
			accent: '#bd93f9',
			accentDim: '#bd93f933',
			accentText: '#bd93f9',
			accentForeground: '#ffffff',
			border: '#44475a',
			success: '#50fa7b',
			warning: '#f1fa8c',
			error: '#ff5555',
		},
	};
}

function createItem(overrides: Partial<InboxItem> = {}): InboxItem {
	return {
		sessionId: 'session-1',
		tabId: 'tab-1',
		sessionName: 'Test Agent',
		toolType: 'claude-code',
		lastMessage: 'Hello world',
		timestamp: Date.now(),
		state: 'idle',
		hasUnread: true,
		gitBranch: 'main',
		contextUsage: 45,
		...overrides,
	};
}

function createSession(sessionId: string, tabId: string, logs: any[] = []): Session {
	return {
		id: sessionId,
		aiTabs: [{ id: tabId, logs }],
	} as unknown as Session;
}

function renderFocusView(overrides: {
	items?: InboxItem[];
	currentIndex?: number;
	sessions?: Session[];
	onClose?: ReturnType<typeof vi.fn>;
	onExitFocus?: ReturnType<typeof vi.fn>;
	onQuickReply?: ReturnType<typeof vi.fn>;
	onOpenAndReply?: ReturnType<typeof vi.fn>;
	onMarkAsRead?: ReturnType<typeof vi.fn>;
	onNavigateItem?: ReturnType<typeof vi.fn>;
	onNavigateToSession?: ReturnType<typeof vi.fn>;
} = {}) {
	const item = createItem();
	const items = overrides.items ?? [item];
	const currentIndex = overrides.currentIndex ?? 0;
	const currentItem = items[currentIndex];
	const sessions = overrides.sessions ?? [createSession(currentItem.sessionId, currentItem.tabId)];
	const onNavigateItem = overrides.onNavigateItem ?? vi.fn();
	const onClose = overrides.onClose ?? vi.fn();
	const onExitFocus = overrides.onExitFocus ?? vi.fn();

	return render(
		<FocusModeView
			theme={createTheme()}
			item={currentItem}
			items={items}
			sessions={sessions}
			currentIndex={currentIndex}
			onClose={onClose}
			onExitFocus={onExitFocus}
			onNavigateItem={onNavigateItem}
			onNavigateToSession={overrides.onNavigateToSession}
			onQuickReply={overrides.onQuickReply}
			onOpenAndReply={overrides.onOpenAndReply}
			onMarkAsRead={overrides.onMarkAsRead}
		/>
	);
}

// ============================================================================
// Rendering tests
// ============================================================================
describe('FocusModeView (rendering)', () => {
	it('1. renders header with agent name and counter', () => {
		renderFocusView({
			items: [
				createItem({ sessionId: 's1', tabId: 't1' }),
				createItem({ sessionId: 's2', tabId: 't2', sessionName: 'Agent 2' }),
				createItem({ sessionId: 's3', tabId: 't3', sessionName: 'Agent 3' }),
			],
			currentIndex: 0,
		});
		expect(screen.getByText('Test Agent')).toBeDefined();
		expect(screen.getByText('1 / 3')).toBeDefined();
	});

	it('2. renders back button that calls onExitFocus', () => {
		const onExitFocus = vi.fn();
		renderFocusView({ onExitFocus });
		const backButton = screen.getByLabelText('Return to inbox list');
		fireEvent.click(backButton);
		expect(onExitFocus).toHaveBeenCalledTimes(1);
	});

	it('3. renders subheader with git branch', () => {
		renderFocusView({
			items: [createItem({ gitBranch: 'feature/my-branch' })],
		});
		expect(screen.getByText('feature/my-branch')).toBeDefined();
	});

	it('4. renders subheader without git branch', () => {
		renderFocusView({
			items: [createItem({ gitBranch: undefined })],
		});
		// Should not find any branch badge — the "main" branch text from default is overridden
		expect(screen.queryByText('main')).toBeNull();
	});

	it('5. renders context usage with correct color (error for 85%)', () => {
		renderFocusView({
			items: [createItem({ contextUsage: 85 })],
		});
		const contextEl = screen.getByText('Context: 85%');
		// 85% should use error color — JSDOM converts hex to rgb()
		expect(contextEl.style.color).toBe('rgb(255, 85, 85)');
	});

	it('5b. renders context usage with correct color (warning for 65%)', () => {
		renderFocusView({
			items: [createItem({ contextUsage: 65 })],
		});
		const contextEl = screen.getByText('Context: 65%');
		expect(contextEl.style.color).toBe('rgb(241, 250, 140)');
	});

	it('5c. renders context usage with correct color (success for 30%)', () => {
		renderFocusView({
			items: [createItem({ contextUsage: 30 })],
		});
		const contextEl = screen.getByText('Context: 30%');
		expect(contextEl.style.color).toBe('rgb(80, 250, 123)');
	});

	it('6. renders status pill with correct label', () => {
		renderFocusView({
			items: [createItem({ state: 'waiting_input' })],
		});
		expect(screen.getByText('Needs Input')).toBeDefined();
	});

	it('6b. renders status pill "Ready" for idle state', () => {
		renderFocusView({
			items: [createItem({ state: 'idle' })],
		});
		expect(screen.getByText('Ready')).toBeDefined();
	});
});

// ============================================================================
// Conversation tests
// ============================================================================
describe('FocusModeView (conversation)', () => {
	it('7. renders conversation log entries', () => {
		const logs = [
			{ id: 'l1', timestamp: 1000, source: 'ai', text: 'Hello from AI' },
			{ id: 'l2', timestamp: 2000, source: 'user', text: 'User reply here' },
		];
		renderFocusView({
			items: [createItem({ sessionId: 's1', tabId: 't1' })],
			sessions: [createSession('s1', 't1', logs)],
		});
		expect(screen.getByText('Hello from AI')).toBeDefined();
		expect(screen.getByText('User reply here')).toBeDefined();
	});

	it('8. filters out system/tool/thinking log entries', () => {
		const logs = [
			{ id: 'l1', timestamp: 1000, source: 'ai', text: 'Visible AI message' },
			{ id: 'l2', timestamp: 2000, source: 'system', text: 'System log hidden' },
			{ id: 'l3', timestamp: 3000, source: 'tool', text: 'Tool log hidden' },
			{ id: 'l4', timestamp: 4000, source: 'user', text: 'Visible user message' },
		];
		renderFocusView({
			items: [createItem({ sessionId: 's1', tabId: 't1' })],
			sessions: [createSession('s1', 't1', logs)],
		});
		expect(screen.getByText('Visible AI message')).toBeDefined();
		expect(screen.getByText('Visible user message')).toBeDefined();
		expect(screen.queryByText('System log hidden')).toBeNull();
		expect(screen.queryByText('Tool log hidden')).toBeNull();
	});

	it('9. shows empty state when no logs', () => {
		renderFocusView({
			items: [createItem({ sessionId: 's1', tabId: 't1' })],
			sessions: [createSession('s1', 't1', [])],
		});
		expect(screen.getByText('No conversation yet')).toBeDefined();
	});

	it('10. truncates long log text', () => {
		const longText = 'A'.repeat(600);
		const logs = [
			{ id: 'l1', timestamp: 1000, source: 'ai', text: longText },
		];
		renderFocusView({
			items: [createItem({ sessionId: 's1', tabId: 't1' })],
			sessions: [createSession('s1', 't1', logs)],
		});
		// Should contain truncated marker
		expect(screen.getByText(/… \(truncated\)/)).toBeDefined();
		// Should NOT contain full 600 char string
		expect(screen.queryByText(longText)).toBeNull();
	});

	it('11. shows Bot icon for AI messages', () => {
		const logs = [
			{ id: 'l1', timestamp: 1000, source: 'ai', text: 'AI message' },
		];
		renderFocusView({
			items: [createItem({ sessionId: 's1', tabId: 't1' })],
			sessions: [createSession('s1', 't1', logs)],
		});
		expect(screen.getByTestId('bot-icon')).toBeDefined();
	});

	it('12. shows User icon for user messages', () => {
		const logs = [
			{ id: 'l1', timestamp: 1000, source: 'user', text: 'User message' },
		];
		renderFocusView({
			items: [createItem({ sessionId: 's1', tabId: 't1' })],
			sessions: [createSession('s1', 't1', logs)],
		});
		expect(screen.getByTestId('user-icon')).toBeDefined();
	});
});

// ============================================================================
// Reply input tests
// ============================================================================
describe('FocusModeView (reply)', () => {
	it('13. renders reply textarea with aria-label', () => {
		renderFocusView();
		const textarea = screen.getByPlaceholderText('Reply to agent...');
		expect(textarea).toBeDefined();
		expect(textarea.getAttribute('aria-label')).toBe('Reply to agent');
	});

	it('14. quick reply button disabled when empty', () => {
		renderFocusView();
		const sendButton = screen.getByTitle('Quick reply (Enter)');
		expect(sendButton.closest('button')?.disabled).toBe(true);
	});

	it('15. calls onQuickReply on Enter', () => {
		const onQuickReply = vi.fn();
		renderFocusView({ onQuickReply });

		const textarea = screen.getByPlaceholderText('Reply to agent...');
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false, metaKey: false });

		expect(onQuickReply).toHaveBeenCalledWith('session-1', 'tab-1', 'hello');
	});

	it('16. calls onOpenAndReply on Shift+Enter', () => {
		const onOpenAndReply = vi.fn();
		renderFocusView({ onOpenAndReply });

		const textarea = screen.getByPlaceholderText('Reply to agent...');
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

		expect(onOpenAndReply).toHaveBeenCalledWith('session-1', 'tab-1', 'hello');
	});

	it('17. clears input after quick reply', () => {
		const onQuickReply = vi.fn();
		renderFocusView({ onQuickReply });

		const textarea = screen.getByPlaceholderText('Reply to agent...') as HTMLTextAreaElement;
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false, metaKey: false });

		expect(textarea.value).toBe('');
	});

	it('18. auto-advances after quick reply', () => {
		const onQuickReply = vi.fn();
		const onNavigateItem = vi.fn();
		renderFocusView({
			items: [
				createItem({ sessionId: 's1', tabId: 't1' }),
				createItem({ sessionId: 's2', tabId: 't2', sessionName: 'Agent 2' }),
			],
			currentIndex: 0,
			onQuickReply,
			onNavigateItem,
		});

		const textarea = screen.getByPlaceholderText('Reply to agent...');
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false, metaKey: false });

		expect(onNavigateItem).toHaveBeenCalledWith(1);
	});

	it('19. does NOT auto-advance after open-and-reply', () => {
		const onOpenAndReply = vi.fn();
		const onNavigateItem = vi.fn();
		renderFocusView({
			items: [
				createItem({ sessionId: 's1', tabId: 't1' }),
				createItem({ sessionId: 's2', tabId: 't2', sessionName: 'Agent 2' }),
			],
			currentIndex: 0,
			onOpenAndReply,
			onNavigateItem,
		});

		const textarea = screen.getByPlaceholderText('Reply to agent...');
		fireEvent.change(textarea, { target: { value: 'hello' } });
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

		expect(onOpenAndReply).toHaveBeenCalledWith('s1', 't1', 'hello');
		expect(onNavigateItem).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Mark as Read tests
// ============================================================================
describe('FocusModeView (mark as read)', () => {
	it('20. renders Mark Read button', () => {
		renderFocusView();
		expect(screen.getByTitle('Mark as read and advance (M)')).toBeDefined();
		expect(screen.getByText('✓ Read')).toBeDefined();
	});

	it('21. calls onMarkAsRead on button click', () => {
		const onMarkAsRead = vi.fn();
		renderFocusView({
			items: [createItem({ sessionId: 's1', tabId: 't1' })],
			onMarkAsRead,
		});
		const markReadButton = screen.getByTitle('Mark as read and advance (M)');
		fireEvent.click(markReadButton);
		expect(onMarkAsRead).toHaveBeenCalledWith('s1', 't1');
	});

	it('22. auto-advances after marking as read', () => {
		const onMarkAsRead = vi.fn();
		const onNavigateItem = vi.fn();
		renderFocusView({
			items: [
				createItem({ sessionId: 's1', tabId: 't1' }),
				createItem({ sessionId: 's2', tabId: 't2', sessionName: 'Agent 2' }),
			],
			currentIndex: 0,
			onMarkAsRead,
			onNavigateItem,
		});

		const markReadButton = screen.getByTitle('Mark as read and advance (M)');
		fireEvent.click(markReadButton);

		expect(onMarkAsRead).toHaveBeenCalledWith('s1', 't1');
		expect(onNavigateItem).toHaveBeenCalledWith(1);
	});
});

// ============================================================================
// Navigation tests
// ============================================================================
describe('FocusModeView (navigation)', () => {
	it('23. prev button calls onNavigateItem with previous index', () => {
		const onNavigateItem = vi.fn();
		renderFocusView({
			items: [
				createItem({ sessionId: 's1', tabId: 't1' }),
				createItem({ sessionId: 's2', tabId: 't2', sessionName: 'Agent 2' }),
				createItem({ sessionId: 's3', tabId: 't3', sessionName: 'Agent 3' }),
			],
			currentIndex: 1,
			onNavigateItem,
		});

		const prevButton = screen.getByTitle('Previous item (←)');
		fireEvent.click(prevButton);

		// (1 - 1 + 3) % 3 = 0
		expect(onNavigateItem).toHaveBeenCalledWith(0);
	});

	it('24. next button calls onNavigateItem with next index', () => {
		const onNavigateItem = vi.fn();
		renderFocusView({
			items: [
				createItem({ sessionId: 's1', tabId: 't1' }),
				createItem({ sessionId: 's2', tabId: 't2', sessionName: 'Agent 2' }),
				createItem({ sessionId: 's3', tabId: 't3', sessionName: 'Agent 3' }),
			],
			currentIndex: 1,
			onNavigateItem,
		});

		const nextButton = screen.getByTitle('Next item (→)');
		fireEvent.click(nextButton);

		// (1 + 1) % 3 = 2
		expect(onNavigateItem).toHaveBeenCalledWith(2);
	});

	it('25. nav buttons disabled when only 1 item', () => {
		renderFocusView({
			items: [createItem()],
		});
		const prevButton = screen.getByTitle('Previous item (←)').closest('button');
		const nextButton = screen.getByTitle('Next item (→)').closest('button');
		expect(prevButton?.disabled).toBe(true);
		expect(nextButton?.disabled).toBe(true);
	});

	it('26. close button calls onClose', () => {
		const onClose = vi.fn();
		renderFocusView({ onClose });
		const closeButton = screen.getByTitle('Close (Esc)');
		fireEvent.click(closeButton);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// ARIA tests
// ============================================================================
describe('FocusModeView (ARIA)', () => {
	it('27. conversation body has role="log"', () => {
		renderFocusView();
		expect(screen.getByRole('log')).toBeDefined();
	});

	it('28. counter has aria-live="polite"', () => {
		renderFocusView();
		const liveRegion = screen.getByText('1 / 1');
		expect(liveRegion.getAttribute('aria-live')).toBe('polite');
	});

	it('29. reply textarea has aria-label', () => {
		renderFocusView();
		const textarea = screen.getByLabelText('Reply to agent');
		expect(textarea).toBeDefined();
		expect(textarea.tagName).toBe('TEXTAREA');
	});

	it('30. nav buttons have aria-disabled when single item', () => {
		renderFocusView({
			items: [createItem()],
		});
		const prevButton = screen.getByTitle('Previous item (←)').closest('button');
		const nextButton = screen.getByTitle('Next item (→)').closest('button');
		expect(prevButton?.getAttribute('aria-disabled')).toBe('true');
		expect(nextButton?.getAttribute('aria-disabled')).toBe('true');
	});
});
