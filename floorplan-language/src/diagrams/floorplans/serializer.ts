/**
 * DSL text serializer for floorplan entities.
 *
 * Produces valid DSL text from plain data objects, acting as the single
 * source of truth for text generation. Consumers (SolidStart editor,
 * MCP ast-editor, CLI, etc.) import from here instead of duplicating
 * string-building logic.
 *
 * Grammar reference (Room rule):
 *   room Name
 *     ('at' position)?
 *     'size' (W x H)
 *     ('height' N)?
 *     ('elevation' N)?
 *     'walls' [top: T, right: T, bottom: T, left: T]
 *     relativePosition?      (direction Reference gap? align?)
 *     ('label' "text")?
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Data needed to serialize a single room to DSL text. */
export interface SerializeRoomParams {
  name: string;
  /** Explicit absolute position. Omit for relative-only rooms. */
  position?: { x: number; y: number };
  /** Inline size. */
  size: { width: number; height: number };
  /** Room height (the `height` keyword — distinct from size height). */
  roomHeight?: number;
  /** Elevation (the `elevation` keyword). */
  elevation?: number;
  /** Wall types per direction. */
  walls: { top: string; right: string; bottom: string; left: string };
  /** Relative positioning clause. */
  relativePosition?: {
    direction: string;
    reference: string;
    gap?: number;
    alignment?: string;
  };
  /** Display label (will be quoted in output). */
  label?: string;
  /** Style reference (name of a defined style block). */
  style?: string;
}

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

/**
 * Serialize a room definition to a single DSL line.
 *
 * @param params - Room data to serialize.
 * @param indent - Whitespace prefix (e.g. `'    '`). Defaults to `''`.
 * @returns A valid DSL room line, e.g.
 *   `    room Kitchen at (0, 0) size (4 x 3) walls [top: solid, …]`
 */
export function serializeRoom(params: SerializeRoomParams, indent = ''): string {
  const parts: string[] = [`${indent}room ${params.name}`];

  // Absolute position
  if (params.position) {
    parts.push(`at (${params.position.x}, ${params.position.y})`);
  }

  // Size
  parts.push(`size (${params.size.width} x ${params.size.height})`);

  // Room height
  if (params.roomHeight != null && params.roomHeight > 0) {
    parts.push(`height ${params.roomHeight}`);
  }

  // Elevation
  if (params.elevation != null && params.elevation !== 0) {
    parts.push(`elevation ${params.elevation}`);
  }

  // Walls
  const w = params.walls;
  parts.push(`walls [top: ${w.top}, right: ${w.right}, bottom: ${w.bottom}, left: ${w.left}]`);

  // Relative positioning (comes after walls per grammar)
  if (params.relativePosition) {
    const rel = params.relativePosition;
    parts.push(`${rel.direction} ${rel.reference}`);
    if (rel.gap != null && rel.gap > 0) {
      parts.push(`gap ${rel.gap}`);
    }
    if (rel.alignment) {
      parts.push(`align ${rel.alignment}`);
    }
  }

  // Label
  if (params.label) {
    parts.push(`label "${params.label}"`);
  }

  // Style reference
  if (params.style) {
    parts.push(`style ${params.style}`);
  }

  return parts.join(' ');
}
