import { useMutation } from 'convex-solidjs';
import { createMemo, createSignal, Show } from 'solid-js';
import { styledApartmentContent } from '~/lib/mock-floorplan-content';
import type { ProjectId } from '~/lib/project-types';
import { api } from '../../convex/_generated/api';

export interface ProjectFormData {
  displayName: string;
  slug: string;
  description: string;
  isPublic: boolean;
}

export interface ProjectFormProps {
  /**
   * Mode: "create" for new projects, "edit" for existing projects
   */
  mode: 'create' | 'edit';

  /**
   * Initial form values (for edit mode)
   */
  initialValues?: Partial<ProjectFormData>;

  /**
   * Project ID (required for edit mode)
   */
  projectId?: ProjectId;

  /**
   * Username for URL preview
   */
  username?: string;

  /**
   * Default DSL content for new projects
   */
  defaultContent?: string;

  /**
   * Called when form is successfully submitted
   * @param projectId - The ID of the created/updated project
   * @param slug - The slug of the project (for navigation, only in create mode)
   */
  onSuccess?: (projectId: ProjectId, slug?: string) => void;

  /**
   * Called when cancel button is clicked
   */
  onCancel?: () => void;

  /**
   * Called when form has an error
   */
  onError?: (error: Error) => void;
}

const DEFAULT_CONTENT = styledApartmentContent;

/**
 * Reusable project form component for creating and editing floorplan projects.
 *
 * Features:
 * - Auto-generates URL slug from project name
 * - Validates slug format (lowercase, numbers, hyphens only)
 * - Public/private visibility toggle
 * - Loading and error states
 *
 * @example
 * // Create mode
 * <ProjectForm
 *   mode="create"
 *   username={user.username}
 *   onSuccess={(id) => navigate(`/u/${username}/${slug}`)}
 *   onCancel={() => navigate("/dashboard")}
 * />
 *
 * // Edit mode
 * <ProjectForm
 *   mode="edit"
 *   projectId={project._id}
 *   initialValues={{
 *     displayName: project.displayName,
 *     slug: project.slug,
 *     description: project.description,
 *     isPublic: project.isPublic,
 *   }}
 *   onSuccess={() => navigate(`/u/${username}/${slug}/settings`)}
 * />
 */
