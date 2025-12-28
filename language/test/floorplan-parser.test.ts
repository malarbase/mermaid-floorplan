import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, resolveFloorPositions } from "floorplans-language";

let services: ReturnType<typeof createFloorplansServices>;
let parse: ReturnType<typeof parseHelper<Floorplan>>;

function expectNoErrors(document: LangiumDocument): void {
  if (document.parseResult.parserErrors.length) {
    console.error(document.parseResult.parserErrors);
  }
  expect(document.parseResult.parserErrors).toHaveLength(0);
  expect(document.parseResult.value).toBeDefined(); // TODO: this is not working
}

beforeAll(async () => {
  services = createFloorplansServices(EmptyFileSystem);
  parse = parseHelper<Floorplan>(services.Floorplans);

  // activate the following if your linking test requires elements from a built-in library, for example
  // await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
});
describe("Floorplan Langium Parser Tests", () => {
  test("should parse basic floorplan structure", async () => {
    const input = `
      floorplan
          floor f1 {
              room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.floors).toHaveLength(1);
    expect(model.floors[0]?.id).toBe("f1");
    expect(model.floors[0]?.rooms).toHaveLength(1);

    const room = model.floors[0]?.rooms[0];
    expect(room?.name).toBe("TestRoom");
    expect(room?.position?.x).toBe(1);
    expect(room?.position?.y).toBe(2);
    expect(room?.size?.width).toBe(10);
    expect(room?.size?.height).toBe(12);
    expect(room?.walls?.specifications).toHaveLength(4);
  });

  test("should parse room with multiple wall types", async () => {
    const input = `
      floorplan
          floor f1 {
              room MultiWallRoom at (5,5) size (8 x 6) walls [
                  top: solid, 
                  right: window, 
                  bottom: door, 
                  left: open
              ] label "Multi Wall Room"
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const room = model.floors[0]?.rooms[0];
    const walls = room?.walls?.specifications;

    expect(walls).toHaveLength(4);
    expect(walls?.find((w) => w.direction === "top")?.type).toBe("solid");
    expect(walls?.find((w) => w.direction === "right")?.type).toBe("window");
    expect(walls?.find((w) => w.direction === "bottom")?.type).toBe("door");
    expect(walls?.find((w) => w.direction === "left")?.type).toBe("open");
  });

  test("should parse connections with different options", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: door, bottom: solid, left: solid]
              room RoomB at (5,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: door]
          }
          connect RoomA.right to RoomB.left door at 50% opens into RoomA swing: left
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const connection = document.parseResult.value.connections[0];
    expect(connection?.position).toBe(50);
    expect(connection?.opensInto?.name).toBe("RoomA");
    expect(connection?.swing).toBe("left");
  });

  test("should parse complex nested room structure", async () => {
    const input = `
      floorplan
          floor f1 {
              room MainRoom at (0,0) size (20 x 15) walls [top: solid, right: solid, bottom: solid, left: solid] composed of [
                  sub-room Closet at (15,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: door]
                  sub-room Bathroom at (0,10) size (8 x 5) walls [top: door, right: solid, bottom: solid, left: solid] composed of [
                      sub-room Toilet at (0,0) size (3 x 3) walls [top: solid, right: door, bottom: solid, left: solid]
                  ]
              ]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const mainRoom = model.floors[0]?.rooms[0];

    expect(mainRoom?.subRooms).toHaveLength(2);

    const closet = mainRoom?.subRooms?.find((r) => r.name === "Closet");
    expect(closet?.size?.width).toBe(5);
    expect(closet?.size?.height).toBe(5);

    const bathroom = mainRoom?.subRooms?.find((r) => r.name === "Bathroom");
    expect(bathroom?.subRooms).toHaveLength(1);

    const toilet = bathroom?.subRooms?.[0];
    expect(toilet?.name).toBe("Toilet");
    expect(toilet?.size?.width).toBe(3);
  });

  test("should parse sub-room type explicitly", async () => {
    const input = `
      floorplan
          floor f1 {
              sub-room SubRoom at (10,10) size (4 x 4) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.type).toBe("sub-room");
    expect(room?.name).toBe("SubRoom");
  });

  test("should parse wall references with and without wall direction", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: door, bottom: solid, left: solid]
              room RoomB at (5,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: door]
          }
          connect RoomA.right to RoomB.left door
          connect RoomA to RoomB door
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const connections = document.parseResult.value.connections;
    expect(connections[0]?.from?.wall).toBe("right");
    expect(connections[0]?.to?.wall).toBe("left");
    expect(connections[1]?.from?.wall).toBeUndefined();
    expect(connections[1]?.to?.wall).toBeUndefined();
  });

  test("should parse connections with all optional properties", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: door, bottom: solid, left: solid]
              room RoomB at (5,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: door]
          }
          connect RoomA.right to RoomB.left double-door at 75% opens into RoomB swing: right
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const connection = document.parseResult.value.connections[0];
    expect(connection?.doorType).toBe("double-door");
    expect(connection?.position).toBe(75);
    expect(connection?.opensInto?.name).toBe("RoomB");
    expect(connection?.swing).toBe("right");
  });

  test("should parse empty floor", async () => {
    const input = `
      floorplan
          floor f1 {
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0];
    expect(floor?.rooms).toHaveLength(0);
  });

  test("should parse floorplan with no floors or connections", async () => {
    const input = `floorplan`;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.floors).toHaveLength(0);
    expect(model.connections).toHaveLength(0);
  });

  test("should parse multiple floors and connections", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: door, bottom: solid, left: solid]
          }
          floor f2 {
              room RoomB at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: door]
          }
          connect RoomA.right to outside door
          connect outside to RoomB.left door
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.floors).toHaveLength(2);
    expect(model.connections).toHaveLength(2);
    expect(model.floors[0]?.id).toBe("f1");
    expect(model.floors[1]?.id).toBe("f2");
  });

  test("should parse comments", async () => {
    const input = `
      /* This is a multi-line comment */
      floorplan
          # This is a single-line comment
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: door, bottom: solid, left: solid] # Room comment
          }
          /* Connection comment */
          connect RoomA.right to outside door
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.floors).toHaveLength(1);
    expect(model.connections).toHaveLength(1);
  });

  test("should parse decimal numbers", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (1.5,2.75) size (10.5 x 12.25) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.position?.x).toBe(1.5);
    expect(room?.position?.y).toBe(2.75);
    expect(room?.size?.width).toBe(10.5);
    expect(room?.size?.height).toBe(12.25);
  });

  test("should parse room with label", async () => {
    const input = `
      floorplan
          floor f1 {
              room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid] label "Test Room Label"
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.label).toBe("Test Room Label");
  });

  test("should parse room without label", async () => {
    const input = `
      floorplan
          floor f1 {
              room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.label).toBeUndefined();
  });
});

