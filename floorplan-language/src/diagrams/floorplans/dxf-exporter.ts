/**
 * DXF Export Module for Floorplan DSL
 *
 * Exports floorplan data to DXF format (AutoCAD compatible).
 * Uses dxf-writer library for generating DXF content.
 *
 * Features:
 * - Layered output: WALLS, DOORS, WINDOWS, ROOMS, LABELS, DIMENSIONS
 * - Room outlines as closed polylines
 * - Wall openings for doors and windows
 * - Optional room labels and dimensions
 */

import Drawing from 'dxf-writer';
import type { JsonConfig, JsonConnection, JsonFloor, JsonRoom } from './json-converter.js';

// ============================================================================
// Types
// ============================================================================

/** Layer names for DXF output */
export const DXF_LAYERS = {
  WALLS: 'WALLS',
  DOORS: 'DOORS',
  WINDOWS: 'WINDOWS',
  ROOMS: 'ROOMS',
  LABELS: 'LABELS',
  DIMENSIONS: 'DIMENSIONS',
  STAIRS: 'STAIRS',
  LIFTS: 'LIFTS',
} as const;

/** DXF color indices (AutoCAD ACI) */
export const DXF_COLORS = {
  WHITE: 7,
  RED: 1,
  YELLOW: 2,
  GREEN: 3,
  CYAN: 4,
  BLUE: 5,
  MAGENTA: 6,
  GRAY: 8,
} as const;

export interface DxfExportOptions {
  /** Include room labels in output */
  includeLabels?: boolean;
  /** Include dimension lines */
  includeDimensions?: boolean;
  /** Wall thickness for visualization (default: 0.5) */
  wallThickness?: number;
  /** Scale factor (default: 1.0) */
  scale?: number;
  /** Units: 'ft', 'm', 'mm', 'in' (default: from config or 'ft') */
  units?: string;
}

