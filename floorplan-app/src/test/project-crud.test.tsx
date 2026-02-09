import { fireEvent, render, waitFor } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMutations = vi.hoisted(() => ({
  create: {
    mutate: vi.fn().mockResolvedValue('project-new-123'),
  },
  update: {
    mutate: vi.fn().mockResolvedValue({ success: true }),
  },
  remove: {
    mutate: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('convex-solidjs', () => ({
  useMutation: (ref: string) => {
    if (ref.includes('create')) return mockMutations.create;
    if (ref.includes('update')) return mockMutations.update;
    if (ref.includes('remove')) return mockMutations.remove;
    return { mutate: vi.fn() };
  },
}));

vi.mock('@solidjs/router', () => ({
  A: (props: { href: string; children: JSX.Element }) => <a href={props.href}>{props.children}</a>,
  useNavigate: () => vi.fn(),
}));

import { ProjectForm } from '~/components/ProjectForm';

describe('Project CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ProjectForm - Create Mode', () => {
    it('should render create form', () => {
      const result = render(() => <ProjectForm mode="create" username="testuser" />);

      expect(result.getByPlaceholderText('My Beach House')).toBeDefined();
      expect(result.getByPlaceholderText('my-beach-house')).toBeDefined();
      expect(result.getByText('Create Project')).toBeDefined();
    });

    it('should auto-generate slug from project name', async () => {
      const result = render(() => <ProjectForm mode="create" username="testuser" />);

      const nameInput = result.getByPlaceholderText('My Beach House') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'My Test Project' } });

      const slugInput = result.getByPlaceholderText('my-beach-house') as HTMLInputElement;
      expect(slugInput.value).toBe('my-test-project');
    });

    it('should show URL preview', async () => {
      const result = render(() => <ProjectForm mode="create" username="testuser" />);

      const nameInput = result.getByPlaceholderText('My Beach House');
      await fireEvent.input(nameInput, { target: { value: 'Beach House' } });

      expect(result.getByText('/u/testuser/beach-house')).toBeDefined();
    });

    it('should strip invalid characters from slug', async () => {
      const result = render(() => <ProjectForm mode="create" username="testuser" />);

      const slugInput = result.getByPlaceholderText('my-beach-house') as HTMLInputElement;
      await fireEvent.input(slugInput, { target: { value: 'INVALID_SLUG!' } });

      expect(slugInput.value).toBe('invalidslug');
    });

    it('should disable submit when form is invalid', () => {
      const result = render(() => <ProjectForm mode="create" username="testuser" />);

      const submitButton = result.getByText('Create Project') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it('should enable submit when form is valid', async () => {
      const result = render(() => <ProjectForm mode="create" username="testuser" />);

      const nameInput = result.getByPlaceholderText('My Beach House');
      await fireEvent.input(nameInput, { target: { value: 'Valid Name' } });

      const submitButton = result.getByText('Create Project') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);
    });

    it('should call onSuccess with projectId and slug after creation', async () => {
      const onSuccess = vi.fn();
      const result = render(() => (
        <ProjectForm mode="create" username="testuser" onSuccess={onSuccess} />
      ));

      const nameInput = result.getByPlaceholderText('My Beach House');
      await fireEvent.input(nameInput, { target: { value: 'New Project' } });

      const form = result.container.querySelector('form')!;
      await fireEvent.submit(form);

      await waitFor(() => {
        expect(mockMutations.create.mutate).toHaveBeenCalledWith({
          displayName: 'New Project',
          slug: 'new-project',
          description: undefined,
          isPublic: false,
          content: expect.any(String),
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('project-new-123', 'new-project');
      });
    });

    it('should show cancel button when onCancel is provided', () => {
      const onCancel = vi.fn();
      const result = render(() => (
        <ProjectForm mode="create" username="testuser" onCancel={onCancel} />
      ));

      expect(result.getByText('Cancel')).toBeDefined();
    });

    it('should call onCancel when cancel is clicked', async () => {
      const onCancel = vi.fn();
      const result = render(() => (
        <ProjectForm mode="create" username="testuser" onCancel={onCancel} />
      ));

      const cancelButton = result.getByText('Cancel');
      await fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('ProjectForm - Edit Mode', () => {
    const initialValues = {
      displayName: 'Existing Project',
      slug: 'existing-project',
      description: 'A description',
      isPublic: true,
    };

    it('should render edit form with initial values', () => {
      const result = render(() => (
        <ProjectForm mode="edit" projectId="project-123" initialValues={initialValues} />
      ));

      const nameInput = result.getByPlaceholderText('My Beach House') as HTMLInputElement;
      expect(nameInput.value).toBe('Existing Project');

      const slugInput = result.getByPlaceholderText('my-beach-house') as HTMLInputElement;
      expect(slugInput.value).toBe('existing-project');
      expect(slugInput.disabled).toBe(true);

      expect(result.getByText('Save Changes')).toBeDefined();
    });

    it('should show slug cannot be changed message', () => {
      const result = render(() => (
        <ProjectForm mode="edit" projectId="project-123" initialValues={initialValues} />
      ));

      expect(result.getByText('Cannot be changed after creation')).toBeDefined();
    });

    it('should call update mutation on submit', async () => {
      const onSuccess = vi.fn();
      const result = render(() => (
        <ProjectForm
          mode="edit"
          projectId="project-123"
          initialValues={initialValues}
          onSuccess={onSuccess}
        />
      ));

      const nameInput = result.getByPlaceholderText('My Beach House');
      await fireEvent.input(nameInput, { target: { value: 'Updated Project' } });

      const form = result.container.querySelector('form')!;
      await fireEvent.submit(form);

      await waitFor(() => {
        expect(mockMutations.update.mutate).toHaveBeenCalledWith({
          projectId: 'project-123',
          displayName: 'Updated Project',
          description: 'A description',
          isPublic: true,
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('project-123');
      });
    });
  });

  describe('Visibility Toggle', () => {
    it('should default to private', () => {
      const result = render(() => <ProjectForm mode="create" username="testuser" />);

      const toggle = result.getByRole('checkbox') as HTMLInputElement;
      expect(toggle.checked).toBe(false);
    });

    it('should toggle visibility', async () => {
      const result = render(() => <ProjectForm mode="create" username="testuser" />);

      const toggle = result.getByRole('checkbox') as HTMLInputElement;
      await fireEvent.click(toggle);

      expect(toggle.checked).toBe(true);
    });
  });
});
