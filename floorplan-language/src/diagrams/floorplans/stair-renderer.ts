/**
 * Stair and Lift 2D SVG Renderer
 * Generates architectural floor plan symbols for stairs and lifts.
 */

import type {
  CurvedStair,
  DoubleLStair,
  Floor,
  Lift,
  LShapedStair,
  SegmentedStair,
  SpiralStair,
  Stair,
  StairShape,
  UShapedStair,
  WinderStair,
} from '../../generated/ast.js';
import {
  isCurvedStair,
  isDoubleLStair,
  isLShapedStair,
  isSegmentedStair,
  isSpiralStair,
  isStraightStair,
  isUShapedStair,
  isWinderStair,
} from '../../generated/ast.js';
import type { ResolvedPosition } from './position-resolver.js';
import { convertUnit, type LengthUnit } from './unit-utils.js';

// ============================================================================
// Types
// ============================================================================

export interface StairRenderOptions {
  /** Show stair labels */
  showLabels?: boolean;
  /** Stroke color for stair lines */
  strokeColor?: string;
  /** Fill color for stair treads */
  fillColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Default length unit for the floorplan (used for normalization) */
  defaultUnit?: string;
}

const defaultStairOptions: Required<StairRenderOptions> = {
  showLabels: true,
  strokeColor: '#666',
  fillColor: '#f0f0f0',
  strokeWidth: 0.05,
  defaultUnit: 'ft',
};

// ============================================================================
// Main Entry Points
// ============================================================================

/**
 * Generate SVG for all stairs and lifts on a floor
 */
export function generateFloorCirculation(
  floor: Floor,
  resolvedPositions: Map<string, ResolvedPosition>,
  options: StairRenderOptions = {},
): string {
  const opts = { ...defaultStairOptions, ...options };
  let svg = `<g class="floor-circulation" aria-label="Circulation elements">`;

  // Render stairs
  for (const stair of floor.stairs) {
    svg += generateStairSvg(stair, resolvedPositions, opts);
  }

  // Render lifts
  for (const lift of floor.lifts) {
    svg += generateLiftSvg(lift, resolvedPositions, opts);
  }

  svg += `</g>`;
  return svg;
}

/**
 * Generate SVG for a single stair
 */
