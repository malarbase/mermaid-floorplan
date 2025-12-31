/**
 * Room rendering utilities for floorplan SVG generation
 * Following Mermaid diagram conventions
 */

import type { Room } from "../../generated/ast.js";
import type { ResolvedPosition } from "./position-resolver.js";
import { getRoomSize } from "./variable-resolver.js";
import { wallRectangle } from "./wall.js";
import { type StyleContext, resolveRoomStyle, DEFAULT_STYLE } from "./style-resolver.js";

/** Area unit for display */
export type AreaUnit = 'sqft' | 'sqm';

/** Options for room rendering */
export interface RoomRenderOptions {
  /** Show room area inside room */
  showArea?: boolean;
  /** Unit for displaying area */
  areaUnit?: AreaUnit;
}

/**
 * Format area value with unit suffix
 */
function formatAreaText(area: number, unit: AreaUnit = 'sqft'): string {
  const rounded = Math.round(area * 100) / 100;
  return `[${rounded} ${unit}]`;
}

export function generateRoomText(
  room: Room,
  centerX: number,
  centerY: number,
  variables?: Map<string, { width: number; height: number }>,
  options?: RoomRenderOptions
): string {
  const size = getRoomSize(room, variables);
  const sizeText = `${size.width} x ${size.height}`;
  const showArea = options?.showArea ?? false;
  const areaUnit = options?.areaUnit ?? 'sqft';

  // Calculate vertical offsets based on what we're showing
  const lineSpacing = 1;
  let currentY = centerY - (showArea ? 1.5 : 1);
  
  let textElements = `<text x="${centerX}" y="${currentY}" text-anchor="middle" dominant-baseline="middle" 
    class="room-name" font-size="0.8" fill="black">${room.name}</text>`;
  currentY += lineSpacing;

  if (room.label) {
    textElements += `<text x="${centerX}" y="${currentY}" text-anchor="middle" dominant-baseline="middle" 
      class="room-label" font-size="0.8">${room.label}</text>`;
    currentY += lineSpacing;
  }

  textElements += `<text x="${centerX}" y="${currentY}" text-anchor="middle" dominant-baseline="middle" 
    class="room-size" font-size="0.7" fill="gray">${sizeText}</text>`;
  currentY += lineSpacing;

  if (showArea) {
    const area = size.width * size.height;
    const areaText = formatAreaText(area, areaUnit);
    textElements += `<text x="${centerX}" y="${currentY}" text-anchor="middle" dominant-baseline="middle" 
      class="room-area" font-size="0.6" fill="#666">${areaText}</text>`;
  }

  return textElements;
}

export function generateRoomSvg(
  room: Room,
  parentOffsetX: number = 0,
  parentOffsetY: number = 0,
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
  styleContext?: StyleContext,
  renderOptions?: RoomRenderOptions
): string {
  // Get position from resolved map or explicit position
  let baseX: number;
  let baseY: number;
  
  const resolved = resolvedPositions?.get(room.name);
  if (resolved) {
    baseX = resolved.x;
    baseY = resolved.y;
  } else if (room.position) {
    baseX = room.position.x.value;
    baseY = room.position.y.value;
  } else {
    // Cannot render room without position
    return `<!-- Room ${room.name} has no resolved position -->`;
  }
  
  const x = baseX + parentOffsetX;
  const y = baseY + parentOffsetY;
  const size = getRoomSize(room, variables);
  const width = size.width;
  const height = size.height;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const wallThickness = 0.2;
  
  // Resolve style for this room
  const style = styleContext 
    ? resolveRoomStyle(room, styleContext) 
    : DEFAULT_STYLE;
  
  // Room background with floor_color
  const roomBackground = `<rect x="${x}" y="${y}" width="${width}" height="${height}" 
    class="room-background" fill="${style.floor_color}" stroke="none" />`;

  const getWallType = (direction: string): string => {
    const wallSpec = room.walls.specifications.find(
      (spec) => spec.direction === direction
    );
    return wallSpec?.type || "solid";
  };

  // Pass wall color to wall rectangles
  const wallColor = style.wall_color;
  const topWall = wallRectangle(x, y, width, wallThickness, getWallType("top"), "top", wallColor);
  const rightWall = wallRectangle(x + width - wallThickness, y, wallThickness, height, getWallType("right"), "right", wallColor);
  const bottomWall = wallRectangle(x, y + height - wallThickness, width, wallThickness, getWallType("bottom"), "bottom", wallColor);
  const leftWall = wallRectangle(x, y, wallThickness, height, getWallType("left"), "left", wallColor);

  let subRoomSvg = "";
  if (room.subRooms && room.subRooms.length > 0) {
    for (const subRoom of room.subRooms) {
      subRoomSvg += generateRoomSvg(subRoom, x, y, resolvedPositions, variables, styleContext, renderOptions);
    }
  }

  return `<g class="room" data-room="${room.name}">${roomBackground}${topWall}${rightWall}${bottomWall}${leftWall}${generateRoomText(room, centerX, centerY, variables, renderOptions)}${subRoomSvg}</g>`;
}

