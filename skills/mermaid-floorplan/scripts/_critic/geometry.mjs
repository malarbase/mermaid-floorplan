/**
 * Room-kind inference, geometry helpers, stair geometry, and the finding
 * builder. Pure functions / constants — no I/O, no DSL parsing.
 *
 * Consumed by the rule files and by context.mjs. The stair geometry here
 * mirrors `calculateStairDimensions` from `stair-renderer.ts` so the critic
 * and renderer cannot drift on what footprint a stair actually consumes.
 */

// ---------------------------------------------------------------------------
// Room-kind inference (label/name -> canonical kind)
// ---------------------------------------------------------------------------

// Order matters: more-specific kinds must precede more-generic ones (e.g.
// "powder" and "ensuite" come before "bath", "master" before "bedroom").
export const KIND_PATTERNS = [
  { kind: 'closet', re: /(closet|wardrobe|pantry|mudroom|storage)/i },
  { kind: 'laundry', re: /(laundry|utility)/i },
  { kind: 'powder', re: /(powder|half[-\s]?bath|wc|water\s*closet)/i },
  { kind: 'ensuite', re: /(ensuite|en[-\s]?suite|master[-\s]?bath|primary[-\s]?bath)/i },
  { kind: 'bath', re: /(bath|shower|washroom|toilet|restroom)/i },
  { kind: 'kitchen', re: /(kitchen|kitchenette|galley)/i },
  { kind: 'dining', re: /(dining|breakfast)/i },
  { kind: 'living', re: /(living|lounge|family[-\s]?room|great[-\s]?room|den)/i },
  { kind: 'master_bedroom', re: /(master[-\s]?bed|primary[-\s]?bed|mbr\b)/i },
  { kind: 'bedroom', re: /(bedroom|bed\b|nursery|kids?[-\s]?room|guest[-\s]?room)/i },
  { kind: 'office', re: /(office|study|library|workroom|studio)/i },
  { kind: 'entry', re: /(foyer|entry|entrance|vestibule|mudroom)/i },
  { kind: 'hallway', re: /(hall(way)?|corridor|passage)/i },
  { kind: 'garage', re: /(garage|carport)/i },
  { kind: 'outdoor', re: /(deck|patio|balcony|terrace|porch|yard|garden)/i },
  { kind: 'retail', re: /(shop|retail|store|showroom|sales[-\s]?floor)/i },
  { kind: 'lobby', re: /(lobby|reception|waiting)/i },
  { kind: 'conference', re: /(conference|meeting|boardroom)/i },
];

export const WET_KINDS = new Set(['bath', 'ensuite', 'powder', 'kitchen', 'laundry']);
export const HABITABLE_KINDS = new Set([
  'bedroom',
  'master_bedroom',
  'living',
  'dining',
  'office',
  'kitchen',
]);
export const PUBLIC_KINDS = new Set(['living', 'dining', 'kitchen', 'lobby']);
export const CIRCULATION_KINDS = new Set(['hallway', 'entry', 'lobby']);

export function inferKind(room) {
  const haystack = `${room.name ?? ''} ${room.label ?? ''}`;
  for (const { kind, re } of KIND_PATTERNS) {
    if (re.test(haystack)) return kind;
  }
  return 'other';
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export function roomBounds(r) {
  return { x1: r.x, y1: r.z, x2: r.x + r.width, y2: r.z + r.height };
}

export function sharedEdge(a, b) {
  const A = roomBounds(a);
  const B = roomBounds(b);

  if (A.x2 === B.x1 && A.y1 < B.y2 && B.y1 < A.y2) {
    return {
      direction: 'vertical',
      fromA: 'right',
      fromB: 'left',
      length: Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1),
    };
  }
  if (B.x2 === A.x1 && A.y1 < B.y2 && B.y1 < A.y2) {
    return {
      direction: 'vertical',
      fromA: 'left',
      fromB: 'right',
      length: Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1),
    };
  }
  if (A.y2 === B.y1 && A.x1 < B.x2 && B.x1 < A.x2) {
    return {
      direction: 'horizontal',
      fromA: 'bottom',
      fromB: 'top',
      length: Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1),
    };
  }
  if (B.y2 === A.y1 && A.x1 < B.x2 && B.x1 < A.x2) {
    return {
      direction: 'horizontal',
      fromA: 'top',
      fromB: 'bottom',
      length: Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1),
    };
  }
  return null;
}

export function rectsOverlap(a, b) {
  const A = roomBounds(a);
  const B = roomBounds(b);
  return A.x1 < B.x2 && B.x1 < A.x2 && A.y1 < B.y2 && B.y1 < A.y2;
}

