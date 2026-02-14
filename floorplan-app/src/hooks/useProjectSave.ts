/**
 * Shared hook for project save functionality.
 * Encapsulates DSL change tracking, save mutation, Ctrl+S shortcut,
 * and beforeunload warning. Used by both index.tsx and v/[version].tsx.
 */

import { useMutation } from 'convex-solidjs';
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';
import { convexApi } from '~/lib/project-types';

/**
 * @param content - Accessor to the server-side (last-saved) DSL content
 * @param projectId - Accessor to the current project ID
 * @param versionName - Accessor to the version name to save to (e.g. "main" or a named version)
 * @param isOwner - Accessor indicating whether the current user owns the project
 */
export function useProjectSave(
  content: Accessor<string | undefined>,
  projectId: Accessor<string | undefined>,
  versionName: Accessor<string | undefined>,
  isOwner: Accessor<boolean>,
) {
  const saveMutation = useMutation(convexApi.projects.save);

  const [currentDsl, setCurrentDsl] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);
  const [showSaveSuccess, setShowSaveSuccess] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [lastSavedContent, setLastSavedContent] = createSignal('');
  const [justSaved, setJustSaved] = createSignal(false);

  // Sync when server content loads or changes (e.g. real-time update from Convex).
  // After a save, the Convex subscription fires with (possibly stale) server data.
  // The justSaved flag prevents that from overwriting the local editor state.
  createEffect(() => {
    const c = content();
    if (c) {
      if (justSaved()) {
        // We just saved — server content is catching up. Don't overwrite local state.
        setJustSaved(false);
        setLastSavedContent(c);
      } else {
        setCurrentDsl(c);
        setLastSavedContent(c);
      }
    }
  });

  const hasUnsavedChanges = createMemo(() => currentDsl() !== lastSavedContent());

  const handleDslChange = (newDsl: string) => {
    setCurrentDsl(newDsl);
    setSaveError(null);
  };

  const handleSave = async () => {
    const pid = projectId();
    const ver = versionName();
    if (!isOwner() || !pid || !ver || !hasUnsavedChanges() || isSaving()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await saveMutation.mutate({
        projectId: pid,
        versionName: ver,
        content: currentDsl(),
      });
      setLastSavedContent(currentDsl());
      setJustSaved(true);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut (Ctrl+S / Cmd+S)
  createEffect(() => {
    if (!isOwner()) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    onCleanup(() => document.removeEventListener('keydown', onKeyDown));
  });

  // Warn before leaving with unsaved changes
  createEffect(() => {
    if (hasUnsavedChanges()) {
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', onBeforeUnload);
      onCleanup(() => window.removeEventListener('beforeunload', onBeforeUnload));
    }
  });

  return {
    currentDsl,
    handleDslChange,
    handleSave,
    hasUnsavedChanges,
    isSaving,
    showSaveSuccess,
    saveError,
  };
}
