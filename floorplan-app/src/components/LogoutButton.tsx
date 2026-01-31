import { useNavigate } from "@solidjs/router";
import { authClient } from "~/lib/auth-client";

interface LogoutButtonProps {
  class?: string;
}

/**
 * Logout button component.
 * Signs out the user and redirects to home.
 */
export function LogoutButton(props: LogoutButtonProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut();
    navigate("/", { replace: true });
  };

  return (
    <button
      class={props.class ?? "btn btn-ghost btn-sm"}
      onClick={handleLogout}
    >
      Sign out
    </button>
  );
}
