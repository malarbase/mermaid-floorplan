import { Title } from "@solidjs/meta";
import { clientOnly } from "@solidjs/start";
import { Header } from "~/components/Header";

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanEmbed = clientOnly(() => import("~/components/FloorplanEmbed"));

/**
 * Test page for 3D viewer rendering.
 * Route: /viewer-test
 * 
 * This page is used to test the FloorplanEmbed component
 * and verify 3D rendering works correctly in SolidStart.
 */
export default function ViewerTest() {
  // Sample floorplan DSL for testing
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
    <main class="min-h-screen bg-base-200">
      <Title>3D Viewer Test - Floorplan App</Title>

      {/* Header */}
      <Header backHref="/" backLabel="Home" />

      {/* Page title section */}
      <div class="bg-base-100 border-b border-base-300 px-4 py-3">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-xl font-bold">3D Viewer Test</h1>
          <p class="text-sm text-base-content/70">
            Testing FloorplanEmbed component with Three.js rendering
          </p>
        </div>
      </div>

      {/* Viewer Container - Full height minus header */}
      <div class="h-[calc(100vh-140px)]">
        <FloorplanEmbed
          dsl={testDsl}
          editable={false}
        />
      </div>
    </main>
  );
}
