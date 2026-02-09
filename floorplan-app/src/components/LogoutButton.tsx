import { useNavigate } from '@solidjs/router';
import { authClient } from '~/lib/auth-client';
import { clearDevLogin } from '~/lib/mock-auth';

interface LogoutButtonProps {
  class?: string;
}

/**
 * Logout button component.
 * Signs out the user and redirects to home.
 * Clears both real auth session and mock dev session.
 */
export function LogoutButton(props: LogoutButtonProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Clear dev login flag in dev mode
    if (import.meta.env.DEV) {
      clearDevLogin();
    }
    // Sign out from real auth
    await authClient.signOut();
    navigate('/', { replace: true });
  };

  return (
    <button type="button" class={props.class ?? 'btn btn-ghost btn-sm'} onClick={handleLogout}>
      Sign out
    </button>
  );
}
