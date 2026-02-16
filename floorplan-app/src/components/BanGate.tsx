import { Navigate } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { Match, type ParentComponent, Switch } from 'solid-js';
import { Loading } from '~/components/ui/Loading';
import { api } from '../../convex/_generated/api';

/**
 * Declarative ban gate. Blocks children from rendering if the user is banned.
 *
 * State handling:
 * - Loading: shows spinner while getBanStatus resolves
 * - Error: shows fallback message
 * - Banned: renders <Navigate> to /banned (children never mount)
 * - OK / unauthenticated: renders children (useAuthRedirect in children
 *   handles the not-logged-in redirect separately)
 */
const BanGate: ParentComponent = (props) => {
  const banStatus = useQuery(api.users.getBanStatus, {});

  return (
    <Switch fallback={<Loading size="lg" text="Loading..." />}>
      <Match when={banStatus.error()}>
        <Loading size="lg" text="Something went wrong..." />
      </Match>
      <Match when={banStatus.data()?.isBanned === true}>
        <Navigate href="/banned" />
      </Match>
      <Match when={!banStatus.isLoading()}>{props.children}</Match>
    </Switch>
  );
};

export default BanGate;
