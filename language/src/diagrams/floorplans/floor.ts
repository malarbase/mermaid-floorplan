/**
 * Floor rendering utilities for floorplan SVG generation
 * Following Mermaid diagram conventions
 */

import type { Floor } from "../../generated/ast.js";
import type { ResolvedPosition } from "./position-resolver.js";

export interface FloorBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function calculateFloorBounds(
  floor: Floor,
  resolvedPositions?: Map<string, ResolvedPosition>
): FloorBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const room of floor.rooms) {
    // Get position from resolved map or explicit position
    let x: number;
    let y: number;
    
    const resolved = resolvedPositions?.get(room.name);
    if (resolved) {
      x = resolved.x;
      y = resolved.y;
    } else if (room.position) {
      x = room.position.x;
      y = room.position.y;
    } else {
      // Skip rooms without resolved positions
      continue;
    }
    
    const width = room.size.width;
    const height = room.size.height;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  // Handle empty floor or no positioned rooms
  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function generateFloorRectangle(
  floor: Floor,
  resolvedPositions?: Map<string, ResolvedPosition>
): string {
  const bounds = calculateFloorBounds(floor, resolvedPositions);
  return `<rect x="${bounds.minX}" y="${bounds.minY}" 
    width="${bounds.width}" height="${bounds.height}" 
    class="floor-background" fill="#eed" stroke="black" stroke-width="0.1" />`;
}

