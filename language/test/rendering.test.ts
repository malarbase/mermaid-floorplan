import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, render, generateDoor, generateConnections } from "floorplans-language";

let services: ReturnType<typeof createFloorplansServices>;
let parse: ReturnType<typeof parseHelper<Floorplan>>;

beforeAll(async () => {
  services = createFloorplansServices(EmptyFileSystem);
  parse = parseHelper<Floorplan>(services.Floorplans);
});

describe("Door Rendering Tests", () => {
  test("should generate single door SVG", () => {
    const door = generateDoor(0, 0, 1, 0.2, "top", "door");
    expect(door).toContain('<path');
    expect(door).toContain('class="door"');
    expect(door).toContain('data-type="door"');
  });

  test("should generate double-door SVG", () => {
    const door = generateDoor(0, 0, 2, 0.2, "top", "double-door");
    expect(door).toContain('<g class="double-door"');
    expect(door).toContain('data-type="double-door"');
    // Double door should have two paths
    expect(door.match(/<path/g)?.length).toBe(2);
  });

  test("should respect swing direction for single door", () => {
    const leftSwing = generateDoor(0, 0, 1, 0.2, "top", "door", "left");
    const rightSwing = generateDoor(0, 0, 1, 0.2, "top", "door", "right");
    
    expect(leftSwing).toContain('data-swing="left"');
    expect(rightSwing).toContain('data-swing="right"');
    // The SVG paths should be different
    expect(leftSwing).not.toBe(rightSwing);
  });

  test("should generate door for different wall directions", () => {
    const topDoor = generateDoor(0, 0, 1, 0.2, "top", "door");
    const bottomDoor = generateDoor(0, 0, 1, 0.2, "bottom", "door");
    const leftDoor = generateDoor(0, 0, 0.2, 1, "left", "door");
    const rightDoor = generateDoor(0, 0, 0.2, 1, "right", "door");
    
    expect(topDoor).toContain('data-direction="top"');
    expect(bottomDoor).toContain('data-direction="bottom"');
    expect(leftDoor).toContain('data-direction="left"');
    expect(rightDoor).toContain('data-direction="right"');
  });
});

describe("Connection Rendering Tests", () => {
  test("should render connection between adjacent rooms", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (5,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect RoomA.right to RoomB.left door
    `;
    
    const document = await parse(input);
    const floor = document.parseResult.value.floors[0];
    const connections = document.parseResult.value.connections;
    
    expect(floor).toBeDefined();
    expect(connections.length).toBe(1);
    
    const svg = generateConnections(floor!, connections);
    expect(svg).toContain('<path');
    expect(svg).toContain('class="door"');
  });

  test("should render double-door connection", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (5,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect RoomA.right to RoomB.left double-door
    `;
    
    const document = await parse(input);
    const floor = document.parseResult.value.floors[0];
    const connections = document.parseResult.value.connections;
    
    const svg = generateConnections(floor!, connections);
    expect(svg).toContain('class="double-door"');
  });

  test("should infer wall direction for adjacent rooms", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (5,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect RoomA to RoomB door
    `;
    
    const document = await parse(input);
    const floor = document.parseResult.value.floors[0];
    const connections = document.parseResult.value.connections;
    
    // Connection without explicit wall direction should still render
    const svg = generateConnections(floor!, connections);
    expect(svg).toContain('<path');
  });

  test("should return empty string for non-existent rooms", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect RoomA.right to NonExistent.left door
    `;
    
    const document = await parse(input);
    const floor = document.parseResult.value.floors[0];
    const connections = document.parseResult.value.connections;
    
    const svg = generateConnections(floor!, connections);
    expect(svg).toBe("");
  });
});

