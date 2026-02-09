import { useNavigate } from '@solidjs/router';
import { createMemo, Show } from 'solid-js';
import { useSession } from '~/lib/auth-client';
import { FloorplanEditor } from './FloorplanEditor';
import { ForkButton } from './ForkButton';

export interface AuthGatedEditorPanelProps {
  /**
   * Initial DSL content to render
   */
  initialContent: string;

  /**
   * The project ID (required for forking)
   */
  projectId: string;

  /**
   * The project slug (required for forking)
   */
  projectSlug: string;

  /**
   * Project display name (required for forking)
   */
  projectName: string;

  /**
   * Owner username (required for forking)
   */
  ownerUsername: string;

  /**
   * Optional version name
   */
  versionName?: string;

  /**
   * Theme (light or dark)
   */
  theme?: 'light' | 'dark';

  /**
   * Called when content is modified (even if not saved)
   */
  onContentChange?: (content: string) => void;
}

/**
 * An editor panel that gates editing access based on authentication.
 *
 * - Anonymous users: See read-only editor with "Sign in to fork" overlay
 * - Authenticated users: See interactive editor (scratchpad mode) with Fork button
 */
export function AuthGatedEditorPanel(props: AuthGatedEditorPanelProps) {
  const navigate = useNavigate();
  const session = useSession();
  const isLoggedIn = createMemo(() => !!session().data?.user);

  const handleLogin = () => {
    const returnUrl = encodeURIComponent(`${window.location.pathname}?fork=true`);
    navigate(`/login?returnUrl=${returnUrl}`);
  };

  return (
    <div class="relative w-full h-full flex flex-col">
      {/* Toolbar for Authenticated Users */}
      <Show when={isLoggedIn()}>
        <div class="bg-base-100 border-b border-base-300 px-4 py-2 flex justify-between items-center">
          <div class="text-sm text-base-content/70">
            You are viewing a read-only copy. Fork to save changes.
          </div>
          <ForkButton
            projectId={props.projectId}
            projectSlug={props.projectSlug}
            projectName={props.projectName}
            ownerUsername={props.ownerUsername}
            variant="primary"
            size="sm"
            showLabel={true}
          />
        </div>
      </Show>

      <div class="relative flex-1 min-h-0">
        <FloorplanEditor
          initialContent={props.initialContent}
          // Only enable editing (typing) if logged in
          editable={isLoggedIn()}
          theme={props.theme}
          // We intentionally DO NOT pass projectId/versionName to FloorplanEditor
          // This ensures the internal Save button is disabled/hidden
          // and treats this as a "scratchpad" until forked
          onContentChange={props.onContentChange}
        />

        {/* Overlay for Anonymous Users */}
        <Show when={!isLoggedIn()}>
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-base-100/10 backdrop-blur-[2px]">
            <div class="card bg-base-100/95 shadow-2xl border border-base-300 max-w-md mx-4">
              <div class="card-body items-center text-center p-8">
                <div class="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 class="card-title text-xl mb-1">Sign in to Edit</h3>
                <p class="text-base-content/70 mb-6">
                  Join to fork this floorplan, make changes, and save your own version.
                </p>
                <button onClick={handleLogin} class="btn btn-primary w-full">
                  Sign In to Fork & Edit
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default AuthGatedEditorPanel;
