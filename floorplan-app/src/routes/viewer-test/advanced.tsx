import { clientOnly } from '@solidjs/start';

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(() => import('~/components/viewer/FloorplanContainer'));

/**
 * Test page for advanced viewer mode.
 * Route: /viewer-test/advanced
 *
 * This page tests the FloorplanContainer in advanced mode
 * (3D viewer with control panels).
 */
export default function ViewerTestAdvanced() {
  const testDsl = `floorplan

  floor MainFloor {
    room LivingRoom at (0,0) size (14 x 10) walls [top: window, right: solid, bottom: solid, left: solid] label "Living Room"
    room Kitchen size (10 x 8) walls [top: solid, right: window, bottom: solid, left: open] right-of LivingRoom label "Kitchen"
    room DiningRoom size (10 x 8) walls [top: solid, right: solid, bottom: window, left: solid] below LivingRoom label "Dining Room"
    room Hallway size (4 x 10) walls [top: solid, right: solid, bottom: solid, left: solid] right-of DiningRoom align top
    room MasterBedroom size (10 x 10) walls [top: solid, right: window, bottom: solid, left: solid] below DiningRoom gap 1 label "Master Bedroom"
    room Bathroom size (6 x 6) walls [top: solid, right: solid, bottom: solid, left: door] right-of MasterBedroom align top label "Bathroom"
  }

  connect LivingRoom.right to Kitchen.left door at 40%
  connect LivingRoom.bottom to DiningRoom.top door at 50%
  connect DiningRoom.right to Hallway.left door at 50%
  connect MasterBedroom.right to Bathroom.left door at 50%
`;

  return (
    <main class="h-screen w-screen">
      <FloorplanContainer dsl={testDsl} mode="advanced" theme="dark" onDslChange={() => {}} />
    </main>
  );
}