describe("Multi-Floor Rendering Tests", () => {
  test("should render first floor by default", async () => {
    const input = `
      floorplan
          floor Ground {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          floor First {
              room RoomB at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document);
    
    expect(svg).toContain('aria-label="Floor: Ground"');
    expect(svg).not.toContain('aria-label="Floor: First"');
  });

  test("should render specific floor by index", async () => {
    const input = `
      floorplan
          floor Ground {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          floor First {
              room RoomB at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { floorIndex: 1 });
    
    expect(svg).toContain('aria-label="Floor: First"');
    expect(svg).not.toContain('aria-label="Floor: Ground"');
  });

  test("should render all floors side by side", async () => {
    const input = `
      floorplan
          floor Ground {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          floor First {
              room RoomB at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { renderAllFloors: true, multiFloorLayout: 'sideBySide' });
    
    // Should contain both floors
    expect(svg).toContain('aria-label="Floor: Ground"');
    expect(svg).toContain('aria-label="Floor: First"');
    // Should have floor labels
    expect(svg).toContain('class="floor-label"');
  });

  test("should render all floors stacked", async () => {
    const input = `
      floorplan
          floor Ground {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          floor First {
              room RoomB at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { renderAllFloors: true, multiFloorLayout: 'stacked' });
    
    // Should contain both floors
    expect(svg).toContain('aria-label="Floor: Ground"');
    expect(svg).toContain('aria-label="Floor: First"');
  });

  test("should return empty SVG for non-existent floor index", async () => {
    const input = `
      floorplan
          floor Ground {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { floorIndex: 5 });
    
    expect(svg).toBe('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  });

  test("should handle empty floorplan", async () => {
    const input = `floorplan`;
    
    const document = await parse(input);
    const svg = render(document);
    
    expect(svg).toBe('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  });
});

describe("Door Position Tests", () => {
  test("should respect position percentage in connection", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (10 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (10,0) size (10 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect RoomA.right to RoomB.left door at 25%
    `;
    
    const document = await parse(input);
    const floor = document.parseResult.value.floors[0];
    const connections = document.parseResult.value.connections;
    
    expect(connections[0]?.position).toBe(25);
    
    const svg = generateConnections(floor!, connections);
    // Door should be rendered (position affects location, not presence)
    expect(svg).toContain('<path');
  });
});

describe("Metrics Computation Tests", () => {
  test("should compute room area", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const { convertFloorplanToJson } = await import("floorplans-language");
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.floors[0]?.rooms[0]?.area).toBe(120);
  });

  test("should compute room volume when height specified", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) height 3.5 walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const { convertFloorplanToJson } = await import("floorplans-language");
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.floors[0]?.rooms[0]?.area).toBe(120);
    expect(result.data!.floors[0]?.rooms[0]?.volume).toBe(420);
  });

  test("should compute floor metrics", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (10,0) size (15 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomC at (0,10) size (20 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const { convertFloorplanToJson } = await import("floorplans-language");
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    const metrics = result.data!.floors[0]?.metrics;
    expect(metrics).toBeDefined();
    expect(metrics!.netArea).toBe(450); // 100 + 150 + 200
    expect(metrics!.roomCount).toBe(3);
    expect(metrics!.boundingBox.width).toBe(25);
    expect(metrics!.boundingBox.height).toBe(20);
    expect(metrics!.boundingBox.area).toBe(500);
    expect(metrics!.efficiency).toBe(0.9); // 450/500
  });

  test("should compute floorplan summary", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (10,0) size (15 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomC at (0,10) size (20 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          floor f2 {
              room RoomD at (0,0) size (15 x 20) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const { convertFloorplanToJson } = await import("floorplans-language");
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.summary).toBeDefined();
    expect(result.data!.summary!.grossFloorArea).toBe(750); // 450 + 300
    expect(result.data!.summary!.totalRoomCount).toBe(4);
    expect(result.data!.summary!.floorCount).toBe(2);
  });
});

describe("SVG Area Annotations Tests", () => {
  test("should show room area when showArea is true", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { showArea: true, areaUnit: 'sqft' });
    
    expect(svg).toContain('class="room-area"');
    expect(svg).toContain('[120 sqft]');
  });

  test("should use correct area unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { showArea: true, areaUnit: 'sqm' });
    
    expect(svg).toContain('[120 sqm]');
  });

  test("should not show area when showArea is false", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { showArea: false });
    
    expect(svg).not.toContain('class="room-area"');
  });

  test("should show floor summary panel when showFloorSummary is true", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { showFloorSummary: true });
    
    expect(svg).toContain('class="floor-summary"');
    expect(svg).toContain('Floor Summary');
    expect(svg).toContain('Net Area:');
  });
});

describe("Dimension Line Tests", () => {
  test("should render dimension lines when showDimensions is true", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { showDimensions: true });
    
    expect(svg).toContain('class="room-dimensions"');
    expect(svg).toContain('class="dimension-line"');
  });

  test("should show width dimension value", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { showDimensions: true, dimensionTypes: ['width'] });
    
    // Should contain the width value "10"
    expect(svg).toContain('>10<');
  });

  test("should not render dimensions when showDimensions is false", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { showDimensions: false });
    
    expect(svg).not.toContain('class="room-dimensions"');
    expect(svg).not.toContain('class="dimension-line"');
  });

  test("should render height label when height is non-default", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (10 x 12) height 4 walls [top: solid, right: solid, bottom: solid, left: solid]
          }
    `;
    
    const document = await parse(input);
    const svg = render(document, { showDimensions: true, dimensionTypes: ['height'] });
    
    expect(svg).toContain('h: 4');
  });
});

