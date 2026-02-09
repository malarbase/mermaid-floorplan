/**
 * Metrics computation for floorplan DSL
 * Computes room areas, floor metrics, and floorplan summary
 */

import type { JsonExport, JsonFloor, JsonRoom } from './json-converter.js';

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * Computed metrics for a single room
 */
export interface RoomMetrics {
  /** Room area (width × depth) */
  area: number;
  /** Room volume (area × roomHeight), undefined if roomHeight not specified */
  volume?: number;
}

/**
 * Bounding box dimensions for a floor
 */
export interface BoundingBox {
  /** Bounding box width */
  width: number;
  /** Bounding box height (depth) */
  height: number;
  /** Bounding box area */
  area: number;
  /** Minimum X coordinate */
  minX: number;
  /** Minimum Y (Z) coordinate */
  minY: number;
}

/**
 * Computed metrics for a single floor
 */
export interface FloorMetrics {
  /** Sum of all room areas on this floor */
  netArea: number;
  /** Floor bounding box */
  boundingBox: BoundingBox;
  /** Number of rooms on this floor */
  roomCount: number;
  /** Efficiency ratio: netArea / boundingBox.area (0-1) */
  efficiency: number;
}

/**
 * Summary metrics for the entire floorplan
 */
export interface FloorplanSummary {
  /** Sum of all floor net areas */
  grossFloorArea: number;
  /** Total number of rooms across all floors */
  totalRoomCount: number;
  /** Number of floors */
  floorCount: number;
}

// ============================================================================
// Room Metrics
// ============================================================================

/**
 * Compute metrics for a single room
 */
export function computeRoomMetrics(room: JsonRoom): RoomMetrics {
  const area = room.width * room.height;

  const metrics: RoomMetrics = { area };

  if (room.roomHeight !== undefined) {
    metrics.volume = area * room.roomHeight;
  }

  return metrics;
}

/**
 * Compute and attach metrics to a room, returning an enhanced room object
 */
export function enhanceRoomWithMetrics(room: JsonRoom): JsonRoom & RoomMetrics {
  const metrics = computeRoomMetrics(room);
  return {
    ...room,
    ...metrics,
  };
}

// ============================================================================
// Floor Metrics
// ============================================================================

/**
 * Compute bounding box for a floor's rooms
 */
export function computeBoundingBox(rooms: JsonRoom[]): BoundingBox {
  if (rooms.length === 0) {
    return { width: 0, height: 0, area: 0, minX: 0, minY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const room of rooms) {
    const roomMinX = room.x;
    const roomMinY = room.z;
    const roomMaxX = room.x + room.width;
    const roomMaxY = room.z + room.height;

    minX = Math.min(minX, roomMinX);
    minY = Math.min(minY, roomMinY);
    maxX = Math.max(maxX, roomMaxX);
    maxY = Math.max(maxY, roomMaxY);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    width,
    height,
    area: width * height,
    minX,
    minY,
  };
}

/**
 * Compute metrics for a single floor
 */
export function computeFloorMetrics(floor: JsonFloor): FloorMetrics {
  const rooms = floor.rooms;
  const boundingBox = computeBoundingBox(rooms);

  // Compute net area (sum of all room areas)
  let netArea = 0;
  for (const room of rooms) {
    netArea += room.width * room.height;
  }

  const roomCount = rooms.length;

  // Efficiency: ratio of usable space to total bounding box
  const efficiency = boundingBox.area > 0 ? netArea / boundingBox.area : 0;

  return {
    netArea,
    boundingBox,
    roomCount,
    efficiency: Math.round(efficiency * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Compute and attach metrics to a floor, returning an enhanced floor object
 */
export function enhanceFloorWithMetrics(
  floor: JsonFloor,
): JsonFloor & { metrics: FloorMetrics; rooms: (JsonRoom & RoomMetrics)[] } {
  const metrics = computeFloorMetrics(floor);
  const enhancedRooms = floor.rooms.map(enhanceRoomWithMetrics);

  return {
    ...floor,
    rooms: enhancedRooms,
    metrics,
  };
}

// ============================================================================
// Floorplan Summary
// ============================================================================

/**
 * Compute summary metrics for an entire floorplan
 */
export function computeFloorplanSummary(floors: JsonFloor[]): FloorplanSummary {
  let grossFloorArea = 0;
  let totalRoomCount = 0;

  for (const floor of floors) {
    const floorMetrics = computeFloorMetrics(floor);
    grossFloorArea += floorMetrics.netArea;
    totalRoomCount += floorMetrics.roomCount;
  }

  return {
    grossFloorArea,
    totalRoomCount,
    floorCount: floors.length,
  };
}

/**
 * Compute all metrics for a JsonExport, returning an enhanced export with metrics
 */
export function computeFloorplanMetrics(jsonExport: JsonExport): JsonExport & {
  floors: (JsonFloor & { metrics: FloorMetrics; rooms: (JsonRoom & RoomMetrics)[] })[];
  summary: FloorplanSummary;
} {
  const enhancedFloors = jsonExport.floors.map(enhanceFloorWithMetrics);
  const summary = computeFloorplanSummary(jsonExport.floors);

  return {
    ...jsonExport,
    floors: enhancedFloors,
    summary,
  };
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format area value with unit suffix
 */
export function formatArea(area: number, unit: 'sqft' | 'sqm' = 'sqft'): string {
  const rounded = Math.round(area * 100) / 100;
  return `${rounded} ${unit}`;
}

/**
 * Format efficiency as percentage
 */
export function formatEfficiency(efficiency: number): string {
  return `${Math.round(efficiency * 100)}%`;
}

/**
 * Format a summary table for CLI output
 */
export function formatSummaryTable(
  summary: FloorplanSummary,
  floorMetrics: FloorMetrics[],
): string {
  const lines: string[] = [];

  lines.push('┌─────────────────────────────────────────────────┐');
  lines.push('│              Floorplan Summary                  │');
  lines.push('├─────────────────────────────────────────────────┤');
  lines.push(
    `│  Floors: ${summary.floorCount.toString().padStart(5)}                                  │`,
  );
  lines.push(
    `│  Total Rooms: ${summary.totalRoomCount.toString().padStart(5)}                             │`,
  );
  lines.push(
    `│  Gross Floor Area: ${summary.grossFloorArea.toFixed(2).padStart(10)} sq units     │`,
  );
  lines.push('├─────────────────────────────────────────────────┤');

  for (let i = 0; i < floorMetrics.length; i++) {
    const fm = floorMetrics[i];
    lines.push(
      `│  Floor ${(i + 1).toString().padEnd(2)}: ${fm.roomCount} rooms, ${fm.netArea.toFixed(2)} sq units (${formatEfficiency(fm.efficiency)}) │`,
    );
  }

  lines.push('└─────────────────────────────────────────────────┘');

  return lines.join('\n');
}
