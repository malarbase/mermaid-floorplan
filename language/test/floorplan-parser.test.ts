import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, resolveFloorPositions, resolveVariables, validateSizeReferences, getRoomSize } from "floorplans-language";

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
    expect(room?.position?.x?.value).toBe(1);
    expect(room?.position?.y?.value).toBe(2);
    expect(room?.size?.width?.value).toBe(10);
    expect(room?.size?.height?.value).toBe(12);
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
    expect(closet?.size?.width?.value).toBe(5);
    expect(closet?.size?.height?.value).toBe(5);

    const bathroom = mainRoom?.subRooms?.find((r) => r.name === "Bathroom");
    expect(bathroom?.subRooms).toHaveLength(1);

    const toilet = bathroom?.subRooms?.[0];
    expect(toilet?.name).toBe("Toilet");
    expect(toilet?.size?.width?.value).toBe(3);
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
    expect(room?.position?.x?.value).toBe(1.5);
    expect(room?.position?.y?.value).toBe(2.75);
    expect(room?.size?.width?.value).toBe(10.5);
    expect(room?.size?.height?.value).toBe(12.25);
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
    expect(roomB?.relativePosition?.gap?.value).toBe(2);
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
    expect(roomB?.relativePosition?.gap?.value).toBe(3);
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
    expect(roomB?.position?.x?.value).toBe(10);
    expect(roomB?.position?.y?.value).toBe(10);
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