export function hasWindow(room) {
  return (room.walls ?? []).some((w) => w.type === 'window');
}

// ---------------------------------------------------------------------------
// Stair geometry helpers
// ---------------------------------------------------------------------------

// Conversion factors from each unit to feet. Used to convert the
// renderer's hard-coded inch defaults (riser=7in, tread=11in) into
// whatever default unit the floorplan is authored in.
const UNIT_TO_FT = { ft: 1, in: 1 / 12, m: 3.28084, cm: 0.0328084, mm: 0.00328084 };

export function convertLengthToUnit(value, fromUnit, toUnit) {
  const fromFactor = UNIT_TO_FT[fromUnit] ?? 1;
  const toFactor = UNIT_TO_FT[toUnit] ?? 1;
  return (value * fromFactor) / toFactor;
}

/**
 * Required landing depth on each end of a stair, in the floorplan's
 * default unit. Residential code = 3ft, commercial / ada = 4ft.
 */
export function requiredLanding(defaultUnit = 'ft', stairCode = 'residential') {
  const ft = stairCode === 'commercial' || stairCode === 'ada' ? 4 : 3;
  return convertLengthToUnit(ft, 'ft', defaultUnit);
}

/**
 * Compute the 2D footprint of a stair element in floorplan coordinates.
 * Returns:
 *   {
 *     bbox: { x1, y1, x2, y2 },        // axis-aligned outer rectangle
 *     stairWidth, runLength,           // primary geometry
 *     riser, tread, stepCount,         // step counts (mirrors renderer)
 *     shapeType,                       // 'straight' | 'L-shaped' | ...
 *     direction,                       // 'top' | 'bottom' | 'left' | 'right'
 *     entry: { edge, x1, y1, x2, y2 }, // first-tread edge
 *     exit:  { edge, x1, y1, x2, y2 }, // last-tread edge
 *     approximate                      // true for spiral/winder/custom
 *   }
 */
