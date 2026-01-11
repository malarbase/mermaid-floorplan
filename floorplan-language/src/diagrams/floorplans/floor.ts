/**
 * Floor rendering utilities for floorplan SVG generation
 * Following Mermaid diagram conventions
 */

import type { Floor, Stair } from "../../generated/ast.js";
import {
  isStraightStair, isLShapedStair, isUShapedStair, isSpiralStair
} from "../../generated/ast.js";
import type { ResolvedPosition } from "./position-resolver.js";
import { getRoomSize } from "./variable-resolver.js";
import { convertUnit, type LengthUnit } from "./unit-utils.js";

export interface FloorBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Calculate the bounding box dimensions of a stair element.
 * This mirrors the logic in stair-renderer.ts calculateStairDimensions.
 */
function getStairBoundingBox(
  stair: Stair,
  defaultUnit: LengthUnit = 'ft'
): { width: number; height: number } {
  const normalize = (val: { value: number, unit?: string } | undefined, fallback: number) => {
    if (!val) return fallback;
    const unit = (val.unit as LengthUnit) ?? defaultUnit;
    return convertUnit(val.value, unit, defaultUnit);
  };

  const defaultWidth = normalize(stair.width, 3);
  const rise = normalize(stair.rise, 10);
  const standardRiser = convertUnit(7, 'in', defaultUnit);
  const standardTread = convertUnit(11, 'in', defaultUnit);
  const riser = normalize(stair.riser, standardRiser);
  const tread = normalize(stair.tread, standardTread);
  const stepCount = Math.ceil(rise / riser);
  const totalRunLength = stepCount * tread;

  let width = defaultWidth;
  let height = totalRunLength;

  if (isStraightStair(stair.shape)) {
    const direction = stair.shape.direction as 'top' | 'bottom' | 'left' | 'right';
    if (direction === 'right' || direction === 'left') {
      width = totalRunLength;
      height = defaultWidth;
    }
  } else if (isLShapedStair(stair.shape)) {
    const runs = stair.shape.runs.length > 0 ? stair.shape.runs : [Math.floor(stepCount / 2), Math.ceil(stepCount / 2)];
    const run1 = runs[0] * tread;
    const run2 = runs[1] * tread;
    const landingW = normalize(stair.shape.landing?.width, defaultWidth);
    const landingH = normalize(stair.shape.landing?.height, landingW);
    const entry = stair.shape.entry as 'top' | 'bottom' | 'left' | 'right';

    if (entry === 'top' || entry === 'bottom') {
      height = run1 + landingH;
      width = landingW + run2;
    } else {
      width = run1 + landingW;
      height = landingH + run2;
    }
  } else if (isUShapedStair(stair.shape)) {
    const runs = stair.shape.runs.length > 0 ? stair.shape.runs : [Math.floor(stepCount / 2), Math.ceil(stepCount / 2)];
    const run1 = runs[0] * tread;
    const landingW = normalize(stair.shape.landing?.width, defaultWidth * 2);
    const landingH = normalize(stair.shape.landing?.height, defaultWidth);
    const entry = stair.shape.entry as 'top' | 'bottom' | 'left' | 'right';

    if (entry === 'top' || entry === 'bottom') {
      width = landingW;
      height = Math.max(run1, runs[1] * tread) + landingH;
    } else {
      height = landingW;
      width = Math.max(run1, runs[1] * tread) + landingH;
    }
  } else if (isSpiralStair(stair.shape)) {
    const radius = normalize(stair.shape.outerRadius, defaultWidth / 2);
    width = radius * 2;
    height = radius * 2;
  }

  return { width, height };
}

export function calculateFloorBounds(
  floor: Floor,
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
  defaultUnit: LengthUnit = 'ft'
): FloorBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Include rooms in bounds calculation
  for (const room of floor.rooms) {
    let x: number;
    let y: number;
    
    const resolved = resolvedPositions?.get(room.name);
    if (resolved) {
      x = resolved.x;
      y = resolved.y;
    } else if (room.position) {
      x = room.position.x.value;
      y = room.position.y.value;
    } else {
      continue;
    }
    
    const size = getRoomSize(room, variables);
    const width = size.width;
    const height = size.height;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  // Include stairs in bounds calculation
  for (const stair of floor.stairs) {
    if (!stair.position) continue;
    
    const x = stair.position.x.value;
    const y = stair.position.y.value;
    const bounds = getStairBoundingBox(stair, defaultUnit);
    
    // Add extra space for label below stair (0.8 for label height)
    const labelSpace = stair.label ? 0.8 : 0;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + bounds.width);
    maxY = Math.max(maxY, y + bounds.height + labelSpace);
  }

  // Include lifts in bounds calculation
  for (const lift of floor.lifts) {
    if (!lift.position) continue;
    
    const x = lift.position.x.value;
    const y = lift.position.y.value;
    const width = lift.size.width.value;
    const height = lift.size.height.value;
    
    // Add extra space for label below lift (0.8 for label height)
    const labelSpace = lift.label ? 0.8 : 0;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height + labelSpace);
  }

  // Handle empty floor or no positioned elements
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
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
  defaultUnit: LengthUnit = 'ft'
): string {
  const bounds = calculateFloorBounds(floor, resolvedPositions, variables, defaultUnit);
  return `<rect x="${bounds.minX}" y="${bounds.minY}" 
    width="${bounds.width}" height="${bounds.height}" 
    class="floor-background" fill="#eed" stroke="black" stroke-width="0.1" />`;
}

