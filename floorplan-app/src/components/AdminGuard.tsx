import { Show, createEffect, JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useSession } from "~/lib/auth-client";

interface GuardProps {
  children: JSX.Element;
}

/**
 * AdminGuard component - protects admin routes.
 * Allows access if user is admin OR super admin.
 * Redirects non-admins to /dashboard.
 */
export function AdminGuard(props: GuardProps) {
  const sessionSignal = useSession();
  const navigate = useNavigate();

  createEffect(() => {
    const session = sessionSignal();
    const user = session.data?.user;
    const isLoading = session.isPending;

    // Only check after session is fully loaded
    if (!isLoading && user && !user.isAdmin) {
      // Not an admin, redirect to dashboard
      navigate("/dashboard", { replace: true });
    }
  });

  return (
    <Show when={sessionSignal().data?.user?.isAdmin} fallback={<div>Loading...</div>}>
      {props.children}
    </Show>
  );
}

/**
 * SuperAdminGuard component - protects super admin only routes.
 * Currently checks for admin status (backend enforces super admin).
 * Redirects non-admins to /dashboard.
 */
export function SuperAdminGuard(props: GuardProps) {
  const sessionSignal = useSession();
  const navigate = useNavigate();

  createEffect(() => {
    const session = sessionSignal();
    const user = session.data?.user;
    const isLoading = session.isPending;

    // Only check after session is fully loaded
    if (!isLoading && user && !user.isAdmin) {
      // Not an admin, redirect to dashboard
      navigate("/dashboard", { replace: true });
    }
  });

  return (
    <Show when={sessionSignal().data?.user?.isAdmin} fallback={<div>Loading...</div>}>
      {props.children}
    </Show>
  );
}