describe("Connection Overlap Validation Tests", () => {
  test("should detect bidirectional connection overlap", async () => {
    const input = `
      floorplan
          floor f1 {
              room Office at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Kitchen at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Office.right to Kitchen.left door at 50%
          connect Kitchen.left to Office.right door at 50%
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    // Verify both connections are parsed
    expect(document.parseResult.value.connections).toHaveLength(2);
    
    // Run validation
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some(d => d.message.includes("bidirectional") || d.message.includes("Overlapping"))).toBe(true);
  });

  test("should detect multiple connections at same position", async () => {
    const input = `
      floorplan
          floor f1 {
              room Lobby at (0,0) size (13 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room StairLift at (13,0) size (8 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Terrace at (13,10) size (8 x 20) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect StairLift.left to Lobby.right door at 50%
          connect Lobby.right to Terrace.left double-door at 50%
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some(d => d.message.includes("Overlapping"))).toBe(true);
  });

  test("should allow separate connections on same wall with different positions", async () => {
    const input = `
      floorplan
          floor f1 {
              room Office at (0,0) size (20 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Kitchen at (20,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Office.right to Kitchen.left door at 25%
          connect Office.right to Kitchen.left door at 75%
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have no errors - positions are far apart (25% and 75%)
    expect(diagnostics.filter(d => d.severity === 1).length).toBe(0);
  });

  test("should allow connections on different walls", async () => {
    const input = `
      floorplan
          floor f1 {
              room Office at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Kitchen at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Hallway at (0,10) size (10 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Office.right to Kitchen.left door at 50%
          connect Office.bottom to Hallway.top door at 50%
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have no errors - different walls
    expect(diagnostics.filter(d => d.severity === 1).length).toBe(0);
  });

  test("should warn when connection references non-solid wall", async () => {
    const input = `
      floorplan
          floor f1 {
              room Bedroom at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: window, left: solid]
              room Bathroom at (0,10) size (10 x 6) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Bedroom.bottom to Bathroom.top door at 50%
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have warnings about non-solid wall
    const warnings = diagnostics.filter(d => d.severity === 2); // severity 2 = warning
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(d => d.message.includes("window") && d.message.includes("not 'solid'"))).toBe(true);
  });

  test("should warn about mismatched wall types", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (10 x 10) walls [top: solid, right: window, bottom: solid, left: solid]
              room RoomB at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect RoomA.right to RoomB.left door at 50%
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have warnings about mismatched wall types
    const warnings = diagnostics.filter(d => d.severity === 2);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(d => d.message.includes("mismatch") || d.message.includes("window"))).toBe(true);
  });
});

describe("Variables and Defaults Tests", () => {
  test("should parse define statement for dimension variable", async () => {
    const input = `
      floorplan
          define standard_bed (12 x 12)
          floor f1 {
              room Bedroom at (0,0) size standard_bed walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.defines).toHaveLength(1);
    expect(model.defines[0]?.name).toBe("standard_bed");
    expect(model.defines[0]?.value.width?.value).toBe(12);
    expect(model.defines[0]?.value.height?.value).toBe(12);
    
    const room = model.floors[0]?.rooms[0];
    expect(room?.size).toBeUndefined();
    expect(room?.sizeRef).toBe("standard_bed");
  });

  test("should parse multiple define statements", async () => {
    const input = `
      floorplan
          define small (5 x 5)
          define medium (10 x 10)
          define large (15 x 15)
          floor f1 {
              room SmallRoom at (0,0) size small walls [top: solid, right: solid, bottom: solid, left: solid]
              room MediumRoom at (10,0) size medium walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.defines).toHaveLength(3);
    expect(model.defines.map(d => d.name)).toEqual(["small", "medium", "large"]);
  });

  test("should parse config block with wall_thickness", async () => {
    const input = `
      floorplan
          config { wall_thickness: 0.5 }
          floor f1 {
              room TestRoom at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.config).toBeDefined();
    expect(model.config?.properties).toHaveLength(1);
    expect(model.config?.properties[0]?.name).toBe("wall_thickness");
    expect(model.config?.properties[0]?.value).toBe(0.5);
  });

  test("should parse config block with multiple properties", async () => {
    const input = `
      floorplan
          config { wall_thickness: 0.3, door_width: 1.0, window_width: 1.5, default_height: 3.0 }
          floor f1 {
              room TestRoom at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.config?.properties).toHaveLength(4);
  });

  test("should parse define and config together", async () => {
    const input = `
      floorplan
          define master_bed (15 x 12)
          config { wall_thickness: 0.25 }
          floor f1 {
              room MasterBedroom at (0,0) size master_bed walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.defines).toHaveLength(1);
    expect(model.config).toBeDefined();
    expect(model.config?.properties).toHaveLength(1);
  });

  test("should resolve variables correctly", async () => {
    const input = `
      floorplan
          define standard_room (10 x 8)
          floor f1 {
              room RoomA at (0,0) size standard_room walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const resolution = resolveVariables(model);
    
    expect(resolution.errors).toHaveLength(0);
    expect(resolution.variables.has("standard_room")).toBe(true);
    expect(resolution.variables.get("standard_room")).toEqual({ width: 10, height: 8 });
  });

  test("should detect undefined variable reference", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size undefined_var walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const resolution = resolveVariables(model);
    const sizeRefErrors = validateSizeReferences(model, resolution.variables);
    
    expect(sizeRefErrors).toHaveLength(1);
    expect(sizeRefErrors[0]?.type).toBe("undefined_variable");
    expect(sizeRefErrors[0]?.variableName).toBe("undefined_var");
  });

  test("should get resolved room size from variable", async () => {
    const input = `
      floorplan
          define compact (6 x 6)
          floor f1 {
              room SmallRoom at (0,0) size compact walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const resolution = resolveVariables(model);
    const room = model.floors[0]?.rooms[0]!;
    
    const size = getRoomSize(room, resolution.variables);
    expect(size).toEqual({ width: 6, height: 6 });
  });

  test("should resolve floor positions with variables", async () => {
    const input = `
      floorplan
          define room_size (5 x 5)
          floor f1 {
              room RoomA at (0,0) size room_size walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size room_size walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const variables = resolveVariables(model).variables;
    const floor = model.floors[0]!;
    const result = resolveFloorPositions(floor, variables);
    
    expect(result.errors).toHaveLength(0);
    expect(result.positions.get("RoomA")).toEqual({ x: 0, y: 0 });
    expect(result.positions.get("RoomB")).toEqual({ x: 5, y: 0 });
  });

  test("should mix inline sizes and variable references", async () => {
    const input = `
      floorplan
          define bathroom_size (4 x 4)
          floor f1 {
              room Bedroom at (0,0) size (12 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Bathroom at (12,0) size bathroom_size walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const bedroom = model.floors[0]?.rooms[0];
    const bathroom = model.floors[0]?.rooms[1];
    
    expect(bedroom?.size).toBeDefined();
    expect(bedroom?.sizeRef).toBeUndefined();
    expect(bathroom?.size).toBeUndefined();
    expect(bathroom?.sizeRef).toBe("bathroom_size");
  });
});

describe("Dimension Units Tests", () => {
  test("should parse dimension with meters unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room Bedroom at (0,0) size (4m x 3m) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.size?.width?.value).toBe(4);
    expect(room?.size?.width?.unit).toBe("m");
    expect(room?.size?.height?.value).toBe(3);
    expect(room?.size?.height?.unit).toBe("m");
  });

  test("should parse dimension with feet unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room Bedroom at (0,0) size (12ft x 10ft) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.size?.width?.value).toBe(12);
    expect(room?.size?.width?.unit).toBe("ft");
    expect(room?.size?.height?.value).toBe(10);
    expect(room?.size?.height?.unit).toBe("ft");
  });

  test("should parse dimension with centimeters unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room Closet at (0,0) size (150cm x 200cm) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.size?.width?.value).toBe(150);
    expect(room?.size?.width?.unit).toBe("cm");
    expect(room?.size?.height?.value).toBe(200);
    expect(room?.size?.height?.unit).toBe("cm");
  });

  test("should parse dimension with inches unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room Cabinet at (0,0) size (36in x 24in) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.size?.width?.value).toBe(36);
    expect(room?.size?.width?.unit).toBe("in");
    expect(room?.size?.height?.value).toBe(24);
    expect(room?.size?.height?.unit).toBe("in");
  });

  test("should parse dimension with millimeters unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room TinySpace at (0,0) size (500mm x 300mm) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.size?.width?.value).toBe(500);
    expect(room?.size?.width?.unit).toBe("mm");
    expect(room?.size?.height?.value).toBe(300);
    expect(room?.size?.height?.unit).toBe("mm");
  });

  test("should parse coordinate with units", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (5m, 10m) size (4m x 3m) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.position?.x?.value).toBe(5);
    expect(room?.position?.x?.unit).toBe("m");
    expect(room?.position?.y?.value).toBe(10);
    expect(room?.position?.y?.unit).toBe("m");
  });

  test("should parse gap with unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (5m x 5m) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB size (5m x 5m) walls [top: solid, right: solid, bottom: solid, left: solid] right-of RoomA gap 0.5m
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const roomB = document.parseResult.value.floors[0]?.rooms[1];
    expect(roomB?.relativePosition?.gap?.value).toBe(0.5);
    expect(roomB?.relativePosition?.gap?.unit).toBe("m");
  });

  test("should parse room height with unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room Kitchen at (0,0) size (4m x 3m) height 2.8m walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.height?.value).toBe(2.8);
    expect(room?.height?.unit).toBe("m");
  });

  test("should parse room elevation with unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room Loft at (0,0) size (10ft x 10ft) elevation 8ft walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.elevation?.value).toBe(8);
    expect(room?.elevation?.unit).toBe("ft");
    expect(room?.elevation?.negative).toBe(false);
  });

  test("should parse negative elevation with unit", async () => {
    const input = `
      floorplan
          floor f1 {
              room Basement at (0,0) size (10m x 10m) elevation -2.5m walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.elevation?.value).toBe(2.5);
    expect(room?.elevation?.unit).toBe("m");
    expect(room?.elevation?.negative).toBe(true);
  });

  test("should parse dimension without unit (backward compatibility)", async () => {
    const input = `
      floorplan
          floor f1 {
              room OldStyle at (0,0) size (10 x 8) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const room = document.parseResult.value.floors[0]?.rooms[0];
    expect(room?.size?.width?.value).toBe(10);
    expect(room?.size?.width?.unit).toBeUndefined();
    expect(room?.size?.height?.value).toBe(8);
    expect(room?.size?.height?.unit).toBeUndefined();
  });

  test("should parse mixed units and unit-less in same floorplan", async () => {
    const input = `
      floorplan
          floor f1 {
              room RoomA at (0,0) size (10 x 8) walls [top: solid, right: solid, bottom: solid, left: solid]
              room RoomB at (10m, 0) size (3m x 2m) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const roomA = model.floors[0]?.rooms[0];
    const roomB = model.floors[0]?.rooms[1];

    // RoomA - no units
    expect(roomA?.size?.width?.unit).toBeUndefined();
    
    // RoomB - has units
    expect(roomB?.size?.width?.unit).toBe("m");
  });

  test("should parse default_unit config", async () => {
    const input = `
      floorplan
          config { default_unit: ft }
          floor f1 {
              room Test at (0,0) size (10 x 8) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.config).toBeDefined();
    
    const defaultUnitProp = model.config?.properties.find(p => p.name === 'default_unit');
    expect(defaultUnitProp?.unitRef).toBe('ft');
  });

  test("should parse define statement with units", async () => {
    const input = `
      floorplan
          define master_bed (15ft x 12ft)
          floor f1 {
              room Bedroom at (0,0) size master_bed walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.defines[0]?.value.width?.value).toBe(15);
    expect(model.defines[0]?.value.width?.unit).toBe("ft");
    expect(model.defines[0]?.value.height?.value).toBe(12);
    expect(model.defines[0]?.value.height?.unit).toBe("ft");
  });

  test("should parse floor height with unit", async () => {
    const input = `
      floorplan
          floor Ground height 3.5m {
              room Test at (0,0) size (5m x 5m) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);

    const floor = document.parseResult.value.floors[0];
    expect(floor?.height?.value).toBe(3.5);
    expect(floor?.height?.unit).toBe("m");
  });
});

