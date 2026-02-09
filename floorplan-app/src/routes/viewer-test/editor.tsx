import { clientOnly } from '@solidjs/start';
import { Header } from '~/components/Header';

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(() => import('~/components/viewer/FloorplanContainer'));

/**
 * Test page for editor viewer mode.
 * Route: /viewer-test/editor
 *
 * This page tests the FloorplanContainer in editor mode
 * (3D viewer with editor and control panels).
 */
export default function ViewerTestEditor() {
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
      <Header
        centerContent={<div class="text-lg font-semibold">Viewer Test - Editor Mode</div>}
        hideUserMenu
      />
      <div class="flex-1 overflow-hidden">
        <FloorplanContainer dsl={testDsl} mode="editor" onDslChange={() => {}} />
      </div>
    </main>
  );
}
