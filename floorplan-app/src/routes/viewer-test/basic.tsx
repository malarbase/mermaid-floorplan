import { clientOnly } from "@solidjs/start";

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(() =>
  import("~/components/viewer/FloorplanContainer")
);

/**
 * Test page for basic viewer mode.
 * Route: /viewer-test/basic
 *
 * This page tests the FloorplanContainer in basic mode
 * (3D viewer only, no UI controls).
 */
export default function ViewerTestBasic() {
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
    <main class="h-screen w-screen">
      <FloorplanContainer
        dsl={testDsl}
        mode="basic"
        theme="dark"
        onDslChange={() => {}}
      />
    </main>
  );
}