export function ProjectForm(props: ProjectFormProps) {
  // Convex mutations
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  // Form state
  const [displayName, setDisplayName] = createSignal(props.initialValues?.displayName ?? '');
  const [slug, setSlug] = createSignal(props.initialValues?.slug ?? '');
  const [description, setDescription] = createSignal(props.initialValues?.description ?? '');
  const [isPublic, setIsPublic] = createSignal(props.initialValues?.isPublic ?? false);

  // UI state
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = createSignal(
    props.mode === 'edit', // In edit mode, assume slug was already set
  );

  // Derived state
  const isCreateMode = () => props.mode === 'create';
  const submitLabel = createMemo(() => (isCreateMode() ? 'Create Project' : 'Save Changes'));
  const submittingLabel = createMemo(() => (isCreateMode() ? 'Creating...' : 'Saving...'));

  // Validation
  const isValidSlug = createMemo(() => {
    const s = slug();
    return s.length > 0 && /^[a-z0-9-]+$/.test(s);
  });

  const isFormValid = createMemo(() => {
    return displayName().length > 0 && isValidSlug();
  });

  // URL preview
  const urlPreview = createMemo(() => {
    const username = props.username ?? 'you';
    const projectSlug = slug() || 'my-project';
    return `/u/${username}/${projectSlug}`;
  });

  /**
   * Generate URL-safe slug from display name
   */
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  /**
   * Handle display name input - auto-generate slug if not manually edited
   */
  const handleNameChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const name = target.value;
    setDisplayName(name);
    setError(null);

    // Only auto-generate slug if it hasn't been manually edited
    if (!slugManuallyEdited()) {
      setSlug(generateSlug(name));
    }
  };

  /**
   * Handle slug input - mark as manually edited
   */
  const handleSlugChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(value);
    setSlugManuallyEdited(true);
    setError(null);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!isFormValid() || isSubmitting()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (isCreateMode()) {
        // Create new project with initial "main" version
        const currentSlug = slug(); // Capture before async call
        const projectId = (await createProject.mutate({
          displayName: displayName(),
          slug: currentSlug,
          description: description() || undefined,
          isPublic: isPublic(),
          content: props.defaultContent ?? DEFAULT_CONTENT,
        })) as ProjectId;

        // Pass both projectId and slug for navigation
        props.onSuccess?.(projectId, currentSlug);
      } else {
        // Update existing project
        if (!props.projectId) {
          throw new Error('Project ID is required for edit mode');
        }

        await updateProject.mutate({
          projectId: props.projectId,
          displayName: displayName(),
          description: description() || undefined,
          isPublic: isPublic(),
          // Note: slug cannot be changed after creation
        });

        props.onSuccess?.(props.projectId);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      props.onError?.(error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="card bg-base-100 shadow-xl">
      <div class="card-body gap-0">
        {/* Error Alert */}
        <Show when={error()}>
          <div class="alert alert-error mb-6">
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
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error()}</span>
          </div>
        </Show>

        {/* Section: Identity — Name + Slug */}
        <div class="space-y-4">
          {/* Project Name */}
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Project Name</span>
            </label>
            <input
              type="text"
              placeholder="My Beach House"
              class="input input-bordered w-full"
              value={displayName()}
              onInput={handleNameChange}
              disabled={isSubmitting()}
              required
            />
          </div>

          {/* URL Slug */}
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">URL Slug</span>
            </label>
            <input
              type="text"
              placeholder="my-beach-house"
              class={`input input-bordered font-mono w-full ${
                slug() && !isValidSlug() ? 'input-error' : ''
              }`}
              value={slug()}
              onInput={handleSlugChange}
              disabled={isSubmitting() || !isCreateMode()}
              required
            />
            {/* URL Preview */}
            <div class="mt-2 rounded-lg bg-base-200 px-3 py-2 text-sm font-mono text-base-content/60">
              {urlPreview()}
            </div>
            <label class="label">
              <span
                class={`label-text-alt ${
                  slug() && !isValidSlug() ? 'text-error' : 'text-base-content/50'
                }`}
              >
                {slug() && !isValidSlug()
                  ? 'Only lowercase letters, numbers, and hyphens allowed'
                  : 'Only lowercase letters, numbers, and hyphens'}
              </span>
              <Show when={!isCreateMode()}>
                <span class="label-text-alt text-base-content/50">
                  Cannot be changed after creation
                </span>
              </Show>
            </label>
          </div>
        </div>

        <div class="divider my-2"></div>

        {/* Section: Details — Description */}
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Description</span>
            <span class="label-text-alt text-base-content/50">Optional</span>
          </label>
          <textarea
            placeholder="A modern beach house design..."
            class="textarea textarea-bordered w-full"
            value={description()}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            disabled={isSubmitting()}
            rows={3}
          />
        </div>

        <div class="divider my-2"></div>

        {/* Section: Settings — Visibility */}
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              class="toggle toggle-primary"
              checked={isPublic()}
              onChange={(e) => setIsPublic((e.target as HTMLInputElement).checked)}
              disabled={isSubmitting()}
            />
            <div>
              <span class="label-text font-medium">Make project public</span>
              <p class="text-sm text-base-content/50">
                Public projects can be viewed by anyone with the link
              </p>
            </div>
          </label>
        </div>

        {/* Form Actions */}
        <div class="card-actions justify-end mt-6 pt-4 border-t border-base-300">
          <Show when={props.onCancel}>
            <button
              type="button"
              class="btn btn-ghost"
              onClick={props.onCancel}
              disabled={isSubmitting()}
            >
              Cancel
            </button>
          </Show>
          <button type="submit" class="btn btn-primary" disabled={isSubmitting() || !isFormValid()}>
            <Show when={isSubmitting()} fallback={submitLabel()}>
              <span class="loading loading-spinner loading-sm"></span>
              {submittingLabel()}
            </Show>
          </button>
        </div>
      </div>
    </form>
  );
}

export default ProjectForm;