export function generateStairSvg(
  stair: Stair,
  _resolvedPositions: Map<string, ResolvedPosition>,
  options: StairRenderOptions = {},
): string {
  const opts = { ...defaultStairOptions, ...options };

  // Get stair position
  const pos = stair.position
    ? { x: stair.position.x.value, y: stair.position.y.value }
    : { x: 0, y: 0 };

  // Calculate stair dimensions based on shape
  const dims = calculateStairDimensions(stair, opts.defaultUnit as LengthUnit);

  let svg = `<g class="stair" data-name="${stair.name}" transform="translate(${pos.x}, ${pos.y})">`;

  // Generate shape-specific SVG
  svg += generateStairShapeSvg(stair.shape, dims, opts);

  // Add label if enabled
  if (opts.showLabels && stair.label) {
    const labelText = stair.label.replace(/^["']|["']$/g, '');
    svg += `<text x="${dims.width / 2}" y="${dims.height + 0.5}" 
            text-anchor="middle" font-size="0.4" fill="#333">${labelText}</text>`;
  }

  svg += `</g>`;
  return svg;
}

/**
 * Generate SVG for a single lift
 */
export function generateLiftSvg(
  lift: Lift,
  _resolvedPositions: Map<string, ResolvedPosition>,
  options: StairRenderOptions = {},
): string {
  const opts = { ...defaultStairOptions, ...options };

  const pos = lift.position
    ? { x: lift.position.x.value, y: lift.position.y.value }
    : { x: 0, y: 0 };

  const width = lift.size.width.value;
  const height = lift.size.height.value;

  let svg = `<g class="lift" data-name="${lift.name}" transform="translate(${pos.x}, ${pos.y})">`;

  // Lift shaft rectangle
  svg += `<rect x="0" y="0" width="${width}" height="${height}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Diagonal cross for elevator symbol
  svg += `<line x1="0" y1="0" x2="${width}" y2="${height}" 
        stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;
  svg += `<line x1="${width}" y1="0" x2="0" y2="${height}" 
        stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Door indicators
  for (const door of lift.doors) {
    svg += generateLiftDoor(door, width, height, opts);
  }

  // Elevator symbol (E)
  svg += `<text x="${width / 2}" y="${height / 2 + 0.15}" 
        text-anchor="middle" font-size="0.6" font-weight="bold" fill="${opts.strokeColor}">E</text>`;

  // Label if enabled
  if (opts.showLabels && lift.label) {
    const labelText = lift.label.replace(/^["']|["']$/g, '');
    svg += `<text x="${width / 2}" y="${height + 0.5}" 
            text-anchor="middle" font-size="0.4" fill="#333">${labelText}</text>`;
  }

  svg += `</g>`;
  return svg;
}

// ============================================================================
// Stair Shape Generators
// ============================================================================

/** View-relative direction type (consistent with wall directions) */
type ViewDirection = 'top' | 'bottom' | 'left' | 'right';

interface StairDimensions {
  width: number;
  height: number;
  direction: ViewDirection;
  stepCount: number;
  stairWidth: number;
}

function calculateStairDimensions(stair: Stair, defaultUnit: LengthUnit = 'ft'): StairDimensions {
  const normalize = (val: { value: number; unit?: string } | undefined, fallback: number) => {
    if (!val) return fallback;
    const unit = (val.unit as LengthUnit) ?? defaultUnit;
    return convertUnit(val.value, unit, defaultUnit);
  };

  const defaultWidth = normalize(stair.width, 3); // 3ft default
  const rise = normalize(stair.rise, 10); // 10ft default

  // Default riser: 7 inches. If default unit is 'ft', 7in -> 0.583ft.
  // If default unit is 'm', 7in -> 0.178m.
  // We need to provide fallback in TARGET unit.
  // Let's rely on convertUnit to handle 'in' to defaultUnit conversion.
  // If riser is not defined, we use standard 7 inches.
  const standardRiser = convertUnit(7, 'in', defaultUnit);
  const standardTread = convertUnit(11, 'in', defaultUnit);

  const riser = normalize(stair.riser, standardRiser);
  const tread = normalize(stair.tread, standardTread);

  // Calculate total number of steps
  const stepCount = Math.ceil(rise / riser);
  const totalRunLength = stepCount * tread;

  let direction: ViewDirection = 'top';
  let width = defaultWidth;
  let height = totalRunLength;

  if (isStraightStair(stair.shape)) {
    direction = stair.shape.direction as ViewDirection;
    if (direction === 'right' || direction === 'left') {
      // Swap dimensions for horizontal stairs
      width = totalRunLength;
      height = defaultWidth;
    } else {
      width = defaultWidth;
      height = totalRunLength;
    }
  } else if (isLShapedStair(stair.shape)) {
    // Calculate runs
    const runs =
      stair.shape.runs.length > 0
        ? stair.shape.runs
        : [Math.floor(stepCount / 2), Math.ceil(stepCount / 2)];
    const run1 = runs[0] * tread;
    const run2 = runs[1] * tread;

    const landingW = normalize(stair.shape.landing?.width, defaultWidth);
    const landingH = normalize(stair.shape.landing?.height, landingW); // Square landing default

    // Determine orientation
    const entry = stair.shape.entry as ViewDirection;

    // Vertical first leg? (top/bottom entry)
    if (entry === 'top' || entry === 'bottom') {
      height = run1 + landingH;
      width = landingW + run2;
    } else {
      // Horizontal first leg (left/right entry)
      width = run1 + landingW;
      height = landingH + run2;
    }

    direction = entry; // Store entry direction
  } else if (isUShapedStair(stair.shape)) {
    // U-shape: Two parallel runs
    const runs =
      stair.shape.runs.length > 0
        ? stair.shape.runs
        : [Math.floor(stepCount / 2), Math.ceil(stepCount / 2)];
    const run1 = runs[0] * tread;
    // const run2 = runs[1] * tread;

    const landingW = normalize(stair.shape.landing?.width, defaultWidth * 2);
    const landingH = normalize(stair.shape.landing?.height, defaultWidth);

    const entry = stair.shape.entry as ViewDirection;

    if (entry === 'top' || entry === 'bottom') {
      width = landingW;
      height = Math.max(run1, runs[1] * tread) + landingH;
    } else {
      height = landingW;
      width = Math.max(run1, runs[1] * tread) + landingH;
    }
    direction = entry;
  } else if (isSpiralStair(stair.shape)) {
    const radius = normalize(stair.shape.outerRadius, defaultWidth / 2);
    width = radius * 2;
    height = radius * 2;
  }

  return { width, height, direction, stepCount, stairWidth: defaultWidth };
}

function generateStairShapeSvg(
  shape: StairShape,
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  if (isStraightStair(shape)) {
    return generateStraightStairSvg(dims, opts);
  }
  if (isLShapedStair(shape)) {
    return generateLShapedStairSvg(shape, dims, opts);
  }
  if (isUShapedStair(shape)) {
    return generateUShapedStairSvg(shape, dims, opts);
  }
  if (isDoubleLStair(shape)) {
    return generateDoubleLStairSvg(shape, dims, opts);
  }
  if (isSpiralStair(shape)) {
    return generateSpiralStairSvg(shape, dims, opts);
  }
  if (isCurvedStair(shape)) {
    return generateCurvedStairSvg(shape, dims, opts);
  }
  if (isWinderStair(shape)) {
    return generateWinderStairSvg(shape, dims, opts);
  }
  if (isSegmentedStair(shape)) {
    return generateSegmentedStairSvg(shape, dims, opts);
  }

  // Fallback to simple rectangle
  return `<rect x="0" y="0" width="${dims.width}" height="${dims.height}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;
}

/**
 * Generate straight stair symbol: parallel lines with direction arrow
 */
function generateStraightStairSvg(
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  let svg = '';

  // Stair outline
  svg += `<rect x="0" y="0" width="${dims.width}" height="${dims.height}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Determine orientation
  const isVertical = dims.direction === 'top' || dims.direction === 'bottom';

  if (isVertical) {
    // Vertical run: Horizontal tread lines
    const stepSpacing = dims.height / dims.stepCount;
    for (let i = 1; i < dims.stepCount; i++) {
      const y = i * stepSpacing;
      svg += `<line x1="0" y1="${y}" x2="${dims.width}" y2="${y}" 
                stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
    }

    // Arrow
    const cx = dims.width / 2;
    const arrowLen = dims.height * 0.4;
    const cy = dims.height / 2;

    let y1, y2;
    if (dims.direction === 'top') {
      // Climb toward top: Arrow points Up (-Y)
      y1 = cy + arrowLen / 2;
      y2 = cy - arrowLen / 2;
    } else {
      // Climb toward bottom: Arrow points Down (+Y)
      y1 = cy - arrowLen / 2;
      y2 = cy + arrowLen / 2;
    }

    svg += `<line x1="${cx}" y1="${y1}" x2="${cx}" y2="${y2}" 
            stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 2}" />`;

    // Arrow head
    const headSize = Math.min(0.3, dims.width * 0.15);
    const directionSign = dims.direction === 'top' ? -1 : 1;
    svg += `<polygon points="${cx},${y2} ${cx - headSize},${y2 - headSize * directionSign} ${cx + headSize},${y2 - headSize * directionSign}" 
            fill="${opts.strokeColor}" />`;
  } else {
    // Horizontal run: Vertical tread lines
    const stepSpacing = dims.width / dims.stepCount;
    for (let i = 1; i < dims.stepCount; i++) {
      const x = i * stepSpacing;
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${dims.height}" 
                stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
    }

    // Arrow
    const cy = dims.height / 2;
    const arrowLen = dims.width * 0.4;
    const cx = dims.width / 2;

    let x1, x2;
    if (dims.direction === 'left') {
      // Climb toward left: Arrow points Left (-X)
      x1 = cx + arrowLen / 2;
      x2 = cx - arrowLen / 2;
    } else {
      // Climb toward right: Arrow points Right (+X)
      x1 = cx - arrowLen / 2;
      x2 = cx + arrowLen / 2;
    }

    svg += `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" 
            stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 2}" />`;

    // Arrow head
    const headSize = Math.min(0.3, dims.height * 0.15);
    const directionSign = dims.direction === 'left' ? -1 : 1;
    svg += `<polygon points="${x2},${cy} ${x2 - headSize * directionSign},${cy - headSize} ${x2 - headSize * directionSign},${cy + headSize}" 
            fill="${opts.strokeColor}" />`;
  }

  return svg;
}

