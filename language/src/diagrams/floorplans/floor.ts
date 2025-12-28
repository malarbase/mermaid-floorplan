/**
 * Floor rendering utilities for floorplan SVG generation
 * Following Mermaid diagram conventions
 */

import type { Floor } from "../../generated/ast.js";

export interface FloorBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function calculateFloorBounds(floor: Floor): FloorBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const room of floor.rooms) {
    const x = room.position.x;
    const y = room.position.y;
    const width = room.size.width;
    const height = room.size.height;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
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

export function generateFloorRectangle(floor: Floor): string {
  const bounds = calculateFloorBounds(floor);
  return `<rect x="${bounds.minX}" y="${bounds.minY}" 
    width="${bounds.width}" height="${bounds.height}" 
    class="floor-background" fill="#eed" stroke="black" stroke-width="0.1" />`;
}