describe("Room Height Exceeds Floor Validation Tests", () => {
  test("should warn when room height exceeds floor height", async () => {
    const input = `
      floorplan
          floor SecondFloor height 12 {
              room HomeTheatre at (0,0) size (16 x 22) height 14 walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    // Run validation
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have a warning about room height exceeding floor height
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some(d => 
      d.message.includes("exceeds") && 
      d.message.includes("HomeTheatre") && 
      d.message.includes("14") && 
      d.message.includes("12")
    )).toBe(true);
  });

  test("should not warn when room height equals floor height", async () => {
    const input = `
      floorplan
          floor SecondFloor height 12 {
              room HomeTheatre at (0,0) size (16 x 22) height 12 walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have no warnings about room height exceeding floor height
    expect(diagnostics.filter(d => d.message.includes("exceeds")).length).toBe(0);
  });

  test("should not warn when room height is less than floor height", async () => {
    const input = `
      floorplan
          floor SecondFloor height 12 {
              room HomeTheatre at (0,0) size (16 x 22) height 10 walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have no warnings about room height exceeding floor height
    expect(diagnostics.filter(d => d.message.includes("exceeds")).length).toBe(0);
  });

  test("should use default height when room has no explicit height", async () => {
    const input = `
      floorplan
          config { default_height: 10 }
          floor SecondFloor height 12 {
              room NormalRoom at (0,0) size (16 x 22) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Room uses default height (10) which is less than floor height (12), no warning
    expect(diagnostics.filter(d => d.message.includes("exceeds")).length).toBe(0);
  });
});

describe("Connection Size Tests", () => {
  test("should parse connection with explicit size", async () => {
    const input = `
      floorplan
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left door at 50% size (3ft x 7ft)
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    const connection = document.parseResult.value.connections[0];
    expect(connection.size).toBeDefined();
    expect(connection.size?.width.value).toBe(3);
    expect(connection.size?.width.unit).toBe("ft");
    expect(connection.size?.height?.value).toBe(7);
    expect(connection.size?.height?.unit).toBe("ft");
    expect(connection.size?.fullHeight).toBeFalsy();
  });

  test("should parse connection with full height", async () => {
    const input = `
      floorplan
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left opening at 50% size (4m x full)
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    const connection = document.parseResult.value.connections[0];
    expect(connection.size).toBeDefined();
    expect(connection.size?.width.value).toBe(4);
    expect(connection.size?.width.unit).toBe("m");
    expect(connection.size?.fullHeight).toBe(true);
    expect(connection.size?.height).toBeUndefined();
  });

  test("should parse connection without size (uses defaults)", async () => {
    const input = `
      floorplan
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left door at 50%
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    const connection = document.parseResult.value.connections[0];
    expect(connection.size).toBeUndefined();
  });

  test("should parse door_size in config", async () => {
    const input = `
      floorplan
          config { door_size: (3 x 7), default_unit: ft }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    const config = document.parseResult.value.config;
    const doorSizeProp = config?.properties.find(p => p.name === "door_size");
    expect(doorSizeProp).toBeDefined();
    expect(doorSizeProp?.dimension?.width.value).toBe(3);
    expect(doorSizeProp?.dimension?.height.value).toBe(7);
  });

  test("should parse window_size in config", async () => {
    const input = `
      floorplan
          config { window_size: (4 x 3), default_unit: m }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    const config = document.parseResult.value.config;
    const windowSizeProp = config?.properties.find(p => p.name === "window_size");
    expect(windowSizeProp).toBeDefined();
    expect(windowSizeProp?.dimension?.width.value).toBe(4);
    expect(windowSizeProp?.dimension?.height.value).toBe(3);
  });

  test("should parse connection with size and swing direction", async () => {
    const input = `
      floorplan
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left door at 50% size (2.5ft x 7ft) swing: left
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    const connection = document.parseResult.value.connections[0];
    expect(connection.size).toBeDefined();
    expect(connection.size?.width.value).toBe(2.5);
    expect(connection.swing).toBe("left");
  });
});

describe("Connection Size Validation Tests", () => {
  test("should warn when connection width exceeds shared wall length", async () => {
    const input = `
      floorplan
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left door at 50% size (15 x 7)
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have a warning about connection width exceeding wall length
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some(d => 
      d.message.includes("width") && 
      d.message.includes("exceeds") &&
      d.message.includes("15")
    )).toBe(true);
  });

  test("should warn when connection height exceeds room height", async () => {
    const input = `
      floorplan
          config { default_height: 8 }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left door at 50% size (3 x 10)
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have a warning about connection height exceeding room height
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some(d => 
      d.message.includes("height") && 
      d.message.includes("exceeds") &&
      d.message.includes("10")
    )).toBe(true);
  });

  test("should not warn when connection uses fullHeight", async () => {
    const input = `
      floorplan
          config { default_height: 8 }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left opening at 50% size (4 x full)
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should not warn about height when fullHeight is used
    expect(diagnostics.filter(d => d.message.includes("height") && d.message.includes("exceeds")).length).toBe(0);
  });

  test("should not warn when connection dimensions are within limits", async () => {
    const input = `
      floorplan
          config { default_height: 10 }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left door at 50% size (3 x 7)
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have no warnings about size constraints
    expect(diagnostics.filter(d => d.message.includes("exceeds")).length).toBe(0);
  });

  test("should warn when connection width exceeds partial shared wall", async () => {
    const input = `
      floorplan
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
              room Room2 at (10,5) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
          connect Room1.right to Room2.left door at 50% size (8 x 7)
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Shared wall is only 5 units (overlap from z=5 to z=10), connection width of 8 exceeds it
    expect(diagnostics.some(d => 
      d.message.includes("width") && 
      d.message.includes("exceeds")
    )).toBe(true);
  });
});

describe("Conflicting Door Size Config Validation Tests", () => {
  test("should warn when both door_size and door_width/door_height are specified", async () => {
    const input = `
      floorplan
          config { 
            door_size: (3 x 7),
            door_width: 2.5,
            door_height: 6.5
          }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have a warning about conflicting door size config
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some(d => 
      d.message.includes("door_size") && 
      d.message.includes("door_width") &&
      d.message.includes("door_height")
    )).toBe(true);
  });

  test("should warn when both window_size and window_width/window_height are specified", async () => {
    const input = `
      floorplan
          config { 
            window_size: (4 x 3),
            window_width: 5,
            window_height: 4
          }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have a warning about conflicting window size config
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some(d => 
      d.message.includes("window_size") && 
      d.message.includes("window_width") &&
      d.message.includes("window_height")
    )).toBe(true);
  });

  test("should not warn when only door_size is specified", async () => {
    const input = `
      floorplan
          config { door_size: (3 x 7) }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have no warnings about conflicting config
    expect(diagnostics.filter(d => d.message.includes("door_size") && d.message.includes("redundant")).length).toBe(0);
  });

  test("should not warn when only door_width and door_height are specified", async () => {
    const input = `
      floorplan
          config { 
            door_width: 3,
            door_height: 7
          }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should have no warnings about conflicting config
    expect(diagnostics.filter(d => d.message.includes("door_size")).length).toBe(0);
  });

  test("should warn when door_size conflicts with only door_width", async () => {
    const input = `
      floorplan
          config { 
            door_size: (3 x 7),
            door_width: 2.5
          }
          floor f1 {
              room Room1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          }
      `;

    const document = await parse(input);
    expectNoErrors(document);
    
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const diagnostics = document.diagnostics ?? [];
    
    // Should warn about door_width being redundant
    expect(diagnostics.some(d => 
      d.message.includes("door_size") && 
      d.message.includes("door_width") &&
      d.message.includes("redundant")
    )).toBe(true);
  });
});