/**
 * Generate L-shaped stair symbol
 */
function generateLShapedStairSvg(
  shape: LShapedStair,
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  // We render the canonical L-shape (Entry South, Turn Right) and apply a rotate transform based on actual orientation
  // Canonical:
  // - Box is Width x Height (where width = run2 + landing, height = run1 + landing)
  // - Leg 1 (Entry) is at bottom-left, going Up.
  // - Landing at Top-Left.
  // - Leg 2 goes Right.

  // BUT we calculated bounding box based on orientation in calculateStairDimensions.
  // So dims.width and dims.height are already the bounding box for the specific orientation.
  // We just need to draw the rectangles in the right place relative to (0,0).

  let svg = '';
  const landingW =
    shape.landing?.width?.value ??
    (dims.width < dims.height ? dims.width * 0.4 : dims.height * 0.4); // fallback
  const landingH = shape.landing?.height?.value ?? landingW;

  const entry = shape.entry as ViewDirection;
  const turn = shape.turn as 'left' | 'right';

  // We have 4 orientations x 2 turns = 8 cases.
  // Let's simplify by finding the "Corner" position.

  // Rectangles:
  // 1. Leg 1
  // 2. Landing
  // 3. Leg 2

  // Coordinates
  let l1x = 0,
    l1y = 0,
    l1w = 0,
    l1h = 0; // Leg 1
  let lx = 0,
    ly = 0,
    lw = landingW,
    lh = landingH; // Landing
  let l2x = 0,
    l2y = 0,
    l2w = 0,
    l2h = 0; // Leg 2

  // Note: dims.width/height matches the bounding box of the L-shape.

  if (entry === 'bottom') {
    // Climbing Up (from bottom)
    // Leg 1 is vertical at bottom.
    l1h = dims.height - landingH;
    l1w = landingW; // Assuming stair width matches landing
    l1y = landingH;

    ly = 0; // Landing at top

    if (turn === 'right') {
      // Leg 1 on Left side. Landing at Top-Left. Leg 2 goes Right from Landing.
      l1x = 0;
      lx = 0;
      l2x = landingW;
      l2y = 0;
      l2w = dims.width - landingW;
      l2h = landingH;
    } else {
      // Turn Left
      // Leg 1 on Right side. Landing at Top-Right. Leg 2 goes Left from Landing.
      l1x = dims.width - l1w;
      lx = dims.width - landingW;
      l2x = 0;
      l2y = 0;
      l2w = dims.width - landingW;
      l2h = landingH;
    }
  } else if (entry === 'top') {
    // Climbing Down (from top)
    // Leg 1 is vertical at top.
    l1h = dims.height - landingH;
    l1w = landingW;
    l1y = 0;

    ly = dims.height - landingH; // Landing at bottom

    if (turn === 'right') {
      // Turn Right (relative to climbing toward bottom).
      // Walking toward bottom, Turn Right = left (Left in SVG).
      // Leg 1 on Right. Landing at Bottom-Right. Leg 2 goes Left.
      l1x = dims.width - l1w;
      lx = dims.width - landingW;
      l2x = 0;
      l2y = ly;
      l2w = dims.width - landingW;
      l2h = landingH;
    } else {
      // Turn Left (right in SVG)
      // Leg 1 on Left. Landing at Bottom-Left. Leg 2 goes Right.
      l1x = 0;
      lx = 0;
      l2x = landingW;
      l2y = ly;
      l2w = dims.width - landingW;
      l2h = landingH;
    }
  } else if (entry === 'left') {
    // Climbing Right (from left)
    // Leg 1 is horizontal at left.
    l1w = dims.width - landingW;
    l1h = landingH;
    l1x = 0;

    lx = l1w; // Landing at right

    if (turn === 'right') {
      // Walking right, Turn Right = bottom (Down).
      // Leg 1 at Top. Landing at Top-Right. Leg 2 goes Down.
      l1y = 0;
      ly = 0;
      l2x = lx;
      l2y = landingH;
      l2w = landingW;
      l2h = dims.height - landingH;
    } else {
      // Turn Left = top (Up)
      // Leg 1 at Bottom. Landing at Bottom-Right. Leg 2 goes Up.
      l1y = dims.height - l1h;
      ly = l1y;
      l2x = lx;
      l2y = 0;
      l2w = landingW;
      l2h = dims.height - landingH;
    }
  } else if (entry === 'right') {
    // Climbing Left (from right)
    // Leg 1 is horizontal at right.
    l1w = dims.width - landingW;
    l1h = landingH;
    l1x = landingW;

    lx = 0; // Landing at left

    if (turn === 'right') {
      // Walking left, Turn Right = top (Up).
      // Leg 1 at Bottom. Landing at Bottom-Left. Leg 2 goes Up.
      l1y = dims.height - l1h;
      ly = l1y;
      l2x = 0;
      l2y = 0;
      l2w = landingW;
      l2h = dims.height - landingH;
    } else {
      // Turn Left = bottom (Down)
      // Leg 1 at Top. Landing at Top-Left. Leg 2 goes Down.
      l1y = 0;
      ly = 0;
      l2x = 0;
      l2y = landingH;
      l2w = landingW;
      l2h = dims.height - landingH;
    }
  }

  // Draw
  svg += `<rect x="${l1x}" y="${l1y}" width="${l1w}" height="${l1h}" fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;
  svg += `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;
  svg += `<rect x="${l2x}" y="${l2y}" width="${l2w}" height="${l2h}" fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Treads for Leg 1
  // We assume Leg 1 has half steps for simplicity if not specified
  const numSteps = Math.floor(dims.stepCount / 2); // Approximate

  if (entry === 'top' || entry === 'bottom') {
    // Vertical Leg 1
    const stepSpacing = l1h / numSteps;
    for (let i = 1; i < numSteps; i++) {
      const y = entry === 'bottom' ? l1y + l1h - i * stepSpacing : l1y + i * stepSpacing;
      svg += `<line x1="${l1x}" y1="${y}" x2="${l1x + l1w}" y2="${y}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
    }
  } else {
    // Horizontal Leg 1
    const stepSpacing = l1w / numSteps;
    for (let i = 1; i < numSteps; i++) {
      const x = entry === 'right' ? l1x + l1w - i * stepSpacing : l1x + i * stepSpacing;
      svg += `<line x1="${x}" y1="${l1y}" x2="${x}" y2="${l1y + l1h}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
    }
  }

  // Treads for Leg 2 (Remaining steps)
  const numSteps2 = dims.stepCount - numSteps;
  if (l2w > l2h) {
    // Horizontal Leg 2
    const stepSpacing = l2w / numSteps2;
    // Direction? If Leg 1 ends at Landing, Leg 2 starts at Landing.
    // If l2 is right of landing (turn right from south), steps go right.
    const startLeft = l2x === lx + lw; // Starts at left edge (adjacent to landing)
    for (let i = 1; i <= numSteps2; i++) {
      // svg += ... (omitted for brevity/simplicity, showing solid leg for now is mostly fine but let's try)
      svg += `<line x1="${startLeft ? l2x + i * stepSpacing : l2x + l2w - i * stepSpacing}" y1="${l2y}" x2="${startLeft ? l2x + i * stepSpacing : l2x + l2w - i * stepSpacing}" y2="${l2y + l2h}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
    }
  } else {
    // Vertical Leg 2
    const stepSpacing = l2h / numSteps2;
    const startTop = l2y === ly + lh; // Starts at top edge
    for (let i = 1; i <= numSteps2; i++) {
      svg += `<line x1="${l2x}" y1="${startTop ? l2y + i * stepSpacing : l2y + l2h - i * stepSpacing}" x2="${l2x + l2w}" y2="${startTop ? l2y + i * stepSpacing : l2y + l2h - i * stepSpacing}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
    }
  }

  // Arrow
  // Draw arrow on Leg 1
  const centerX = l1x + l1w / 2;
  const centerY = l1y + l1h / 2;

  // Simplified arrow for L-shape
  svg += `<circle cx="${centerX}" cy="${centerY}" r="${Math.min(l1w, l1h) * 0.2}" fill="${opts.strokeColor}" />`;

  return svg;
}

/**
 * Generate U-shaped stair symbol
 */
function generateUShapedStairSvg(
  _shape: UShapedStair,
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  let svg = '';

  // U-shape is two parallel runs connected by a landing
  const runWidth = dims.width * 0.4;
  const landingDepth = dims.height * 0.3;

  // Left run
  svg += `<rect x="0" y="0" width="${runWidth}" height="${dims.height}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Right run
  svg += `<rect x="${dims.width - runWidth}" y="0" width="${runWidth}" height="${dims.height}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Landing connecting them
  svg += `<rect x="${runWidth}" y="0" width="${dims.width - 2 * runWidth}" height="${landingDepth}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Tread lines for runs
  const stepsPerRun = Math.floor(dims.stepCount / 2);
  const stepSpacing = (dims.height - landingDepth) / stepsPerRun;
  for (let i = 1; i < stepsPerRun; i++) {
    const y = landingDepth + i * stepSpacing;
    svg += `<line x1="0" y1="${y}" x2="${runWidth}" y2="${y}" 
            stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
    svg += `<line x1="${dims.width - runWidth}" y1="${y}" x2="${dims.width}" y2="${y}" 
            stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
  }

  // Direction arrows on each run
  svg += `<polygon points="${runWidth / 2},${dims.height * 0.5} ${runWidth / 2 - 0.15},${dims.height * 0.5 + 0.2} ${runWidth / 2 + 0.15},${dims.height * 0.5 + 0.2}" 
        fill="${opts.strokeColor}" />`;

  return svg;
}

/**
 * Generate double-L stair symbol
 */
function generateDoubleLStairSvg(
  _shape: DoubleLStair,
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  // Similar to L-shaped but with three sections
  let svg = '';

  const sectionHeight = dims.height / 3;

  // Three connected sections
  svg += `<rect x="0" y="0" width="${dims.width}" height="${sectionHeight}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;
  svg += `<rect x="0" y="${sectionHeight}" width="${dims.width * 0.6}" height="${sectionHeight}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;
  svg += `<rect x="0" y="${sectionHeight * 2}" width="${dims.width}" height="${sectionHeight}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  return svg;
}

/**
 * Generate spiral stair symbol (concentric arcs)
 */
function generateSpiralStairSvg(
  shape: SpiralStair,
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  let svg = '';

  const cx = dims.width / 2;
  const cy = dims.height / 2;
  const outerR = Math.min(dims.width, dims.height) / 2;
  const innerR = shape.innerRadius?.value ?? outerR * 0.3;

  // Outer circle
  svg += `<circle cx="${cx}" cy="${cy}" r="${outerR}" 
        fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Inner circle (center pole)
  svg += `<circle cx="${cx}" cy="${cy}" r="${innerR}" 
        fill="#fff" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

  // Radial tread lines
  const numTreads = 12;
  for (let i = 0; i < numTreads; i++) {
    const angle = (((i * 360) / numTreads) * Math.PI) / 180;
    const x1 = cx + innerR * Math.cos(angle);
    const y1 = cy + innerR * Math.sin(angle);
    const x2 = cx + outerR * Math.cos(angle);
    const y2 = cy + outerR * Math.sin(angle);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
            stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
  }

  // Rotation direction arrow (curved)
  const arrowR = (innerR + outerR) / 2;
  const startAngle = shape.rotation === 'clockwise' ? 45 : 135;
  const endAngle = shape.rotation === 'clockwise' ? 135 : 45;

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const startX = cx + arrowR * Math.cos(startRad);
  const startY = cy + arrowR * Math.sin(startRad);
  const endX = cx + arrowR * Math.cos(endRad);
  const endY = cy + arrowR * Math.sin(endRad);

  svg += `<path d="M ${startX} ${startY} A ${arrowR} ${arrowR} 0 0 ${shape.rotation === 'clockwise' ? 1 : 0} ${endX} ${endY}" 
        fill="none" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 2}" 
        marker-end="url(#arrowhead)" />`;

  return svg;
}

/**
 * Generate curved stair symbol
 */
function generateCurvedStairSvg(
  _shape: CurvedStair,
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  // Similar to spiral but as an arc, not full circle
  return generateStraightStairSvg(dims, opts); // Simplified for now
}

/**
 * Generate winder stair symbol
 */
function generateWinderStairSvg(
  shape: WinderStair,
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  // L-shaped with triangular winder treads at the corner
  // Note: WinderStair is incompatible with LShapedStair type, so we construct SVG manually or cast carefully
  // Since we need to reuse logic, we can extract common logic or duplicate it.
  // For now, let's just cast to 'any' to reuse generateLShapedStairSvg as it structurally matches expectations (entry/turn/runs)
  // But WinderStair has 'winders' property which LShapedStair doesn't.
  // Let's implement directly to be safe.

  // Fallback to L-shape logic for now
  let svg = generateLShapedStairSvg(shape as unknown as LShapedStair, dims, opts);

  // Add triangular winders at corner
  const landingSize = Math.min(dims.width, dims.height) * 0.4;
  const winders = shape.winders || 3;

  for (let i = 0; i < winders; i++) {
    const angle = (i + 1) * (90 / (winders + 1));
    const rad = (angle * Math.PI) / 180;

    const x = landingSize * Math.cos(rad);
    const y = landingSize * Math.sin(rad);

    svg += `<line x1="0" y1="${landingSize}" x2="${x}" y2="${landingSize - y}" 
            stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
  }

  return svg;
}

