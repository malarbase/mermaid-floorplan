import { describe, it, expect, beforeAll } from "vitest";
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, convertFloorplanToJson } from "floorplans-language";

let parse: ReturnType<typeof parseHelper<Floorplan>>;

beforeAll(async () => {
  const services = createFloorplansServices(EmptyFileSystem);
  parse = parseHelper<Floorplan>(services.Floorplans);
});

describe("JSON Converter - Config", () => {
  it("should export default_unit from config", async () => {
    const input = `
      floorplan
        config { default_unit: ft }
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.config?.default_unit).toBe("ft");
  });

  it("should export area_unit from config", async () => {
    const input = `
      floorplan
        config { area_unit: sqm }
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.config?.area_unit).toBe("sqm");
  });

  it("should export numeric config values", async () => {
    const input = `
      floorplan
        config { wall_thickness: 0.3, default_height: 3.0, door_width: 1.0 }
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.config?.wall_thickness).toBe(0.3);
    expect(result.data!.config?.default_height).toBe(3.0);
    expect(result.data!.config?.door_width).toBe(1.0);
  });

  it("should export default_style from config", async () => {
    const input = `
      floorplan
        style DefaultStyle { floor_color: "#FFFFFF" }
        config { default_style: DefaultStyle }
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.config?.default_style).toBe("DefaultStyle");
  });
});

describe("JSON Converter - Styles", () => {
  it("should export style definitions", async () => {
    const input = `
      floorplan
        style LivingRoom {
          floor_color: "#D4A574",
          wall_color: "#F5F0E6",
          roughness: 0.6,
          metalness: 0.0
        }
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.styles).toHaveLength(1);
    
    const style = result.data!.styles![0];
    expect(style.name).toBe("LivingRoom");
    expect(style.floor_color).toBe("#D4A574");
    expect(style.wall_color).toBe("#F5F0E6");
    expect(style.roughness).toBe(0.6);
    expect(style.metalness).toBe(0.0);
  });

  it("should export multiple styles", async () => {
    const input = `
      floorplan
        style StyleA { floor_color: "#AAA" }
        style StyleB { floor_color: "#BBB" }
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.styles).toHaveLength(2);
    expect(result.data!.styles![0].name).toBe("StyleA");
    expect(result.data!.styles![1].name).toBe("StyleB");
  });
});

