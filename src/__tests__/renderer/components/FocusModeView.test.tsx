/**
 * @fileoverview Smoke tests for FocusModeView component
 * Validates the component renders without crashing and shows key elements.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function renderFocusView(overrides: { items?: InboxItem[]; currentIndex?: number; sessions?: Session[] } = {}) {
	const item = createItem();
	const items = overrides.items ?? [item];
	const currentIndex = overrides.currentIndex ?? 0;
	const currentItem = items[currentIndex];
	const sessions = overrides.sessions ?? [createSession(currentItem.sessionId, currentItem.tabId)];

	return render(
		<FocusModeView
			theme={createTheme()}
			item={currentItem}
			items={items}
			sessions={sessions}
			currentIndex={currentIndex}
			onClose={vi.fn()}
			onExitFocus={vi.fn()}
			onNavigateItem={vi.fn()}
		/>
	);
}

describe('FocusModeView (smoke)', () => {
	it('renders header with agent name', () => {
		renderFocusView();
		// Agent name visible
		expect(screen.getByText('Test Agent')).toBeDefined();
		// Back button with "Inbox" text
		expect(screen.getByText('Inbox')).toBeDefined();
		// Close button (X)
		expect(screen.getByTestId('x-icon')).toBeDefined();
	});

	it('renders footer with counter', () => {
		renderFocusView();
		// "1 / 1" counter
		expect(screen.getByText('1 / 1')).toBeDefined();
		// Prev/Next buttons
		expect(screen.getByText('← Prev')).toBeDefined();
		expect(screen.getByText('Next →')).toBeDefined();
	});

	it('renders ARIA attributes', () => {
		renderFocusView();
		// Body with role="log"
		expect(screen.getByRole('log')).toBeDefined();
		// Counter with aria-live="polite"
		const liveRegion = screen.getByText('1 / 1');
		expect(liveRegion.getAttribute('aria-live')).toBe('polite');
	});

	it('renders back button with correct aria-label', () => {
		renderFocusView();
		const backButton = screen.getByLabelText('Return to inbox list');
		expect(backButton).toBeDefined();
	});

	it('shows tab name after separator when present', () => {
		renderFocusView({
			items: [createItem({ tabName: 'Research Tab' })],
		});
		expect(screen.getByText('Research Tab')).toBeDefined();
		expect(screen.getByText('·')).toBeDefined();
	});

	it('shows subheader badges', () => {
		renderFocusView();
		// Git branch
		expect(screen.getByText('main')).toBeDefined();
		// Context usage
		expect(screen.getByText('Context: 45%')).toBeDefined();
		// Status pill
		expect(screen.getByText('Ready')).toBeDefined();
	});

	it('disables prev/next when only one item', () => {
		renderFocusView();
		const prevButton = screen.getByText('← Prev');
		expect(prevButton.closest('button')?.disabled).toBe(true);
		expect(prevButton.closest('button')?.getAttribute('aria-disabled')).toBe('true');
	});

	it('enables prev/next when multiple items', () => {
		renderFocusView({
			items: [
				createItem({ sessionId: 's1', tabId: 't1' }),
				createItem({ sessionId: 's2', tabId: 't2', sessionName: 'Agent 2' }),
			],
			currentIndex: 0,
		});
		const prevButton = screen.getByText('← Prev').closest('button');
		expect(prevButton?.disabled).toBe(false);
		expect(prevButton?.getAttribute('aria-disabled')).toBeNull();
	});
});
