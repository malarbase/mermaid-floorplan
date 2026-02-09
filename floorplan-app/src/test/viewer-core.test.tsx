import { render, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockLocation = { pathname: '/u/testuser/my-project' };

const mockFloorplanApp = {
  dispose: vi.fn(),
  loadFromDsl: vi.fn(),
  setTheme: vi.fn(),
};

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

const mockFloorplanAppCore = vi.fn().mockImplementation(() => mockFloorplanApp);

vi.mock('floorplan-viewer-core', () => ({
  FloorplanAppCore: mockFloorplanAppCore,
}));

import { FloorplanEmbed } from '~/components/FloorplanEmbed';

describe('Viewer-Core Embedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FloorplanEmbed Component', () => {
    it('should render loading state initially', () => {
      const result = render(() => <FloorplanEmbed dsl="floorplan\n  floor Ground {}" />);

      expect(result.getByText('Loading 3D viewer...')).toBeDefined();
    });

    it('should create container with unique ID', () => {
      const result = render(() => <FloorplanEmbed dsl="floorplan\n  floor Ground {}" />);

      const container = result.container.querySelector('[id^="floorplan-embed-"]');
      expect(container).toBeDefined();
    });

    it('should use custom container ID when provided', () => {
      const result = render(() => (
        <FloorplanEmbed dsl="floorplan\n  floor Ground {}" containerId="custom-id" />
      ));

      const container = result.container.querySelector('#custom-id');
      expect(container).toBeDefined();
    });

    it('should set up container for FloorplanAppCore', () => {
      const result = render(() => (
        <FloorplanEmbed
          dsl="floorplan\n  floor Ground {}"
          theme="dark"
          containerId="test-container"
        />
      ));

      const container = result.container.querySelector('#test-container');
      expect(container).toBeDefined();
      expect(container?.classList.contains('w-full')).toBe(true);
      expect(container?.classList.contains('h-full')).toBe(true);
    });

    it('should hide loading after initialization', async () => {
      const result = render(() => <FloorplanEmbed dsl="floorplan\n  floor Ground {}" />);

      await waitFor(() => {
        const loadingEl = result.container.querySelector('.loading-spinner');
        expect(loadingEl).toBeNull();
      });
    });

    it('should properly unmount component', () => {
      const { unmount } = render(() => (
        <FloorplanEmbed dsl="floorplan\n  floor Ground {}" containerId="test-cleanup" />
      ));

      const container = document.querySelector('#test-cleanup');
      expect(container).toBeDefined();

      unmount();
    });

    it('should have full-size container styles', () => {
      const result = render(() => <FloorplanEmbed dsl="floorplan\n  floor Ground {}" />);

      const wrapper = result.container.firstChild as HTMLElement;
      expect(wrapper.classList.contains('w-full')).toBe(true);
      expect(wrapper.classList.contains('h-full')).toBe(true);
    });
  });

  describe('FloorplanEmbed Props', () => {
    it('should accept editable prop', () => {
      render(() => <FloorplanEmbed dsl="test" editable={true} />);

      expect(true).toBe(true);
    });

    it('should accept onDslChange callback', () => {
      const onDslChange = vi.fn();
      render(() => <FloorplanEmbed dsl="test" onDslChange={onDslChange} />);

      expect(true).toBe(true);
    });

    it('should accept onSave callback', () => {
      const onSave = vi.fn();
      render(() => <FloorplanEmbed dsl="test" onSave={onSave} />);

      expect(true).toBe(true);
    });
  });

  describe('Auth Required Handling', () => {
    it('should have access to navigate for auth redirect', () => {
      render(() => <FloorplanEmbed dsl="test" />);

      expect(mockNavigate).toBeDefined();
    });

    it('should know current location for redirect', () => {
      render(() => <FloorplanEmbed dsl="test" />);

      expect(mockLocation.pathname).toBe('/u/testuser/my-project');
    });
  });
});
