/**
 * Door rendering utilities for floorplan SVG generation
 * Following Mermaid diagram conventions
 * 
 * Supports:
 * - Single doors with swing arc
 * - Double doors with mirrored swing arcs
 * - Swing direction (left/right)
 * 
 * Door arc convention (top-down floor plan view):
 * - A door on a wall swings perpendicular to that wall
 * - The door panel (straight line) shows the door in its OPEN position
 * - The arc shows the path traced by the door edge when swinging from closed to open
 * - "swing: left" means hinge on right/bottom, door swings left/up
 * - "swing: right" means hinge on left/top, door swings right/down
 */

import type { DoorType, SwingDirection } from "../../generated/ast.js";

/**
 * Generate SVG path for a single door swing arc
 * 
 * For a top-down floor plan:
 * - Horizontal walls (top/bottom): Door panel extends vertically (up/down into room)
 * - Vertical walls (left/right): Door panel extends horizontally (left/right into room)
 * 
 * The path consists of:
 * 1. Move to hinge point (on the wall)
 * 2. Line to door end (door panel in open position, perpendicular to wall)
 * 3. Arc back to the opposite edge of the door opening (showing swing path)
 */
function generateSingleDoorPath(
  x: number,
  y: number,
  doorWidth: number,
  wallThickness: number,
  isHorizontal: boolean,
  wallDirection: string,
  swingDirection?: SwingDirection
): string {
  const effectiveSwing = swingDirection ?? "right";
  const radius = doorWidth * 0.85; // Door swing radius
  
  if (isHorizontal) {
    // Door on horizontal wall (top or bottom)
    // Door panel extends vertically (perpendicular to wall)
    const centerY = y + wallThickness / 2;
    
    if (wallDirection === "top") {
      // Door on TOP wall - opens downward into the room
      if (effectiveSwing === "left") {
        // Hinge on right side of opening, door swings down-left
        const hingeX = x + doorWidth;
        const doorEndY = centerY + radius;
        // Arc from door end back to LEFT edge of opening
        return `M ${hingeX} ${centerY} L ${hingeX} ${doorEndY} A ${radius} ${radius} 0 0 1 ${x} ${centerY}`;
      } else {
        // Hinge on left side of opening, door swings down-right
        const hingeX = x;
        const doorEndY = centerY + radius;
        // Arc from door end back to RIGHT edge of opening
        return `M ${hingeX} ${centerY} L ${hingeX} ${doorEndY} A ${radius} ${radius} 0 0 0 ${x + doorWidth} ${centerY}`;
      }
    } else {
      // Door on BOTTOM wall - opens upward into the room
      if (effectiveSwing === "left") {
        // Hinge on right side of opening, door swings up-left
        const hingeX = x + doorWidth;
        const doorEndY = centerY - radius;
        return `M ${hingeX} ${centerY} L ${hingeX} ${doorEndY} A ${radius} ${radius} 0 0 0 ${x} ${centerY}`;
      } else {
        // Hinge on left side of opening, door swings up-right
        const hingeX = x;
        const doorEndY = centerY - radius;
        return `M ${hingeX} ${centerY} L ${hingeX} ${doorEndY} A ${radius} ${radius} 0 0 1 ${x + doorWidth} ${centerY}`;
      }
    }
  } else {
    // Door on vertical wall (left or right)
    // Door panel extends horizontally (perpendicular to wall)
    const centerX = x + wallThickness / 2;
    
    if (wallDirection === "left") {
      // Door on LEFT wall - opens rightward into the room
      if (effectiveSwing === "left") {
        // Hinge on bottom of opening, door swings right-up
        const hingeY = y + doorWidth;
        const doorEndX = centerX + radius;
        // Arc from door end back to TOP edge of opening - sweep=0 for convex bulge RIGHT
        return `M ${centerX} ${hingeY} L ${doorEndX} ${hingeY} A ${radius} ${radius} 0 0 0 ${centerX} ${y}`;
      } else {
        // Hinge on top of opening, door swings right-down
        const hingeY = y;
        const doorEndX = centerX + radius;
        // Arc from door end back to BOTTOM edge of opening - sweep=1 for convex bulge RIGHT
        return `M ${centerX} ${hingeY} L ${doorEndX} ${hingeY} A ${radius} ${radius} 0 0 1 ${centerX} ${y + doorWidth}`;
      }
    } else {
      // Door on RIGHT wall - opens leftward into the room on the left
      // Note: Right wall swing is inverted from left wall to match "facing from inside" perspective
      // When facing right wall (+X), your right points to min Y (top), left points to max Y (bottom)
      if (effectiveSwing === "left") {
        // Hinge on top of opening, door swings left-down
        const hingeY = y;
        const doorEndX = centerX - radius;
        // Arc from door end back to BOTTOM edge of opening - sweep=0 for convex bulge LEFT
        return `M ${centerX} ${hingeY} L ${doorEndX} ${hingeY} A ${radius} ${radius} 0 0 0 ${centerX} ${y + doorWidth}`;
      } else {
        // Hinge on bottom of opening, door swings left-up
        const hingeY = y + doorWidth;
        const doorEndX = centerX - radius;
        // Arc from door end back to TOP edge of opening - sweep=1 for convex bulge LEFT
        return `M ${centerX} ${hingeY} L ${doorEndX} ${hingeY} A ${radius} ${radius} 0 0 1 ${centerX} ${y}`;
      }
    }
  }
}

