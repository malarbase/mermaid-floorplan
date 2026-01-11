/**
 * Wall rendering utilities for floorplan SVG generation
 * Following Mermaid diagram conventions
 */

import { generateDoor } from "./door.js";
import { generateWindow } from "./window.js";

export function wallRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  wallType: string,
  wallDirection?: string,
  wallColor: string = "black"
): string {
  if (wallType === "open") {
    return "";
  }

  const wall = `<rect x="${x}" y="${y}" width="${width}" height="${height}" 
      class="wall" fill="${wallColor}" stroke="${wallColor}" stroke-width="0.05" />`;

  if (wallType === "door") {
    // Single door by default for wall-specified doors
    return wall + generateDoor(x, y, width, height, wallDirection, "door");
  }

  if (wallType === "window") {
    return wall + generateWindow(x, y, width, height, wallDirection);
  }

  return wall;
}
