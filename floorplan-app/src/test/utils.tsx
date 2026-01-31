import { render as solidRender } from '@solidjs/testing-library';
import { createSignal, createContext, useContext, type ParentComponent, type Accessor, Suspense } from 'solid-js';
import { MemoryRouter, createMemoryHistory } from '@solidjs/router';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  image?: string;
}

export interface MockSession {
  user: MockUser | null;
  isLoading: Accessor<boolean>;
}

const MockAuthContext = createContext<MockSession>();

export const MockAuthProvider: ParentComponent<{ user?: MockUser | null }> = (props) => {
  const [isLoading] = createSignal(false);
  const session: MockSession = {
    user: props.user ?? null,
    isLoading,
  };
  return (
    <MockAuthContext.Provider value={session}>
      {props.children}
    </MockAuthContext.Provider>
  );
};

export const useMockAuth = () => {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error('useMockAuth must be used within MockAuthProvider');
  return ctx;
};

export interface MockConvexData {
  [key: string]: unknown;
}

const MockConvexContext = createContext<{
  data: MockConvexData;
  setData: (key: string, value: unknown) => void;
}>();

export const MockConvexProvider: ParentComponent<{ initialData?: MockConvexData }> = (props) => {
  const [data, setData] = createSignal<MockConvexData>(props.initialData ?? {});
  return (
    <MockConvexContext.Provider
      value={{
        data: data(),
        setData: (key, value) => setData((prev) => ({ ...prev, [key]: value })),
      }}
    >
      {props.children}
    </MockConvexContext.Provider>
  );
};

export const useMockConvex = () => {
  const ctx = useContext(MockConvexContext);
  if (!ctx) throw new Error('useMockConvex must be used within MockConvexProvider');
  return ctx;
};

export interface RenderOptions {
  user?: MockUser | null;
  route?: string;
  convexData?: MockConvexData;
}

export function renderWithProviders(
  ui: () => import('solid-js').JSX.Element,
  options: RenderOptions = {}
) {
  const { user = null, convexData = {} } = options;

  return solidRender(() => (
    <MockAuthProvider user={user}>
      <MockConvexProvider initialData={convexData}>
        {ui()}
      </MockConvexProvider>
    </MockAuthProvider>
  ));
}

export function renderWithRouter(
  ui: () => import('solid-js').JSX.Element,
  options: RenderOptions = {}
) {
  const { user = null, route = '/', convexData = {} } = options;
  const history = createMemoryHistory();
  history.set({ value: route });

  return solidRender(() => (
    <MemoryRouter
      history={history}
      root={(props) => (
        <Suspense>
          <MockAuthProvider user={user}>
            <MockConvexProvider initialData={convexData}>
              {props.children}
            </MockConvexProvider>
          </MockAuthProvider>
        </Suspense>
      )}
    >
      {ui()}
    </MemoryRouter>
  ));
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  ...overrides,
});

export const createMockProject = (overrides: Partial<{
  _id: string;
  slug: string;
  name: string;
  ownerId: string;
  isPublic: boolean;
}> = {}) => ({
  _id: 'project-123',
  slug: 'my-project',
  name: 'My Project',
  ownerId: 'user-123',
  isPublic: false,
  ...overrides,
});

export const createMockVersion = (overrides: Partial<{
  _id: string;
  projectId: string;
  name: string;
  currentSnapshotId: string;
}> = {}) => ({
  _id: 'version-123',
  projectId: 'project-123',
  name: 'main',
  currentSnapshotId: 'snapshot-123',
  ...overrides,
});

export const createMockSnapshot = (overrides: Partial<{
  _id: string;
  versionId: string;
  contentHash: string;
  dsl: string;
}> = {}) => ({
  _id: 'snapshot-123',
  versionId: 'version-123',
  contentHash: 'abc123',
  dsl: 'floorplan\n  floor Ground {\n    room Lobby at (0,0) size (10x10) walls [top: solid]\n  }',
  ...overrides,
});

export { solidRender as render };
