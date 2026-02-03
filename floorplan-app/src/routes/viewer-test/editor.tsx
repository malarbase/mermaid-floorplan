import { clientOnly } from "@solidjs/start";
import { createSignal, createEffect } from "solid-js";

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(() =>
  import("~/components/viewer/FloorplanContainer")
);

/**
 * Test page for editor viewer mode.
 * Route: /viewer-test/editor
 *
 * This page tests the FloorplanContainer in editor mode
 * (3D viewer with editor and control panels).
 */
export default function ViewerTestEditor() {
  const [theme, setTheme] = createSignal<"light" | "dark">("dark");
  
  createEffect(() => {
    const currentTheme = theme();
    document.documentElement.dataset.theme = currentTheme;
    // Also toggle body.dark-theme class for viewer-core CSS compatibility
    document.body.classList.toggle('dark-theme', currentTheme === 'dark');
  });
  
  const testDsl = `floorplan TestHouse
  floor MainFloor 40x30
    room LivingRoom 20x15 at 0,0
      door south
      window east
    room Kitchen 15x12 at 20,0
      door west
      door south
    room DiningRoom 20x10 at 0,15
      door north
    room Hallway 5x15 at 20,12
      door north
      door south
`;

  return (
    <main class="h-screen flex flex-col bg-base-200">
      <header class="bg-base-100 border-b border-base-300 px-3 sm:px-4 py-2 sm:py-3">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div class="text-lg font-semibold">Viewer Test - Editor Mode</div>
          <div class="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              class="btn btn-ghost btn-sm"
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              title="Toggle theme"
            >
              {theme() === 'dark' ? '🌓' : '☀️'}
            </button>
          </div>
        </div>
      </header>
      <div class="flex-1 overflow-hidden">
        <FloorplanContainer
          dsl={testDsl}
          mode="editor"
          theme={theme()}
          onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          onDslChange={() => {}}
        />
      </div>
    </main>
  );
}