/**
 * Generate segmented/custom stair symbol with multiple flights and landings
 */
function generateSegmentedStairSvg(
  shape: SegmentedStair,
  dims: StairDimensions,
  opts: Required<StairRenderOptions>,
): string {
  let svg = '';

  // Track current position and direction as we build the stair
  let currentX = 0;
  let currentY = 0;
  let currentDirection = shape.entry as ViewDirection;

  const defaultWidth = dims.stairWidth;
  // Estimate tread depth from total dimensions
  const treadDepth = dims.height / Math.max(dims.stepCount, 1) || 0.917; // ~11 inches default

  for (const segment of shape.segments) {
    if (segment.segmentType === 'flight') {
      const flightSteps = segment.steps;
      const flightWidth = segment.width?.value ?? defaultWidth;
      const flightLength = flightSteps * treadDepth;

      let flightX = currentX;
      let flightY = currentY;
      let flightW = flightWidth;
      let flightH = flightLength;

      // Adjust dimensions based on direction
      if (currentDirection === 'right' || currentDirection === 'left') {
        flightW = flightLength;
        flightH = flightWidth;
      }

      // Offset based on direction (flight extends in direction of travel)
      if (currentDirection === 'top') {
        flightY = currentY - flightLength;
      } else if (currentDirection === 'left') {
        flightX = currentX - flightLength;
      }

      // Draw flight rectangle
      svg += `<rect x="${flightX}" y="${flightY}" width="${flightW}" height="${flightH}" 
                fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

      // Draw tread lines
      if (currentDirection === 'top' || currentDirection === 'bottom') {
        const stepSpacing = flightH / flightSteps;
        for (let i = 1; i < flightSteps; i++) {
          const y = flightY + i * stepSpacing;
          svg += `<line x1="${flightX}" y1="${y}" x2="${flightX + flightW}" y2="${y}" 
                        stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
        }
      } else {
        const stepSpacing = flightW / flightSteps;
        for (let i = 1; i < flightSteps; i++) {
          const x = flightX + i * stepSpacing;
          svg += `<line x1="${x}" y1="${flightY}" x2="${x}" y2="${flightY + flightH}" 
                        stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth * 0.5}" />`;
        }
      }

      // Update current position to end of flight
      switch (currentDirection) {
        case 'top':
          currentY -= flightLength;
          break;
        case 'bottom':
          currentY += flightLength;
          break;
        case 'right':
          currentX += flightLength;
          break;
        case 'left':
          currentX -= flightLength;
          break;
      }
    } else if (segment.segmentType === 'turn') {
      const landingW = segment.landing?.width?.value ?? defaultWidth;
      const landingH = segment.landing?.height?.value ?? defaultWidth;

      let landingX = currentX;
      let landingY = currentY;

      // Position landing based on current direction
      if (currentDirection === 'top') {
        landingY = currentY - landingH;
      } else if (currentDirection === 'left') {
        landingX = currentX - landingW;
      }

      // Draw landing
      svg += `<rect x="${landingX}" y="${landingY}" width="${landingW}" height="${landingH}" 
                fill="${opts.fillColor}" stroke="${opts.strokeColor}" stroke-width="${opts.strokeWidth}" />`;

      // Update direction based on turn
      currentDirection = applyTurn(currentDirection, segment.direction as 'left' | 'right');

      // Update position to corner of landing based on new direction
      switch (currentDirection) {
        case 'top':
          currentX = landingX;
          currentY = landingY;
          break;
        case 'bottom':
          currentX = landingX;
          currentY = landingY + landingH;
          break;
        case 'right':
          currentX = landingX + landingW;
          currentY = landingY;
          break;
        case 'left':
          currentX = landingX;
          currentY = landingY;
          break;
      }
    }
  }

  return svg;
}

