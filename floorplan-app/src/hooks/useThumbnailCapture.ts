/**
 * Shared hook for capturing and uploading project thumbnails.
 * Used by project route pages to provide a "Set Preview" button.
 *
 * Also persists the user's current camera state alongside the thumbnail
 * so that the viewer can restore the exact same view on page load.
 */

import { useMutation } from 'convex-solidjs';
import { type Accessor, createSignal } from 'solid-js';
import type { CoreInstance } from '~/lib/project-types';
import { api } from '../../convex/_generated/api';

/**
 * Hook that encapsulates the thumbnail capture → upload → save pipeline.
 *
 * @param coreInstance - Accessor to the FloorplanAppCore instance (from FloorplanContainer)
 * @param projectId - Accessor to the current project ID
 * @returns { capture, isCapturing, showSuccess } for wiring into a button
 */
export function useThumbnailCapture(
  coreInstance: Accessor<CoreInstance | null>,
  projectId: Accessor<string | undefined>,
) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveThumbnailMutation = useMutation(api.storage.saveThumbnail);

  const [isCapturing, setIsCapturing] = createSignal(false);
  const [showSuccess, setShowSuccess] = createSignal(false);

  /**
   * Capture the current 3D view and upload it as the project thumbnail.
   * Also persists the user's camera state for consistent restore on load.
   * Returns true on success, false on failure.
   */
  const capture = async (): Promise<boolean> => {
    const core = coreInstance();
    const pid = projectId();
    if (!core?.captureScreenshot || !pid || isCapturing()) return false;

    setIsCapturing(true);
    setShowSuccess(false);

    try {
      // 1. Read camera state BEFORE screenshot (screenshot temporarily reframes)
      const cameraState = core.cameraManager?.getCameraState?.() ?? undefined;

      // 2. Capture the canvas (auto-frames all floors at thumbnail aspect ratio)
      const blob = await core.captureScreenshot();

      // 3. Get a signed upload URL from Convex
      const uploadUrl = await generateUploadUrl.mutate({});

      // 4. Upload the blob to Convex file storage
      const uploadResult = await fetch(uploadUrl as string, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });

      if (!uploadResult.ok) return false;

      const { storageId } = await uploadResult.json();

      // 5. Save thumbnail URL + camera state to the project
      await saveThumbnailMutation.mutate({ projectId: pid, storageId, cameraState });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      return true;
    } catch {
      return false;
    } finally {
      setIsCapturing(false);
    }
  };

  return { capture, isCapturing, showSuccess };
}