/**
 * Generate SVG for a double door (two mirrored swing arcs)
 */
function generateDoubleDoor(
  x: number,
  y: number,
  width: number,
  height: number,
  wallDirection: string
): string {
  const isHorizontal = width > height;
  const doorWidth = isHorizontal ? width : height;
  const wallThickness = isHorizontal ? height : width;
  const halfDoorWidth = doorWidth / 2;
  const gap = 0.05; // Small gap between doors
  
  let leftPath: string, rightPath: string;
  
  if (isHorizontal) {
    // Horizontal wall - doors side by side
    // Left door swings right, right door swings left (both open into room)
    leftPath = generateSingleDoorPath(x, y, halfDoorWidth - gap, wallThickness, true, wallDirection, "right");
    rightPath = generateSingleDoorPath(x + halfDoorWidth + gap, y, halfDoorWidth - gap, wallThickness, true, wallDirection, "left");
  } else {
    // Vertical wall - doors stacked  
    // Top door swings down, bottom door swings up (both open into room)
    leftPath = generateSingleDoorPath(x, y, halfDoorWidth - gap, wallThickness, false, wallDirection, "right");
    rightPath = generateSingleDoorPath(x, y + halfDoorWidth + gap, halfDoorWidth - gap, wallThickness, false, wallDirection, "left");
  }
  
  return `<g class="double-door" data-type="double-door" data-direction="${wallDirection}">
    <path d="${leftPath}" fill="white" stroke="black" stroke-width="0.05" />
    <path d="${rightPath}" fill="white" stroke="black" stroke-width="0.05" />
  </g>`;
}

/**
 * Generate SVG for a door
 */
export function generateDoor(
  x: number,
  y: number,
  width: number,
  height: number,
  wallDirection?: string,
  doorType: DoorType = "door",
  swingDirection?: SwingDirection
): string {
  // Handle opening (doorless passage/archway)
  // Creates a gap in the wall without a door arc
  if (doorType === "opening") {
    // Draw a white rectangle to "cut" through the wall, creating the opening
    // No door arc is drawn - just the gap
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" 
      fill="white" stroke="none" class="opening" data-type="opening" data-direction="${wallDirection}" />`;
  }
  
  // Handle double-door
  if (doorType === "double-door") {
    return generateDoubleDoor(x, y, width, height, wallDirection ?? "top");
  }
  
  // Single door
  const isHorizontal = width > height;
  const doorWidth = isHorizontal ? width : height;
  const wallThickness = isHorizontal ? height : width;

  const pathData = generateSingleDoorPath(
    x,
    y,
    doorWidth,
    wallThickness,
    isHorizontal,
    wallDirection ?? "top",
    swingDirection
  );

  return `<path d="${pathData}" fill="white" stroke="black" stroke-width="0.05" class="door" data-type="door" data-direction="${wallDirection}" data-swing="${swingDirection ?? "default"}" />`;
}