describe("Relative Positioning Parser Tests", () => {
  test("should parse basic right-of positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const roomB = model.floors[0]?.rooms[1];
    expect(roomB?.name).toBe("RoomB");
    expect(roomB?.position).toBeUndefined();
    expect(roomB?.relativePosition?.direction).toBe("right-of");
    expect(roomB?.relativePosition?.reference).toBe("RoomA");
  });

  test("should parse left-of positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (10,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] left-of RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.direction).toBe("left-of");
    expect(roomB?.relativePosition?.reference).toBe("RoomA");
  });

  test("should parse below positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] below RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.direction).toBe("below");
    expect(roomB?.relativePosition?.reference).toBe("RoomA");
  });

  test("should parse above positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,10) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] above RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.direction).toBe("above");
    expect(roomB?.relativePosition?.reference).toBe("RoomA");
  });

  test("should parse diagonal positioning (below-right-of)", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] below-right-of RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.direction).toBe("below-right-of");
  });

  test("should parse relative positioning with gap", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA gap 2
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.direction).toBe("right-of");
    expect(roomB?.relativePosition?.gap).toBe(2);
  });

  test("should parse relative positioning with alignment", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA align bottom
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.direction).toBe("right-of");
    expect(roomB?.relativePosition?.alignment).toBe("bottom");
  });

  test("should parse relative positioning with gap and alignment", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA gap 3 align center
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.direction).toBe("right-of");
    expect(roomB?.relativePosition?.gap).toBe(3);
    expect(roomB?.relativePosition?.alignment).toBe("center");
  });

  test("should parse room with both explicit position and relative position", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (10,10) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    // Both explicit and relative positions should be parsed
    expect(roomB?.position?.x).toBe(10);
    expect(roomB?.position?.y).toBe(10);
    expect(roomB?.relativePosition?.direction).toBe("right-of");
  });

  test("should parse relative positioning with label", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA label "Room B Label"
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.direction).toBe("right-of");
    expect(roomB?.label).toBe("Room B Label");
  });

  test("should parse chain of relative positions", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA
              room RoomC size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomB
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.floors[0]?.rooms[1]?.relativePosition?.reference).toBe("RoomA");
    expect(model.floors[0]?.rooms[2]?.relativePosition?.reference).toBe("RoomB");
  });
});

