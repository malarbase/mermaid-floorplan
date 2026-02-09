// Development-only: Mock login for testing
// Visit http://localhost:3000/dev-login to get a session

import { useNavigate } from '@solidjs/router';
import { mockUsers, setMockSession } from '~/lib/mock-auth';

export default function DevLogin() {
  const navigate = useNavigate();

  // Only allow in development
  if (import.meta.env.PROD) {
    navigate('/');
    return null;
  }

  const login = () => {
    // Use the pre-configured mock user
    const mockUser = mockUsers.regularUser;

    // Store mock session in localStorage
    setMockSession(mockUser);
    console.log('Mock user created:', mockUser);

    // Navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-base-200">
      <div class="card w-96 bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Development Login</h2>
          <p class="text-sm text-base-content/70">For testing only - bypasses OAuth</p>
          <div class="alert alert-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Only works in development mode</span>
          </div>
          <div class="card-actions justify-end mt-4">
            <button class="btn btn-primary" onClick={login}>
              Login as Dev User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
