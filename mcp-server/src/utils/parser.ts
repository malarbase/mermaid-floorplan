import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import {
  createFloorplansServices,
  type Floorplan,
  type Room,
} from "floorplans-language";

const services = createFloorplansServices(EmptyFileSystem);
const parse = parseHelper<Floorplan>(services.Floorplans);

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export interface ParseResult {
  document: LangiumDocument<Floorplan> | null;
  errors: ParseError[];
}

export async function parseFloorplan(dsl: string): Promise<ParseResult> {
  const document = await parse(dsl);
  const errors: ParseError[] = [];

  for (const error of document.parseResult.parserErrors) {
    errors.push({
      message: error.message,
      line: error.token?.startLine,
      column: error.token?.startColumn,
    });
  }

  for (const error of document.parseResult.lexerErrors) {
    errors.push({
      message: error.message,
      line: error.line,
      column: error.column,
    });
  }

  if (errors.length > 0) {
    return { document: null, errors };
  }

  return { document, errors: [] };
}

export interface RoomMetadata {
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  label?: string;
  walls: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  subRooms?: RoomMetadata[];
}

export function extractRoomMetadata(room: Room): RoomMetadata {
  // Extract wall types from specifications array
  const getWallType = (direction: string): string => {
    const spec = room.walls.specifications.find(
      (s) => s.direction === direction
    );
    return spec?.type || "solid";
  };

  const metadata: RoomMetadata = {
    name: room.name,
    position: {
      x: room.position.x,
      y: room.position.y,
    },
    size: {
      width: room.size.width,
      height: room.size.height,
    },
    walls: {
      top: getWallType("top"),
      right: getWallType("right"),
      bottom: getWallType("bottom"),
      left: getWallType("left"),
    },
  };

  if (room.label) {
    metadata.label = room.label;
  }

  if (room.subRooms && room.subRooms.length > 0) {
    metadata.subRooms = room.subRooms.map(extractRoomMetadata);
  }

  return metadata;
}

export function extractAllRoomMetadata(
  document: LangiumDocument<Floorplan>
): RoomMetadata[] {
  const floorplan = document.parseResult.value;
  const rooms: RoomMetadata[] = [];

  for (const floor of floorplan.floors) {
    for (const room of floor.rooms) {
      rooms.push(extractRoomMetadata(room));
    }
  }

  return rooms;
}