export function computeStairFootprint(stair, defaultUnit = 'ft') {
  const x0 = stair.x ?? 0;
  const z0 = stair.z ?? 0;
  const stairWidth = stair.width ?? convertLengthToUnit(3, 'ft', defaultUnit);
  const rise = Math.max(stair.rise ?? 0, 0.0001);
  const riser = stair.riser ?? convertLengthToUnit(7, 'in', defaultUnit);
  const tread = stair.tread ?? convertLengthToUnit(11, 'in', defaultUnit);
  const stepCount = Math.max(1, Math.ceil(rise / Math.max(riser, 0.0001)));
  const runLength = stepCount * tread;

  const shape = stair.shape ?? { type: 'straight', direction: 'top' };
  const shapeType = shape.type ?? 'straight';

  let width;
  let height;
  let approximate = false;
  // Long-axis direction: where the climb advances.
  let direction = shape.direction ?? shape.entry ?? 'top';

  if (shapeType === 'straight') {
    if (direction === 'right' || direction === 'left') {
      width = runLength;
      height = stairWidth;
    } else {
      width = stairWidth;
      height = runLength;
    }
  } else if (shapeType === 'L-shaped' || shapeType === 'winder') {
    const runs =
      Array.isArray(shape.runs) && shape.runs.length >= 2
        ? shape.runs
        : [Math.floor(stepCount / 2), Math.ceil(stepCount / 2)];
    const run1 = runs[0] * tread;
    const run2 = runs[1] * tread;
    const landingW = shape.landing?.[0] ?? stairWidth;
    const landingH = shape.landing?.[1] ?? landingW;
    const entry = shape.entry ?? 'bottom';
    direction = entry;
    if (entry === 'top' || entry === 'bottom') {
      width = landingW + run2;
      height = run1 + landingH;
    } else {
      width = run1 + landingW;
      height = landingH + run2;
    }
    if (shapeType === 'winder') approximate = true;
  } else if (shapeType === 'U-shaped' || shapeType === 'double-L') {
    const runs =
      Array.isArray(shape.runs) && shape.runs.length >= 2
        ? shape.runs
        : [Math.floor(stepCount / 2), Math.ceil(stepCount / 2)];
    const run1 = runs[0] * tread;
    const run2 = runs[1] * tread;
    const landingW = shape.landing?.[0] ?? stairWidth * 2;
    const landingH = shape.landing?.[1] ?? stairWidth;
    const entry = shape.entry ?? 'bottom';
    direction = entry;
    if (entry === 'top' || entry === 'bottom') {
      width = landingW;
      height = Math.max(run1, run2) + landingH;
    } else {
      width = Math.max(run1, run2) + landingH;
      height = landingW;
    }
    if (shapeType === 'double-L') approximate = true;
  } else if (shapeType === 'spiral' || shapeType === 'curved') {
    const radius = shape.outerRadius ?? shape.radius ?? stairWidth / 2;
    width = radius * 2;
    height = radius * 2;
    approximate = true;
  } else {
    // 'custom' / segmented or unknown — conservative bbox.
    width = stairWidth;
    height = runLength;
    approximate = true;
  }

  const bbox = { x1: x0, y1: z0, x2: x0 + width, y2: z0 + height };

  // Compute entry/exit edges. The "long axis" of the stair is determined
  // by `direction`. The entry edge is opposite the climb direction
  // (the side you step onto the first tread from), the exit edge is
  // where you step off the last tread.
  let entry;
  let exit;
  if (direction === 'top' || direction === 'bottom') {
    // Long axis is Y. Both edges span the stair's full width.
    const entryEdge =
      direction === 'top'
        ? { edge: 'bottom', x1: bbox.x1, y1: bbox.y2, x2: bbox.x2, y2: bbox.y2 }
        : { edge: 'top', x1: bbox.x1, y1: bbox.y1, x2: bbox.x2, y2: bbox.y1 };
    const exitEdge =
      direction === 'top'
        ? { edge: 'top', x1: bbox.x1, y1: bbox.y1, x2: bbox.x2, y2: bbox.y1 }
        : { edge: 'bottom', x1: bbox.x1, y1: bbox.y2, x2: bbox.x2, y2: bbox.y2 };
    entry = entryEdge;
    exit = exitEdge;
  } else {
    // Long axis is X.
    const entryEdge =
      direction === 'right'
        ? { edge: 'left', x1: bbox.x1, y1: bbox.y1, x2: bbox.x1, y2: bbox.y2 }
        : { edge: 'right', x1: bbox.x2, y1: bbox.y1, x2: bbox.x2, y2: bbox.y2 };
    const exitEdge =
      direction === 'right'
        ? { edge: 'right', x1: bbox.x2, y1: bbox.y1, x2: bbox.x2, y2: bbox.y2 }
        : { edge: 'left', x1: bbox.x1, y1: bbox.y1, x2: bbox.x1, y2: bbox.y2 };
    entry = entryEdge;
    exit = exitEdge;
  }

  return {
    bbox,
    width,
    height,
    stairWidth,
    runLength,
    stepCount,
    riser,
    tread,
    shapeType,
    direction,
    entry,
    exit,
    approximate,
  };
}

/**
 * Locate the rooms whose bbox intersects the stair footprint. Returns
 * `{ container, intersecting }`:
 *   - `container` — the single room that fully contains the footprint, or
 *     null when no room contains it.
 *   - `intersecting` — every room whose bbox overlaps the footprint.
 */
export function findStairContainer(footprint, rooms) {
  const fp = footprint.bbox;
  const intersecting = [];
  let container = null;
  for (const r of rooms) {
    const rb = roomBounds(r);
    if (rb.x1 < fp.x2 && fp.x1 < rb.x2 && rb.y1 < fp.y2 && fp.y1 < rb.y2) {
      intersecting.push(r);
      if (rb.x1 <= fp.x1 && rb.y1 <= fp.y1 && rb.x2 >= fp.x2 && rb.y2 >= fp.y2) {
        container = r;
      }
    }
  }
  return { container, intersecting };
}

/**
 * Strip outside the stair's *entry* edge: the rectangle on the floor that a
 * person stands on BEFORE stepping onto the first riser. Returns
 * `{ x1, y1, x2, y2, axis, range }` where `axis` is the long-axis ('y' for
 * direction in {top,bottom}, 'x' for {left,right}) and `range` is the strip's
 * extent along that long axis. The strip is unclamped — `stair_landing_clearance`
 * already flags when the container is too small to host it.
 */