export interface DxfExportResult {
  /** DXF file content as string */
  content: string;
  /** Number of rooms exported */
  roomCount: number;
  /** Number of connections exported */
  connectionCount: number;
  /** Any warnings during export */
  warnings: string[];
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export a single floor to DXF format.
 *
 * @param floor - The floor data to export
 * @param connections - Door/window connections for this floor
 * @param options - Export options
 * @returns DXF content and metadata
 */
export function exportFloorToDxf(
  floor: JsonFloor,
  connections: JsonConnection[],
  options: Partial<DxfExportOptions> = {},
): DxfExportResult {
  const opts: DxfExportOptions = {
    includeLabels: true,
    includeDimensions: false,
    wallThickness: 0.5,
    scale: 1.0,
    units: 'ft',
    ...options,
  };

  const warnings: string[] = [];
  const d = new Drawing();

  // Set units based on configuration
  setDxfUnits(d, opts.units || 'ft');

  // Set up layers
  d.addLayer(DXF_LAYERS.ROOMS, DXF_COLORS.WHITE, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.WALLS, DXF_COLORS.GRAY, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.DOORS, DXF_COLORS.CYAN, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.WINDOWS, DXF_COLORS.BLUE, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.LABELS, DXF_COLORS.GREEN, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.DIMENSIONS, DXF_COLORS.YELLOW, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.STAIRS, DXF_COLORS.MAGENTA, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.LIFTS, DXF_COLORS.RED, 'CONTINUOUS');

  const scale = opts.scale!;

  // Draw floor content into the Drawing
  const connectionCount = drawFloorContent(d, floor, connections, scale, opts);

  return {
    content: d.toDxfString(),
    roomCount: floor.rooms.length,
    connectionCount,
    warnings,
  };
}

/**
 * Draw floor content (rooms, connections, stairs, lifts) into an existing Drawing.
 * This is used by both exportFloorToDxf and exportFloorplanToDxf.
 *
 * @returns Number of connections drawn
 */
function drawFloorContent(
  d: Drawing,
  floor: JsonFloor,
  connections: JsonConnection[],
  scale: number,
  opts: DxfExportOptions,
): number {
  // Draw rooms
  for (const room of floor.rooms) {
    drawRoom(d, room, scale, opts);
  }

  // Draw connections (doors/windows)
  let connectionCount = 0;
  for (const conn of connections) {
    const drawn = drawConnection(d, conn, floor.rooms, scale, opts);
    if (drawn) connectionCount++;
  }

  // Draw stairs
  for (const stair of floor.stairs) {
    d.setActiveLayer(DXF_LAYERS.STAIRS);
    const sx = stair.x * scale;
    const sz = stair.z * scale;
    const width = (stair.width ?? 3) * scale;
    // Draw stair as a rectangle with an arrow
    d.drawRect(sx, sz, sx + width, sz + width * 2);
    if (opts.includeLabels) {
      d.setActiveLayer(DXF_LAYERS.LABELS);
      d.drawText(sx + width / 2, sz + width, 0.3 * scale, 0, stair.label ?? stair.name);
    }
  }

  // Draw lifts
  for (const lift of floor.lifts) {
    d.setActiveLayer(DXF_LAYERS.LIFTS);
    const lx = lift.x * scale;
    const lz = lift.z * scale;
    const lw = lift.width * scale;
    const lh = lift.height * scale;
    d.drawRect(lx, lz, lx + lw, lz + lh);
    // Draw X inside for elevator symbol
    d.drawLine(lx, lz, lx + lw, lz + lh);
    d.drawLine(lx + lw, lz, lx, lz + lh);
    if (opts.includeLabels) {
      d.setActiveLayer(DXF_LAYERS.LABELS);
      d.drawText(lx + lw / 2, lz + lh / 2, 0.3 * scale, 0, lift.label ?? lift.name);
    }
  }

  return connectionCount;
}

// ============================================================================
// Room Drawing
// ============================================================================

function drawRoom(d: Drawing, room: JsonRoom, scale: number, opts: DxfExportOptions): void {
  const x = room.x * scale;
  const z = room.z * scale;
  const w = room.width * scale;
  const h = room.height * scale;

  // Draw room outline on ROOMS layer
  d.setActiveLayer(DXF_LAYERS.ROOMS);
  d.drawRect(x, z, x + w, z + h);

  // Draw walls with thickness on WALLS layer
  if (opts.wallThickness && opts.wallThickness > 0) {
    d.setActiveLayer(DXF_LAYERS.WALLS);
    const wt = opts.wallThickness * scale;

    // Top wall
    d.drawRect(x, z, x + w, z + wt);
    // Bottom wall
    d.drawRect(x, z + h - wt, x + w, z + h);
    // Left wall
    d.drawRect(x, z, x + wt, z + h);
    // Right wall
    d.drawRect(x + w - wt, z, x + w, z + h);
  }

  // Add room label
  if (opts.includeLabels) {
    d.setActiveLayer(DXF_LAYERS.LABELS);
    const label = room.label ?? room.name;
    const textHeight = Math.min(w, h) * 0.1;
    d.drawText(x + w / 2, z + h / 2, textHeight, 0, label);

    // Add area label if available
    if (room.area !== undefined) {
      const areaText = `${room.area.toFixed(1)} sq ft`;
      d.drawText(x + w / 2, z + h / 2 - textHeight * 1.5, textHeight * 0.7, 0, areaText);
    }
  }

  // Add dimensions
  if (opts.includeDimensions) {
    d.setActiveLayer(DXF_LAYERS.DIMENSIONS);
    const dimOffset = 0.5 * scale;
    const textHeight = 0.2 * scale;

    // Width dimension (bottom)
    d.drawLine(x, z - dimOffset, x + w, z - dimOffset);
    d.drawText(x + w / 2, z - dimOffset - textHeight, textHeight, 0, `${room.width}'`);

    // Height dimension (left)
    d.drawLine(x - dimOffset, z, x - dimOffset, z + h);
    d.drawText(x - dimOffset - textHeight * 2, z + h / 2, textHeight, 90, `${room.height}'`);
  }
}

// ============================================================================
// Connection Drawing (Doors/Windows)
// ============================================================================

function drawConnection(
  d: Drawing,
  conn: JsonConnection,
  rooms: JsonRoom[],
  scale: number,
  _opts: DxfExportOptions,
): boolean {
  // Find the rooms involved
  const fromRoom = rooms.find((r) => r.name === conn.fromRoom);
  // toRoom is available for future use (e.g., drawing connecting lines)
  const _toRoom = rooms.find((r) => r.name === conn.toRoom);
  void _toRoom; // Suppress unused variable warning

  if (!fromRoom) return false;

  // Calculate door/window position on the wall
  const pos = calculateConnectionPosition(fromRoom, conn, scale);
  if (!pos) return false;

  const isDoor = conn.doorType === 'door' || conn.doorType === 'opening';
  const layer = isDoor ? DXF_LAYERS.DOORS : DXF_LAYERS.WINDOWS;
  d.setActiveLayer(layer);

  const width = (conn.width ?? 3) * scale;
  const halfWidth = width / 2;

  if (pos.isHorizontal) {
    // Horizontal wall (top or bottom)
    d.drawLine(pos.x - halfWidth, pos.y, pos.x + halfWidth, pos.y);

    // Door swing arc for doors
    if (isDoor && conn.swing) {
      // Draw arc at the hinge point
      d.drawArc(pos.x - halfWidth, pos.y, halfWidth, 0, 90);
    }
  } else {
    // Vertical wall (left or right)
    d.drawLine(pos.x, pos.y - halfWidth, pos.x, pos.y + halfWidth);

    // Door swing arc for doors
    if (isDoor && conn.swing) {
      // Draw arc at the hinge point
      d.drawArc(pos.x, pos.y - halfWidth, halfWidth, 90, 180);
    }
  }

  return true;
}

interface ConnectionPosition {
  x: number;
  y: number;
  isHorizontal: boolean;
}

function calculateConnectionPosition(
  room: JsonRoom,
  conn: JsonConnection,
  scale: number,
): ConnectionPosition | null {
  const x = room.x * scale;
  const z = room.z * scale;
  const w = room.width * scale;
  const h = room.height * scale;

  // Use the position along the wall (default to center = 50%)
  const position = conn.position ?? 50;
  const posRatio = position / 100;

  switch (conn.fromWall) {
    case 'top':
      return { x: x + w * posRatio, y: z, isHorizontal: true };
    case 'bottom':
      return { x: x + w * posRatio, y: z + h, isHorizontal: true };
    case 'left':
      return { x: x, y: z + h * posRatio, isHorizontal: false };
    case 'right':
      return { x: x + w, y: z + h * posRatio, isHorizontal: false };
    default:
      return null;
  }
}

// ============================================================================
// Multi-Floor Export
// ============================================================================

/**
 * Export multiple floors to a single DXF file.
 * Floors are arranged vertically with spacing.
 *
 * @param floors - Array of floors to export
 * @param connections - All connections
 * @param config - Floorplan config for defaults
 * @param options - Export options
 */
export function exportFloorplanToDxf(
  floors: JsonFloor[],
  connections: JsonConnection[],
  config?: JsonConfig,
  options: Partial<DxfExportOptions> = {},
): DxfExportResult {
  const opts: DxfExportOptions = {
    includeLabels: true,
    includeDimensions: false,
    wallThickness: config?.wall_thickness ?? 0.5,
    scale: 1.0,
    units: config?.default_unit ?? 'ft',
    ...options,
  };

  // For multi-floor, we need to offset each floor
  // Calculate max floor dimensions for spacing
  let maxWidth = 0;
  let maxHeight = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      maxWidth = Math.max(maxWidth, room.x + room.width);
      maxHeight = Math.max(maxHeight, room.z + room.height);
    }
  }

  const floorSpacing = Math.max(maxHeight * 1.5, 20);
  const warnings: string[] = [];
  const d = new Drawing();

  // Set units based on configuration
  setDxfUnits(d, opts.units || 'ft');

  // Set up layers
  d.addLayer(DXF_LAYERS.ROOMS, DXF_COLORS.WHITE, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.WALLS, DXF_COLORS.GRAY, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.DOORS, DXF_COLORS.CYAN, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.WINDOWS, DXF_COLORS.BLUE, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.LABELS, DXF_COLORS.GREEN, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.DIMENSIONS, DXF_COLORS.YELLOW, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.STAIRS, DXF_COLORS.MAGENTA, 'CONTINUOUS');
  d.addLayer(DXF_LAYERS.LIFTS, DXF_COLORS.RED, 'CONTINUOUS');

  let totalRooms = 0;
  let totalConnections = 0;

  for (let i = 0; i < floors.length; i++) {
    const floor = floors[i];
    const yOffset = i * floorSpacing;

    // Create offset rooms for this floor
    const offsetRooms: JsonRoom[] = floor.rooms.map((room) => ({
      ...room,
      z: room.z + yOffset,
    }));

    const offsetFloor: JsonFloor = {
      ...floor,
      rooms: offsetRooms,
      stairs: floor.stairs.map((s) => ({ ...s, z: s.z + yOffset })),
      lifts: floor.lifts.map((l) => ({ ...l, z: l.z + yOffset })),
    };

    // Filter connections for this floor
    const floorConnections = connections.filter((conn) => {
      return floor.rooms.some((r) => r.name === conn.fromRoom);
    });

    // Draw floor content directly into the combined Drawing
    const connectionCount = drawFloorContent(d, offsetFloor, floorConnections, opts.scale!, opts);
    totalRooms += offsetFloor.rooms.length;
    totalConnections += connectionCount;

    // Add floor label
    d.setActiveLayer(DXF_LAYERS.LABELS);
    d.drawText(-5, yOffset + maxHeight / 2, 1, 0, `Floor: ${floor.id}`);
  }

  return {
    content: d.toDxfString(),
    roomCount: totalRooms,
    connectionCount: totalConnections,
    warnings,
  };
}

// ============================================================================
// Unit Conversion
// ============================================================================

/**
 * Map our unit names to dxf-writer unit names and set the DXF units.
 * This sets the INSUNITS header variable in the DXF file.
 *
 * @param d - The Drawing instance
 * @param unit - Unit string from floorplan config (m, ft, mm, in, cm)
 */
function setDxfUnits(d: Drawing, unit: string): void {
  // Map floorplan units to dxf-writer units
  const unitMap: Record<string, string> = {
    m: 'Meters',
    ft: 'Feet',
    mm: 'Millimeters',
    in: 'Inches',
    cm: 'Centimeters',
    km: 'Kilometers',
    mi: 'Miles',
    yd: 'Yards',
  };

  const dxfUnit = unitMap[unit.toLowerCase()] || 'Feet';
  d.setUnits(dxfUnit as any); // dxf-writer's Unit type is not exported
}