/**
 * Apply a turn to the current direction
 */
function applyTurn(current: ViewDirection, turn: 'left' | 'right'): ViewDirection {
  const directions: ViewDirection[] = ['top', 'right', 'bottom', 'left'];
  const idx = directions.indexOf(current);
  const delta = turn === 'right' ? 1 : -1;
  return directions[(idx + delta + 4) % 4];
}

/**
 * Generate lift door indicator
 */
function generateLiftDoor(
  door: string,
  width: number,
  height: number,
  opts: Required<StairRenderOptions>,
): string {
  const doorWidth = Math.min(width, height) * 0.6;
  const doorDepth = 0.15;

  let x = 0,
    y = 0,
    w = doorWidth,
    h = doorDepth;

  switch (door) {
    case 'top':
      x = (width - doorWidth) / 2;
      y = 0;
      w = doorWidth;
      h = doorDepth;
      break;
    case 'bottom':
      x = (width - doorWidth) / 2;
      y = height - doorDepth;
      w = doorWidth;
      h = doorDepth;
      break;
    case 'right':
      x = width - doorDepth;
      y = (height - doorWidth) / 2;
      w = doorDepth;
      h = doorWidth;
      break;
    case 'left':
      x = 0;
      y = (height - doorWidth) / 2;
      w = doorDepth;
      h = doorWidth;
      break;
  }

  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
        fill="${opts.strokeColor}" />`;
}