describe("Position Resolution Tests", () => {
  test("should resolve right-of positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    expect(result.positions.get("RoomA")).toEqual({ x: 0, y: 0 });
    expect(result.positions.get("RoomB")).toEqual({ x: 5, y: 0 });
  });

  test("should resolve left-of positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (10,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] left-of RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    expect(result.positions.get("RoomB")).toEqual({ x: 5, y: 0 });
  });

  test("should resolve below positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] below RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    expect(result.positions.get("RoomB")).toEqual({ x: 0, y: 5 });
  });

  test("should resolve above positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,10) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] above RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    expect(result.positions.get("RoomB")).toEqual({ x: 0, y: 5 });
  });

  test("should resolve positioning with gap", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA gap 2
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    expect(result.positions.get("RoomB")).toEqual({ x: 7, y: 0 });
  });

  test("should resolve positioning with bottom alignment", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA align bottom
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    // RoomB should align its bottom with RoomA's bottom
    // RoomA: height=10, starts at y=0, bottom at y=10
    // RoomB: height=5, bottom should be at y=10, so top at y=5
    expect(result.positions.get("RoomB")).toEqual({ x: 5, y: 5 });
  });

  test("should resolve positioning with center alignment", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 4) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA align center
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    // RoomA center y = 5, RoomB height = 4, so RoomB y = 5 - 2 = 3
    expect(result.positions.get("RoomB")).toEqual({ x: 5, y: 3 });
  });

  test("should resolve chained positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA
              room RoomC size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomB
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    expect(result.positions.get("RoomA")).toEqual({ x: 0, y: 0 });
    expect(result.positions.get("RoomB")).toEqual({ x: 5, y: 0 });
    expect(result.positions.get("RoomC")).toEqual({ x: 10, y: 0 });
  });

  test("should detect circular dependency", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomB
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.type === "circular_dependency")).toBe(true);
  });

  test("should detect missing reference", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of NonExistent
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.type === "missing_reference")).toBe(true);
  });

  test("should detect room with no position", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.type === "no_position")).toBe(true);
  });

  test("should detect overlapping rooms", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (5,5) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.room1).toBeDefined();
    expect(result.warnings[0]?.room2).toBeDefined();
  });

  test("should resolve diagonal positioning", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] below-right-of RoomA gap 1
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0]!;
    const result = resolveFloorPositions(floor);
    
    expect(result.errors).toHaveLength(0);
    // below-right-of with gap 1: x = 0 + 5 + 1 = 6, y = 0 + 5 + 1 = 6
    expect(result.positions.get("RoomB")).toEqual({ x: 6, y: 6 });
  });
});
