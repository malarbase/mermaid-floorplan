import { render, waitFor } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();

const mockState = vi.hoisted(() => ({
  sessionData: null as { user: { id: string; name: string; email: string } } | null,
  isPending: false,
}));

vi.mock('~/lib/auth-client', () => ({
  useSession: () => () => ({
    data: mockState.sessionData,
    isPending: mockState.isPending,
  }),
}));

vi.mock('@solidjs/router', () => ({
  A: (props: { href: string; children: JSX.Element; class?: string }) => (
    <a href={props.href} class={props.class}>
      {props.children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}));

vi.mock('@solidjs/meta', () => ({
  Title: (props: { children: string }) => <title>{props.children}</title>,
}));

vi.mock('convex-solidjs', () => ({
  useQuery: () => ({
    data: () => [],
    isPending: () => false,
  }),
}));

vi.mock('~/components/Header', () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock('~/components/TempUsernameNudge', () => ({
  TempUsernameNudge: () => null,
}));

vi.mock('~/components/UsernameSelectionModal', () => ({
  UsernameSelectionModal: () => null,
}));

vi.mock('~/components/ProjectList', () => ({
  ProjectList: () => <div data-testid="project-list">Projects</div>,
}));

import Dashboard from '~/routes/dashboard';

describe('Protected Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.sessionData = null;
    mockState.isPending = false;
  });

  describe('Dashboard Route', () => {
    it('should show loading when session is pending', () => {
      mockState.isPending = true;
      const result = render(() => <Dashboard />);

      expect(result.container.querySelector('.loading-spinner')).toBeDefined();
    });

    it('should redirect to login when not authenticated', async () => {
      mockState.isPending = false;
      mockState.sessionData = null;

      render(() => <Dashboard />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('should show dashboard content when authenticated', () => {
      mockState.isPending = false;
      mockState.sessionData = {
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      };

      const result = render(() => <Dashboard />);

      expect(result.getByText('My Projects')).toBeDefined();
      expect(result.getByText('New Project')).toBeDefined();
    });

    it('should show project list when authenticated', () => {
      mockState.isPending = false;
      mockState.sessionData = {
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      };

      const result = render(() => <Dashboard />);

      expect(result.getByTestId('project-list')).toBeDefined();
    });

    it('should not redirect while loading', () => {
      mockState.isPending = true;
      mockState.sessionData = null;

      render(() => <Dashboard />);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
