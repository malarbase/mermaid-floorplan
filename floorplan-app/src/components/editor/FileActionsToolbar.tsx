import { createSignal, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

/** Minimal interface for the core's file operations. */
interface FileOpsCore {
  handleFileDrop?(file: File, content: string): void;
  handleFileAction?(action: string, data?: unknown): void;
  openFilePicker?(): void;
}

interface FileActionsToolbarProps {
  core: FileOpsCore;
  /** Callback to get current editor content (for Download .floorplan). */
  getContent?: () => string;
  /** Current filename for downloads (default: "Untitled.floorplan"). */
  filename?: string;
}

/** Trigger a browser download for the given content. */
function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Compact toolbar for file import/export actions in editor mode.
 *
 * - Import file... — opens a native file picker via core.openFilePicker()
 * - Download dropdown — download .floorplan, export JSON/GLB/GLTF
 */
export default function FileActionsToolbar(props: FileActionsToolbarProps) {
  const [showExportMenu, setShowExportMenu] = createSignal(false);
  const [menuPos, setMenuPos] = createSignal({ top: 0, left: 0 });
  let exportBtnRef: HTMLButtonElement | undefined;

  const handleImport = () => {
    props.core.openFilePicker?.();
  };

  /** Handle "Download .floorplan" directly (core's saveFloorplan needs editorInstance we don't have). */
  const handleSaveFloorplan = () => {
    const content = props.getContent?.();
    if (content == null) return;
    const filename = props.filename ?? 'Untitled.floorplan';
    downloadFile(filename, content, 'text/plain');
    setShowExportMenu(false);
  };

  /** Delegate 3D-dependent exports (JSON, GLB, GLTF) to core. */
  const handleExportAction = (action: string) => {
    props.core.handleFileAction?.(action);
    setShowExportMenu(false);
  };

  // Check if file operations are available on this core
  const hasFileOps = () => !!props.core.openFilePicker || !!props.core.handleFileAction;

  return (
    <Show when={hasFileOps()}>
      <div class="flex flex-nowrap items-center gap-1 px-2 py-1.5 overflow-hidden flex-shrink-0">
        {/* Import file */}
        <button
          type="button"
          class="btn btn-xs btn-ghost gap-1 flex-shrink-0"
          onClick={handleImport}
          title="Import file..."
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span class="hidden lg:inline">Import</span>
        </button>

        {/* Divider */}
        <div class="w-px h-4 bg-base-content/15 mx-0.5 flex-shrink-0" />

        {/* Export dropdown */}
        <div class="relative">
          <button
            ref={exportBtnRef}
            type="button"
            class="btn btn-xs btn-ghost gap-1 flex-shrink-0"
            onClick={() => {
              if (!showExportMenu() && exportBtnRef) {
                const rect = exportBtnRef.getBoundingClientRect();
                setMenuPos({ top: rect.bottom + 4, left: rect.left });
              }
              setShowExportMenu(!showExportMenu());
            }}
            title="Download / Export"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span class="hidden lg:inline">Export</span>
            <svg
              class="w-3 h-3 transition-transform"
              classList={{ 'rotate-180': showExportMenu() }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Portal-based dropdown to escape overflow-hidden containers */}
          <Show when={showExportMenu()}>
            <Portal>
              {/* Backdrop */}
              <div class="fixed inset-0 z-[9998]" onClick={() => setShowExportMenu(false)} />
              {/* Menu */}
              <div
                class="fixed z-[9999] bg-base-100 rounded-lg shadow-lg border border-base-300 py-1 min-w-[160px]"
                style={{ top: `${menuPos().top}px`, left: `${menuPos().left}px` }}
                data-theme={document.documentElement.getAttribute('data-theme') ?? undefined}
              >
                <button
                  type="button"
                  class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-base-200 transition-colors"
                  onClick={handleSaveFloorplan}
                >
                  <span class="text-base-content/50 text-xs w-12">.fp</span>
                  Download .floorplan
                </button>
                <div class="h-px bg-base-300 my-1 mx-2" />
                <button
                  type="button"
                  class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-base-200 transition-colors"
                  onClick={() => handleExportAction('export-json')}
                >
                  <span class="text-base-content/50 text-xs w-12">.json</span>
                  Export JSON
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-base-200 transition-colors"
                  onClick={() => handleExportAction('export-glb')}
                >
                  <span class="text-base-content/50 text-xs w-12">.glb</span>
                  Export GLB
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-base-200 transition-colors"
                  onClick={() => handleExportAction('export-gltf')}
                >
                  <span class="text-base-content/50 text-xs w-12">.gltf</span>
                  Export GLTF
                </button>
              </div>
            </Portal>
          </Show>
        </div>
      </div>
    </Show>
  );
}