export function bottomStepLandingStrip(fp, landing) {
  const bbox = fp.bbox;
  const dir = fp.direction;
  if (dir === 'top') {
    return {
      x1: bbox.x1,
      y1: bbox.y2,
      x2: bbox.x2,
      y2: bbox.y2 + landing,
      axis: 'y',
      range: [bbox.y2, bbox.y2 + landing],
    };
  }
  if (dir === 'bottom') {
    return {
      x1: bbox.x1,
      y1: bbox.y1 - landing,
      x2: bbox.x2,
      y2: bbox.y1,
      axis: 'y',
      range: [bbox.y1 - landing, bbox.y1],
    };
  }
  if (dir === 'right') {
    return {
      x1: bbox.x1 - landing,
      y1: bbox.y1,
      x2: bbox.x1,
      y2: bbox.y2,
      axis: 'x',
      range: [bbox.x1 - landing, bbox.x1],
    };
  }
  // 'left'
  return {
    x1: bbox.x2,
    y1: bbox.y1,
    x2: bbox.x2 + landing,
    y2: bbox.y2,
    axis: 'x',
    range: [bbox.x2, bbox.x2 + landing],
  };
}

/**
 * Strip outside the stair's *exit* edge: the rectangle on the floor that a
 * person steps onto AFTER the last riser, i.e. the arrival landing on the
 * floor where this stair lands. Mirror of `bottomStepLandingStrip`.
 */
export function topStepLandingStrip(fp, landing) {
  const bbox = fp.bbox;
  const dir = fp.direction;
  if (dir === 'top') {
    return {
      x1: bbox.x1,
      y1: bbox.y1 - landing,
      x2: bbox.x2,
      y2: bbox.y1,
      axis: 'y',
      range: [bbox.y1 - landing, bbox.y1],
    };
  }
  if (dir === 'bottom') {
    return {
      x1: bbox.x1,
      y1: bbox.y2,
      x2: bbox.x2,
      y2: bbox.y2 + landing,
      axis: 'y',
      range: [bbox.y2, bbox.y2 + landing],
    };
  }
  if (dir === 'right') {
    return {
      x1: bbox.x2,
      y1: bbox.y1,
      x2: bbox.x2 + landing,
      y2: bbox.y2,
      axis: 'x',
      range: [bbox.x2, bbox.x2 + landing],
    };
  }
  // 'left'
  return {
    x1: bbox.x1 - landing,
    y1: bbox.y1,
    x2: bbox.x1,
    y2: bbox.y2,
    axis: 'x',
    range: [bbox.x1 - landing, bbox.x1],
  };
}

/**
 * Given the containing room and a stair footprint, suggest an alternative
 * shape that would fit. Returns a short human-readable advisory string,
 * or null when nothing better fits.
 */
export function suggestStairShape(stair, footprint, room, defaultUnit = 'ft') {
  const landing = requiredLanding(defaultUnit, 'residential');
  const stairWidth = footprint.stairWidth;
  const tread = footprint.tread;
  const stepCount = footprint.stepCount;
  const fullRun = stepCount * tread;
  const halfRun = Math.ceil(stepCount / 2) * tread;
  const longSide = Math.max(room.width, room.height);
  const shortSide = Math.min(room.width, room.height);

  const candidates = [];
  // U-shaped: two runs side-by-side, length ~= halfRun + landing, width ~= 2*stairWidth.
  if (longSide >= halfRun + landing && shortSide >= 2 * stairWidth) {
    candidates.push(
      `change \`${stair.name}\` to \`shape U-shaped\` (fits in ~${(2 * stairWidth).toFixed(1)} x ${(halfRun + landing).toFixed(1)} ${defaultUnit})`,
    );
  }
  // L-shaped: runs perpendicular, footprint ~= (halfRun + landing) x (halfRun + landing).
  const lLong = halfRun + landing;
  if (longSide >= lLong && shortSide >= lLong) {
    candidates.push(
      `change \`${stair.name}\` to \`shape L-shaped\` (fits in ~${lLong.toFixed(1)} x ${lLong.toFixed(1)} ${defaultUnit})`,
    );
  }
  // Spiral: radius = stairWidth so it fits a stairWidth*2 x stairWidth*2 box.
  const spiralSize = stairWidth * 2;
  if (longSide >= spiralSize && shortSide >= spiralSize) {
    candidates.push(
      `change \`${stair.name}\` to \`shape spiral\` (compact, fits in ~${spiralSize.toFixed(1)} x ${spiralSize.toFixed(1)} ${defaultUnit}, but slow to ascend)`,
    );
  }

  // suppress unused variable lint — fullRun is kept for documentation
  void fullRun;

  if (candidates.length === 0) return null;
  return candidates.join('; or ');
}

// ---------------------------------------------------------------------------
// Finding builder
// ---------------------------------------------------------------------------

/**
 * Build a critic finding object. Promoted from private so all rule files
 * can import it without duplicating the shape.
 */
export function f(rule, severity, message, rooms = [], details = {}, suggestion = undefined) {
  return { rule, severity, message, rooms, details, ...(suggestion ? { suggestion } : {}) };
}
