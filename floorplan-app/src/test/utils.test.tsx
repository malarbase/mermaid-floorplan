import { describe, expect, it } from 'vitest';
import { createMockProject, createMockUser, renderWithProviders } from './utils';

describe('Test Utilities', () => {
  it('should create mock user with defaults', () => {
    const user = createMockUser();
    expect(user.id).toBe('user-123');
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
  });

  it('should create mock user with overrides', () => {
    const user = createMockUser({ name: 'Custom Name', email: 'custom@example.com' });
    expect(user.name).toBe('Custom Name');
    expect(user.email).toBe('custom@example.com');
    expect(user.id).toBe('user-123');
  });

  it('should create mock project with defaults', () => {
    const project = createMockProject();
    expect(project._id).toBe('project-123');
    expect(project.slug).toBe('my-project');
    expect(project.isPublic).toBe(false);
  });

  it('should render component with providers', () => {
    const TestComponent = () => <div data-testid="test">Hello</div>;
    const result = renderWithProviders(() => <TestComponent />);
    expect(result.getByTestId('test')).toBeDefined();
  });

  it('should render with authenticated user', () => {
    const user = createMockUser({ name: 'Auth User' });
    const TestComponent = () => <div data-testid="auth">Authenticated</div>;
    const result = renderWithProviders(() => <TestComponent />, { user });
    expect(result.getByTestId('auth')).toBeDefined();
  });
});
