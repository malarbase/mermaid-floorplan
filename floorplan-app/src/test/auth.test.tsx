import { fireEvent, render } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  sessionData: null as { user: { id: string; name: string; email: string } } | null,
  isPending: false,
  signInSocial: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('~/lib/auth-client', () => ({
  authClient: {
    signIn: {
      social: mockState.signInSocial,
    },
    signOut: () => {
      mockState.sessionData = null;
      mockState.signOut();
      return Promise.resolve();
    },
  },
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
  useNavigate: () => vi.fn(),
}));

vi.mock('@solidjs/meta', () => ({
  Title: (props: { children: string }) => <title>{props.children}</title>,
}));

vi.mock('~/components/Header', () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

import { LogoutButton } from '~/components/LogoutButton';
import { authClient, useSession } from '~/lib/auth-client';

describe('Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.sessionData = null;
    mockState.isPending = false;
  });

  describe('LogoutButton', () => {
    it('should render sign out button', () => {
      const result = render(() => <LogoutButton />);
      expect(result.getByText('Sign out')).toBeDefined();
    });

    it('should call signOut when clicked', async () => {
      const result = render(() => <LogoutButton />);
      const button = result.getByText('Sign out');

      await fireEvent.click(button);

      expect(mockState.signOut).toHaveBeenCalled();
    });

    it('should apply custom class', () => {
      const result = render(() => <LogoutButton class="custom-class" />);
      const button = result.getByText('Sign out');
      expect(button.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('Session State', () => {
    it('should detect logged out state', () => {
      const session = useSession();
      expect(session().data).toBeNull();
    });

    it('should detect logged in state', () => {
      mockState.sessionData = {
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      };
      const session = useSession();
      expect(session().data?.user.id).toBe('user-1');
      expect(session().data?.user.name).toBe('Test User');
    });

    it('should detect pending state', () => {
      mockState.isPending = true;
      const session = useSession();
      expect(session().isPending).toBe(true);
    });
  });

  describe('Auth Client', () => {
    it('should have signIn.social method', () => {
      expect(authClient.signIn.social).toBeDefined();
    });

    it('should have signOut method', () => {
      expect(authClient.signOut).toBeDefined();
    });
  });
});