describe("JSON Converter - Rooms", () => {
  it("should export room position and size", async () => {
    const input = `
      floorplan
        floor f1 {
          room Kitchen at (5, 10) size (12 x 8) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    const room = result.data!.floors[0].rooms[0];
    expect(room.name).toBe("Kitchen");
    expect(room.x).toBe(5);
    expect(room.z).toBe(10);
    expect(room.width).toBe(12);
    expect(room.height).toBe(8);
  });

  it("should export room label", async () => {
    const input = `
      floorplan
        floor f1 {
          room MasterBed at (0,0) size (15 x 12) walls [top: solid, right: solid, bottom: solid, left: solid] label "Master Bedroom"
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const room = result.data!.floors[0].rooms[0];
    expect(room.label).toBe("Master Bedroom");
  });

  it("should export room height", async () => {
    const input = `
      floorplan
        floor f1 {
          room Tall at (0,0) size (10 x 10) height 4.5 walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const room = result.data!.floors[0].rooms[0];
    expect(room.roomHeight).toBe(4.5);
  });

  it("should export room elevation", async () => {
    const input = `
      floorplan
        floor f1 {
          room Sunken at (0,0) size (10 x 10) elevation -1.5 walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const room = result.data!.floors[0].rooms[0];
    expect(room.elevation).toBe(-1.5);
  });

  it("should export room style reference", async () => {
    const input = `
      floorplan
        style Bedroom { floor_color: "#CCC" }
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid] style Bedroom
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const room = result.data!.floors[0].rooms[0];
    expect(room.style).toBe("Bedroom");
  });

  it("should resolve room size from variable", async () => {
    const input = `
      floorplan
        define medium_room (12 x 14)
        floor f1 {
          room R1 at (0,0) size medium_room walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const room = result.data!.floors[0].rooms[0];
    expect(room.width).toBe(12);
    expect(room.height).toBe(14);
  });
});

describe("JSON Converter - Walls", () => {
  it("should export wall specifications", async () => {
    const input = `
      floorplan
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: door, bottom: window, left: open]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const walls = result.data!.floors[0].rooms[0].walls;
    expect(walls).toHaveLength(4);
    
    const top = walls.find(w => w.direction === "top");
    const right = walls.find(w => w.direction === "right");
    const bottom = walls.find(w => w.direction === "bottom");
    const left = walls.find(w => w.direction === "left");
    
    expect(top?.type).toBe("solid");
    expect(right?.type).toBe("door");
    expect(bottom?.type).toBe("window");
    expect(left?.type).toBe("open");
  });

  it("should export wall position as percentage", async () => {
    const input = `
      floorplan
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: door at 30%, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const door = result.data!.floors[0].rooms[0].walls.find(w => w.direction === "right");
    expect(door?.position).toBe(30);
    expect(door?.isPercentage).toBe(true);
  });

  it("should export window with size", async () => {
    const input = `
      floorplan
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: window at 50% size (4 x 1.5), right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const window = result.data!.floors[0].rooms[0].walls.find(w => w.direction === "top");
    expect(window?.type).toBe("window");
    expect(window?.position).toBe(50);
    expect(window?.isPercentage).toBe(true);
    expect(window?.width).toBe(4);
    expect(window?.height).toBe(1.5);
  });
});

describe("JSON Converter - Floors", () => {
  it("should export floor index", async () => {
    const input = `
      floorplan
        floor Ground {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        floor First {
          room R2 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.floors).toHaveLength(2);
    expect(result.data!.floors[0].id).toBe("Ground");
    expect(result.data!.floors[0].index).toBe(0);
    expect(result.data!.floors[1].id).toBe("First");
    expect(result.data!.floors[1].index).toBe(1);
  });

  it("should export floor height", async () => {
    const input = `
      floorplan
        floor Ground height 11 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.floors[0].height).toBe(11);
  });
});

describe("JSON Converter - Connections", () => {
  it("should export connections between rooms", async () => {
    const input = `
      floorplan
        floor f1 {
          room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room RoomB at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect RoomA.right to RoomB.left door at 50%
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.connections).toHaveLength(1);
    const conn = result.data!.connections[0];
    expect(conn.fromRoom).toBe("RoomA");
    expect(conn.fromWall).toBe("right");
    expect(conn.toRoom).toBe("RoomB");
    expect(conn.toWall).toBe("left");
    expect(conn.doorType).toBe("door");
    expect(conn.position).toBe(50);
  });

  it("should export double-door connection", async () => {
    const input = `
      floorplan
        floor f1 {
          room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room RoomB at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect RoomA.right to RoomB.left double-door
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.connections[0].doorType).toBe("double-door");
  });

  it("should export connection with explicit size", async () => {
    const input = `
      floorplan
        floor f1 {
          room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room RoomB at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect RoomA.right to RoomB.left door at 50% size (3 x 7)
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const conn = result.data!.connections[0];
    expect(conn.width).toBe(3);
    expect(conn.height).toBe(7);
    expect(conn.fullHeight).toBeUndefined();
  });

  it("should export connection with full height", async () => {
    const input = `
      floorplan
        floor f1 {
          room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room RoomB at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect RoomA.right to RoomB.left opening at 50% size (4 x full)
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const conn = result.data!.connections[0];
    expect(conn.width).toBe(4);
    expect(conn.fullHeight).toBe(true);
    expect(conn.height).toBeUndefined();
  });

  it("should export door_size in config", async () => {
    const input = `
      floorplan
        config { door_size: (3 x 7) }
        floor f1 {
          room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.config?.door_size).toEqual([3, 7]);
  });

  it("should export window_size in config", async () => {
    const input = `
      floorplan
        config { window_size: (4 x 3) }
        floor f1 {
          room RoomA at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.config?.window_size).toEqual([4, 3]);
  });
});

describe("JSON Converter - Room Metrics", () => {
  it("should compute room area", async () => {
    const input = `
      floorplan
        floor f1 {
          room Kitchen at (0,0) size (12 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const room = result.data!.floors[0].rooms[0];
    expect(room.area).toBe(120); // 12 × 10
  });

  it("should compute room volume when height specified", async () => {
    const input = `
      floorplan
        floor f1 {
          room Tall at (0,0) size (10 x 10) height 3.5 walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const room = result.data!.floors[0].rooms[0];
    expect(room.area).toBe(100); // 10 × 10
    expect(room.volume).toBe(350); // 100 × 3.5
  });

  it("should not compute volume when height not specified", async () => {
    const input = `
      floorplan
        floor f1 {
          room R1 at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const room = result.data!.floors[0].rooms[0];
    expect(room.volume).toBeUndefined();
  });
});

describe("JSON Converter - Floor Metrics", () => {
  it("should compute floor net area", async () => {
    const input = `
      floorplan
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room B at (10,0) size (15 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const metrics = result.data!.floors[0].metrics;
    expect(metrics).toBeDefined();
    expect(metrics!.netArea).toBe(250); // 100 + 150
    expect(metrics!.roomCount).toBe(2);
  });

  it("should compute floor bounding box", async () => {
    const input = `
      floorplan
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room B at (10,0) size (15 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room C at (0,10) size (20 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const bb = result.data!.floors[0].metrics!.boundingBox;
    expect(bb.minX).toBe(0);
    expect(bb.minY).toBe(0);
    expect(bb.width).toBe(25); // max(10, 10+15, 20) = 25
    expect(bb.height).toBe(15); // max(10, 10, 10+5) = 15
    expect(bb.area).toBe(375); // 25 × 15
  });

  it("should compute floor efficiency", async () => {
    const input = `
      floorplan
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room B at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const metrics = result.data!.floors[0].metrics;
    // Net area = 200, bounding box = 20 × 10 = 200
    // Efficiency = 200 / 200 = 1.0
    expect(metrics!.efficiency).toBe(1.0);
  });
});

describe("JSON Converter - Floorplan Summary", () => {
  it("should compute gross floor area", async () => {
    const input = `
      floorplan
        floor Ground {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        floor First {
          room B at (0,0) size (15 x 15) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.summary).toBeDefined();
    expect(result.data!.summary!.grossFloorArea).toBe(325); // 100 + 225
    expect(result.data!.summary!.totalRoomCount).toBe(2);
    expect(result.data!.summary!.floorCount).toBe(2);
  });
});

describe("JSON Converter - Relative Positioning", () => {
  it("should resolve relative positions", async () => {
    const input = `
      floorplan
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room B size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid] right-of A
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const rooms = result.data!.floors[0].rooms;
    const roomA = rooms.find(r => r.name === "A");
    const roomB = rooms.find(r => r.name === "B");
    
    expect(roomA!.x).toBe(0);
    expect(roomA!.z).toBe(0);
    expect(roomB!.x).toBe(10); // right-of A (A.x + A.width)
    expect(roomB!.z).toBe(0);  // same Y as A (top aligned)
  });

  it("should resolve below with alignment", async () => {
    const input = `
      floorplan
        floor f1 {
          room A at (0,0) size (20 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room B size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid] below A align right
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const roomB = result.data!.floors[0].rooms.find(r => r.name === "B");
    expect(roomB!.x).toBe(10); // A.x + A.width - B.width = 0 + 20 - 10 = 10
    expect(roomB!.z).toBe(10); // A.z + A.height = 0 + 10 = 10
  });
});

describe("JSON Converter - Error Handling", () => {
  it("should handle empty floorplan", async () => {
    const input = `floorplan`;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.floors).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("should handle floor with no rooms", async () => {
    const input = `
      floorplan
        floor Empty {
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.floors).toHaveLength(1);
    expect(result.data!.floors[0].rooms).toHaveLength(0);
  });
});

describe("JSON Converter - Stairs", () => {
  it("should export straight stair", async () => {
    const input = `
      floorplan
        floor f1 {
          stair MainStair at (10, 20) shape straight direction north rise 10ft width 3.5ft
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.floors[0].stairs).toHaveLength(1);
    
    const stair = result.data!.floors[0].stairs[0];
    expect(stair.name).toBe("MainStair");
    expect(stair.x).toBe(10);
    expect(stair.z).toBe(20);
    expect(stair.shape.type).toBe("straight");
    expect(stair.rise).toBe(10);
    expect(stair.width).toBe(3.5);
  });

  it("should export L-shaped stair", async () => {
    const input = `
      floorplan
        floor f1 {
          stair CornerStair shape L-shaped entry south turn left runs 6, 6 rise 10ft width 3.5ft
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const stair = result.data!.floors[0].stairs[0];
    expect(stair.shape.type).toBe("L-shaped");
    expect(stair.shape.entry).toBe("south");
    expect(stair.shape.turn).toBe("left");
    expect(stair.shape.runs).toEqual([6, 6]);
  });

  it("should export spiral stair", async () => {
    const input = `
      floorplan
        floor f1 {
          stair SpiralStair shape spiral rotation clockwise outer-radius 4ft rise 10ft
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const stair = result.data!.floors[0].stairs[0];
    expect(stair.shape.type).toBe("spiral");
    expect(stair.shape.rotation).toBe("clockwise");
    expect(stair.shape.outerRadius).toBe(4);
  });

  it("should export custom segmented stair", async () => {
    const input = `
      floorplan
        floor f1 {
          stair CustomStair shape custom entry south [
            flight 5,
            turn right landing (4ft x 4ft),
            flight 6
          ] rise 12ft width 3.5ft
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const stair = result.data!.floors[0].stairs[0];
    expect(stair.shape.type).toBe("custom");
    expect(stair.shape.segments).toHaveLength(3);
    expect(stair.shape.segments![0].type).toBe("flight");
    expect(stair.shape.segments![0].steps).toBe(5);
    expect(stair.shape.segments![1].type).toBe("turn");
    expect(stair.shape.segments![1].direction).toBe("right");
    expect(stair.shape.segments![2].type).toBe("flight");
    expect(stair.shape.segments![2].steps).toBe(6);
  });

  it("should export stair with dimensional parameters", async () => {
    const input = `
      floorplan
        floor f1 {
          stair MainStair at (0, 0) shape straight direction north rise 9ft width 3.5ft riser 7in tread 11in nosing 1.25in headroom 84in
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const stair = result.data!.floors[0].stairs[0];
    expect(stair.riser).toBe(7);
    expect(stair.tread).toBe(11);
    expect(stair.nosing).toBe(1.25);
    expect(stair.headroom).toBe(84);
  });

  it("should export stair with handrail and stringers", async () => {
    const input = `
      floorplan
        floor f1 {
          stair MainStair at (0, 0) shape straight direction north rise 9ft width 3.5ft handrail (both) stringers open
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const stair = result.data!.floors[0].stairs[0];
    expect(stair.handrail).toBe("both");
    expect(stair.stringers).toBe("open");
  });

  it("should export stair with label", async () => {
    const input = `
      floorplan
        floor f1 {
          stair MainStair at (0, 0) shape straight direction north rise 9ft width 3.5ft label "Main Staircase"
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const stair = result.data!.floors[0].stairs[0];
    expect(stair.label).toBe("Main Staircase");
  });

  it("should export stair with material specification", async () => {
    const input = `
      floorplan
        floor f1 {
          stair MainStair at (0, 0) shape straight direction north rise 9ft width 3.5ft material { tread: "oak", riser: "white" }
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const stair = result.data!.floors[0].stairs[0];
    expect(stair.material).toBeDefined();
    expect(stair.material?.tread).toBe("oak");
    expect(stair.material?.riser).toBe("white");
  });

  it("should export stair_code in config", async () => {
    const input = `
      floorplan
        config { stair_code: residential }
        floor f1 {
          stair MainStair at (0, 0) shape straight direction north rise 9ft width 3.5ft
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.config?.stair_code).toBe("residential");
  });
});

describe("JSON Converter - Lifts", () => {
  it("should export basic lift", async () => {
    const input = `
      floorplan
        floor f1 {
          lift MainLift at (20, 25) size (5ft x 5ft)
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data).toBeDefined();
    expect(result.data!.floors[0].lifts).toHaveLength(1);
    
    const lift = result.data!.floors[0].lifts[0];
    expect(lift.name).toBe("MainLift");
    expect(lift.x).toBe(20);
    expect(lift.z).toBe(25);
    expect(lift.width).toBe(5);
    expect(lift.height).toBe(5);
  });

  it("should export lift with door specification", async () => {
    const input = `
      floorplan
        floor f1 {
          lift MainLift at (20, 25) size (5ft x 5ft) doors (north, south)
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const lift = result.data!.floors[0].lifts[0];
    expect(lift.doors).toEqual(["north", "south"]);
  });

  it("should export lift with label", async () => {
    const input = `
      floorplan
        floor f1 {
          lift Elevator at (20, 25) size (5ft x 5ft) label "Main Elevator"
        }
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    const lift = result.data!.floors[0].lifts[0];
    expect(lift.label).toBe("Main Elevator");
  });
});

describe("JSON Converter - Vertical Connections", () => {
  it("should export two-floor vertical connection", async () => {
    const input = `
      floorplan
        floor GroundFloor {
          stair MainStair at (0, 0) shape straight direction north rise 10ft
        }
        floor FirstFloor {
          stair MainStair at (0, 0) shape straight direction north rise 10ft
        }
        vertical GroundFloor.MainStair to FirstFloor.MainStair
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.verticalConnections).toHaveLength(1);
    
    const vc = result.data!.verticalConnections![0];
    expect(vc.links).toHaveLength(2);
    expect(vc.links[0].floor).toBe("GroundFloor");
    expect(vc.links[0].element).toBe("MainStair");
    expect(vc.links[1].floor).toBe("FirstFloor");
    expect(vc.links[1].element).toBe("MainStair");
  });

  it("should export multi-floor vertical connection", async () => {
    const input = `
      floorplan
        floor GroundFloor {
          lift Elevator at (0, 0) size (5ft x 5ft)
        }
        floor FirstFloor {
          lift Elevator at (0, 0) size (5ft x 5ft)
        }
        floor SecondFloor {
          lift Elevator at (0, 0) size (5ft x 5ft)
        }
        vertical GroundFloor.Elevator to FirstFloor.Elevator to SecondFloor.Elevator
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.verticalConnections).toHaveLength(1);
    
    const vc = result.data!.verticalConnections![0];
    expect(vc.links).toHaveLength(3);
    expect(vc.links[0].floor).toBe("GroundFloor");
    expect(vc.links[1].floor).toBe("FirstFloor");
    expect(vc.links[2].floor).toBe("SecondFloor");
  });

  it("should export multiple vertical connections", async () => {
    const input = `
      floorplan
        floor GroundFloor {
          stair MainStair at (0, 0) shape straight direction north rise 10ft
          lift Elevator at (10, 0) size (5ft x 5ft)
        }
        floor FirstFloor {
          stair MainStair at (0, 0) shape straight direction north rise 10ft
          lift Elevator at (10, 0) size (5ft x 5ft)
        }
        vertical GroundFloor.MainStair to FirstFloor.MainStair
        vertical GroundFloor.Elevator to FirstFloor.Elevator
    `;
    const document = await parse(input);
    const result = convertFloorplanToJson(document.parseResult.value);
    
    expect(result.data!.verticalConnections).toHaveLength(2);
  });
});

