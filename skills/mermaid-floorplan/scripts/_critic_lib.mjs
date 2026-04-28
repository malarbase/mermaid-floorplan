/**
 * Shared library consumed by design_critic.mjs and suggest_improvements.mjs.
 *
 * Keeps the rule engine, geometry helpers, and room-kind inference in one
 * place so the CLI critic and the suggester cannot drift on how rules
 * identify rooms or detect adjacency.
 */

import { convertFloorplanToJson } from 'floorplan-language';
import { parseDsl, runLangiumValidation } from './_lib.mjs';

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
//
// Mirror `calculateStairDimensions` from `stair-renderer.ts` so the critic
// and renderer cannot drift on what footprint a stair actually consumes.
// ---------------------------------------------------------------------------

// Conversion factors from each unit to feet. Used to convert the
// renderer's hard-coded inch defaults (riser=7in, tread=11in) into
// whatever default unit the floorplan is authored in.
const UNIT_TO_FT = { ft: 1, in: 1 / 12, m: 3.28084, cm: 0.0328084, mm: 0.00328084 };

function convertLengthToUnit(value, fromUnit, toUnit) {
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

  if (candidates.length === 0) return null;
  return candidates.join('; or ');
}

// ---------------------------------------------------------------------------
// AST helpers (for features the JSON converter strips, e.g. `outside`)
// ---------------------------------------------------------------------------

export function extractConnectionsFromAst(floorplan) {
  const out = [];
  for (const c of floorplan.connections ?? []) {
    const fromRef = c.from?.room;
    const toRef = c.to?.room;
    const fromText = fromRef?.$cstNode?.text ?? fromRef?.$refText;
    const toText = toRef?.$cstNode?.text ?? toRef?.$refText;
    const fromRoom = fromRef?.name ?? (fromText === 'outside' ? 'outside' : fromText);
    const toRoom = toRef?.name ?? (toText === 'outside' ? 'outside' : toText);
    if (!fromRoom || !toRoom) continue;
    out.push({
      fromRoom,
      fromWall: c.from?.wall ?? null,
      toRoom,
      toWall: c.to?.wall ?? null,
      doorType: c.doorType,
      position: c.position,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Context builder
//
// The single-floor rules continue to consume the legacy fields
// (rooms / adjacency / kinds / connections / floorId) which describe the
// FIRST floor. Multi-floor rules access `floors` (array of mini-contexts,
// one per floor) and `verticalConnections` to inspect cross-floor structure.
// ---------------------------------------------------------------------------

function buildSingleFloorContext(floor, allConnections, config = {}) {
  const rooms = floor.rooms ?? [];
  const roomsByName = new Map(rooms.map((r) => [r.name, r]));
  const adjacency = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const edge = sharedEdge(rooms[i], rooms[j]);
      if (edge) {
        adjacency.push({
          rooms: [rooms[i].name, rooms[j].name],
          length: edge.length,
          edge,
        });
      }
    }
  }
  const kinds = new Map(rooms.map((r) => [r.name, inferKind(r)]));
  // Keep only connections that touch this floor. An outside connection
  // counts only when the other end is a room on this floor; otherwise it
  // belongs to a different floor's egress and shouldn't influence this
  // floor's reachability check.
  const floorConns = (allConnections ?? []).filter((c) => {
    const fromOut = c.fromRoom === 'outside';
    const toOut = c.toRoom === 'outside';
    if (fromOut) return roomsByName.has(c.toRoom);
    if (toOut) return roomsByName.has(c.fromRoom);
    return roomsByName.has(c.fromRoom) && roomsByName.has(c.toRoom);
  });
  let bbox = null;
  if (rooms.length > 0) {
    const xMin = Math.min(...rooms.map((r) => r.x));
    const yMin = Math.min(...rooms.map((r) => r.z));
    const xMax = Math.max(...rooms.map((r) => r.x + r.width));
    const yMax = Math.max(...rooms.map((r) => r.z + r.height));
    bbox = { xMin, yMin, xMax, yMax, width: xMax - xMin, height: yMax - yMin };
  }
  return {
    rooms,
    roomsByName,
    connections: floorConns,
    adjacency,
    kinds,
    floorId: floor.id,
    floorHeight: floor.height,
    stairs: floor.stairs ?? [],
    lifts: floor.lifts ?? [],
    bbox,
    config,
  };
}

export function buildCriticContext(floors, connections, verticalConnections = [], config = {}) {
  if (!floors || floors.length === 0) return null;
  const perFloor = floors.map((f) => buildSingleFloorContext(f, connections, config));
  const primary = perFloor[0];
  return {
    ...primary,
    floors: perFloor,
    verticalConnections,
    config,
  };
}

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

function f(rule, severity, message, rooms = [], details = {}, suggestion = undefined) {
  return { rule, severity, message, rooms, details, ...(suggestion ? { suggestion } : {}) };
}

/**
 * Does the connection `c` (already known to touch `container`) provide a
 * useable egress for the given landing `strip` of stair `fp` on `floor`?
 *
 * Decision rules:
 * - The connection's other endpoint must be a real room (or `outside`); a
 *   self-connection is ignored.
 * - If the connection sits on a wall *perpendicular* to the stair's long
 *   axis (a "short" wall), the wall's coordinate along the long axis must
 *   fall within the strip's range. There is no tread collision because the
 *   strip — by construction — lies outside the bbox.
 * - If the connection sits on a wall *parallel* to the long axis (a "long"
 *   wall), the door's range along the long axis must fit fully inside the
 *   strip range AND not overlap the tread range (= bbox along the long axis).
 */
function connectionServesLandingStrip(c, container, fp, strip, floor, doorWidth) {
  let myWall;
  let otherSide;
  if (c.fromRoom === container.name) {
    myWall = c.fromWall;
    otherSide = { roomName: c.toRoom, wall: c.toWall };
  } else if (c.toRoom === container.name) {
    myWall = c.toWall;
    otherSide = { roomName: c.fromRoom, wall: c.fromWall };
  } else {
    return false;
  }
  if (!myWall) return false;
  if (otherSide.roomName === container.name) return false;

  const rb = roomBounds(container);
  const isWallHoriz = myWall === 'top' || myWall === 'bottom';
  const otherRoom =
    otherSide.roomName === 'outside' ? null : floor.roomsByName.get(otherSide.roomName);

  let overlapStart;
  let overlapEnd;
  if (otherRoom) {
    const ob = roomBounds(otherRoom);
    if (isWallHoriz) {
      overlapStart = Math.max(rb.x1, ob.x1);
      overlapEnd = Math.min(rb.x2, ob.x2);
    } else {
      overlapStart = Math.max(rb.y1, ob.y1);
      overlapEnd = Math.min(rb.y2, ob.y2);
    }
    if (overlapEnd <= overlapStart) return false;
  } else {
    if (isWallHoriz) {
      overlapStart = rb.x1;
      overlapEnd = rb.x2;
    } else {
      overlapStart = rb.y1;
      overlapEnd = rb.y2;
    }
  }
  const overlapLen = overlapEnd - overlapStart;
  const pos = c.position ?? 50;
  const doorCenter = overlapStart + (overlapLen * pos) / 100;
  const doorMin = doorCenter - doorWidth / 2;
  const doorMax = doorCenter + doorWidth / 2;

  // The strip is the *minimum required* landing region (depth = `landing`),
  // but the actual landing inside the container can be larger when the
  // container extends further past the bbox edge. A door provides egress
  // for the strip as long as (a) it sits on the same side of the tread
  // as the strip and (b) it's within the container's wall bounds. We
  // derive `nearEdge` (the bbox face that the strip hugs) and `farEdge`
  // (the container's far wall) from the strip orientation.
  const eps = 0.001;
  if (strip.axis === 'y') {
    if (isWallHoriz) {
      const wallY = myWall === 'top' ? rb.y1 : rb.y2;
      return wallY >= strip.range[0] - eps && wallY <= strip.range[1] + eps;
    }
    // Strip on +Y side of bbox (range starts at bbox.y2):
    //   door must satisfy doorMin >= bbox.y2 (clear of tread) AND
    //   doorMax <= rb.y2 (within container).
    if (Math.abs(strip.range[0] - fp.bbox.y2) < eps) {
      if (doorMin < fp.bbox.y2 - eps) return false;
      if (doorMax > rb.y2 + eps) return false;
      return true;
    }
    // Strip on -Y side of bbox (range ends at bbox.y1):
    //   doorMax <= bbox.y1 AND doorMin >= rb.y1.
    if (Math.abs(strip.range[1] - fp.bbox.y1) < eps) {
      if (doorMax > fp.bbox.y1 + eps) return false;
      if (doorMin < rb.y1 - eps) return false;
      return true;
    }
    // Fallback: strip not aligned with either bbox face — keep strict
    // strip-range containment.
    if (doorMin < strip.range[0] - eps) return false;
    if (doorMax > strip.range[1] + eps) return false;
    if (doorMax > fp.bbox.y1 + eps && fp.bbox.y2 > doorMin + eps) return false;
    return true;
  }
  if (!isWallHoriz) {
    const wallX = myWall === 'left' ? rb.x1 : rb.x2;
    return wallX >= strip.range[0] - eps && wallX <= strip.range[1] + eps;
  }
  if (Math.abs(strip.range[0] - fp.bbox.x2) < eps) {
    if (doorMin < fp.bbox.x2 - eps) return false;
    if (doorMax > rb.x2 + eps) return false;
    return true;
  }
  if (Math.abs(strip.range[1] - fp.bbox.x1) < eps) {
    if (doorMax > fp.bbox.x1 + eps) return false;
    if (doorMin < rb.x1 - eps) return false;
    return true;
  }
  if (doorMin < strip.range[0] - eps) return false;
  if (doorMax > strip.range[1] + eps) return false;
  if (doorMax > fp.bbox.x1 + eps && fp.bbox.x2 > doorMin + eps) return false;
  return true;
}

/**
 * Compute a concrete suggestion for the missing landing-strip connection.
 * Returns `{ fromRoom, fromWall, toRoom, toWall, type, position }` or `null`
 * if no adjacent room provides a viable wall.
 *
 * Wall-selection priority:
 *   1. Long walls (parallel to the stair's long axis) that already host a
 *      connection on `container` — keeps the existing access pattern.
 *   2. Any other long wall on `container`.
 * For each candidate wall we look for an adjacent room whose overlap with
 * `container` covers the strip's midpoint.
 */
function suggestLandingEgressConnection(floor, container, fp, strip, stairCode) {
  const rb = roomBounds(container);
  const longAxisIsY = strip.axis === 'y';
  const longWalls = longAxisIsY ? ['left', 'right'] : ['top', 'bottom'];

  const wallToOther = new Map();
  for (const c of floor.connections ?? []) {
    let myWall;
    let otherName;
    let otherWall;
    if (c.fromRoom === container.name) {
      myWall = c.fromWall;
      otherName = c.toRoom;
      otherWall = c.toWall;
    } else if (c.toRoom === container.name) {
      myWall = c.toWall;
      otherName = c.fromRoom;
      otherWall = c.fromWall;
    } else {
      continue;
    }
    if (!myWall || !otherWall) continue;
    if (otherName === 'outside' || otherName === container.name) continue;
    if (!wallToOther.has(myWall)) wallToOther.set(myWall, []);
    wallToOther.get(myWall).push({ otherRoomName: otherName, otherWall });
  }

  const orderedWalls = [];
  for (const w of longWalls) if (wallToOther.has(w)) orderedWalls.push(w);
  for (const w of longWalls) if (!orderedWalls.includes(w)) orderedWalls.push(w);

  const connectorType = stairCode === 'commercial' || stairCode === 'ada' ? 'door' : 'opening';
  const stripMid = (strip.range[0] + strip.range[1]) / 2;

  for (const myWall of orderedWalls) {
    const isHoriz = myWall === 'top' || myWall === 'bottom';
    let candidates = wallToOther.get(myWall) ?? [];
    if (candidates.length === 0) {
      candidates = [];
      for (const r of floor.rooms) {
        if (r.name === container.name) continue;
        const ob = roomBounds(r);
        let adjacent = false;
        let otherWall = null;
        if (myWall === 'top' && Math.abs(ob.y2 - rb.y1) < 0.001 && ob.x1 < rb.x2 && rb.x1 < ob.x2) {
          adjacent = true;
          otherWall = 'bottom';
        } else if (
          myWall === 'bottom' &&
          Math.abs(ob.y1 - rb.y2) < 0.001 &&
          ob.x1 < rb.x2 &&
          rb.x1 < ob.x2
        ) {
          adjacent = true;
          otherWall = 'top';
        } else if (
          myWall === 'left' &&
          Math.abs(ob.x2 - rb.x1) < 0.001 &&
          ob.y1 < rb.y2 &&
          rb.y1 < ob.y2
        ) {
          adjacent = true;
          otherWall = 'right';
        } else if (
          myWall === 'right' &&
          Math.abs(ob.x1 - rb.x2) < 0.001 &&
          ob.y1 < rb.y2 &&
          rb.y1 < ob.y2
        ) {
          adjacent = true;
          otherWall = 'left';
        }
        if (adjacent) candidates.push({ otherRoomName: r.name, otherWall });
      }
    }

    for (const { otherRoomName, otherWall } of candidates) {
      const otherRoom = floor.roomsByName.get(otherRoomName);
      if (!otherRoom) continue;
      const ob = roomBounds(otherRoom);
      let overlapStart;
      let overlapEnd;
      if (isHoriz) {
        overlapStart = Math.max(rb.x1, ob.x1);
        overlapEnd = Math.min(rb.x2, ob.x2);
      } else {
        overlapStart = Math.max(rb.y1, ob.y1);
        overlapEnd = Math.min(rb.y2, ob.y2);
      }
      if (overlapEnd - overlapStart <= 0.001) continue;
      const overlapLen = overlapEnd - overlapStart;
      // For a long wall the long axis matches the overlap axis; map stripMid
      // directly. If we ever hit a short-wall candidate the strip straddles
      // a wall that's perpendicular to the overlap, which we don't try to
      // suggest — bail and let the next wall try.
      if (
        (longAxisIsY && isHoriz) ||
        (!longAxisIsY && !isHoriz)
      ) {
        continue;
      }
      const pos = ((stripMid - overlapStart) / overlapLen) * 100;
      if (pos < 0 || pos > 100) continue;
      return {
        fromRoom: otherRoomName,
        fromWall: otherWall,
        toRoom: container.name,
        toWall: myWall,
        type: connectorType,
        position: Math.round(pos * 100) / 100,
      };
    }
  }
  return null;
}

export const rules = {
  entry_from_outside(ctx) {
    const hasExterior = ctx.connections.some(
      (c) => c.toRoom === 'outside' || c.fromRoom === 'outside',
    );
    if (!hasExterior) {
      return [
        f(
          'entry_from_outside',
          'error',
          'No door to outside. Every floorplan needs at least one exterior entry.',
          [],
          {},
          'add a `connect <EntryRoom>.<wall> to outside door at 50%` statement',
        ),
      ];
    }
    return [];
  },

  reachability(ctx) {
    if (ctx.rooms.length === 0) return [];

    const graph = new Map();
    for (const r of ctx.rooms) graph.set(r.name, new Set());
    graph.set('outside', new Set());

    for (const c of ctx.connections) {
      if (!graph.has(c.fromRoom)) graph.set(c.fromRoom, new Set());
      if (!graph.has(c.toRoom)) graph.set(c.toRoom, new Set());
      graph.get(c.fromRoom).add(c.toRoom);
      graph.get(c.toRoom).add(c.fromRoom);
    }

    // Adjacent rooms whose shared walls are both `open` form a contiguous
    // open-plan space and are implicitly reachable from each other.
    for (const edge of ctx.adjacency) {
      const [aName, bName] = edge.rooms;
      const a = ctx.roomsByName.get(aName);
      const b = ctx.roomsByName.get(bName);
      if (!a || !b) continue;
      const info = edge.edge;
      const aWall = (a.walls ?? []).find((w) => w.direction === info.fromA);
      const bWall = (b.walls ?? []).find((w) => w.direction === info.fromB);
      if (aWall?.type === 'open' && bWall?.type === 'open') {
        graph.get(aName).add(bName);
        graph.get(bName).add(aName);
      }
    }

    // Determine BFS entry points. Outside doors take precedence; on
    // upper floors there's no outside, so any room that contains a stair
    // or lift element is treated as an entry point (the vertical link
    // promises egress to a lower floor).
    const entries = [];
    if (graph.has('outside') && graph.get('outside').size > 0) {
      entries.push('outside');
    } else {
      const stairLikes = [...(ctx.stairs ?? []), ...(ctx.lifts ?? [])];
      for (const s of stairLikes) {
        const containing = ctx.rooms.find(
          (r) =>
            s.x >= r.x &&
            s.x < r.x + r.width &&
            s.z >= r.z &&
            s.z < r.z + r.height,
        );
        if (containing && !entries.includes(containing.name)) {
          entries.push(containing.name);
        }
      }
      if (entries.length === 0 && ctx.rooms.length > 0) {
        entries.push(ctx.rooms[0].name);
      }
    }

    const visited = new Set(entries);
    const queue = [...entries];
    while (queue.length) {
      const node = queue.shift();
      for (const next of graph.get(node) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    const start = entries[0] ?? 'outside';

    const unreachable = ctx.rooms.filter((r) => !visited.has(r.name)).map((r) => r.name);
    if (unreachable.length === 0) return [];
    return unreachable.map((name) =>
      f(
        'reachability',
        'error',
        `Room "${name}" has no door or opening connecting it to the rest of the plan.`,
        [name],
        { startedFrom: start },
        `add a \`connect ${name}.<wall> to <neighbor>.<wall> door at 50%\` statement`,
      ),
    );
  },

  corridor_width(ctx) {
    const findings = [];
    for (const r of ctx.rooms) {
      const kind = ctx.kinds.get(r.name);
      const short = Math.min(r.width, r.height);
      const long = Math.max(r.width, r.height);
      const aspect = long / Math.max(short, 0.0001);
      const isCorridor = kind === 'hallway' || (aspect >= 3 && short < 6);
      if (!isCorridor) continue;

      if (short < 3) {
        findings.push(
          f(
            'corridor_width',
            'error',
            `Corridor "${r.name}" is ${short}ft wide on its short side; minimum usable width is 3ft.`,
            [r.name],
            { shortSide: short, minimum: 3 },
            `resize ${r.name} to at least 4ft on its short side`,
          ),
        );
      } else if (short < 4) {
        findings.push(
          f(
            'corridor_width',
            'warning',
            `Corridor "${r.name}" is ${short}ft wide; recommend >= 4ft for comfortable two-way passage.`,
            [r.name],
            { shortSide: short, recommendedMin: 4 },
            `resize ${r.name} to at least 4ft on its short side`,
          ),
        );
      }
    }
    return findings;
  },

  door_opening(ctx) {
    const findings = [];
    for (const c of ctx.connections) {
      if (c.toRoom === 'outside' || c.fromRoom === 'outside') continue;
      const a = ctx.roomsByName.get(c.fromRoom);
      const b = ctx.roomsByName.get(c.toRoom);
      if (!a || !b) continue;
      const edge = sharedEdge(a, b);
      if (!edge) {
        findings.push(
          f(
            'door_opening',
            'error',
            `Door between "${c.fromRoom}" and "${c.toRoom}" is declared on walls that don't share an edge.`,
            [c.fromRoom, c.toRoom],
            { fromWall: c.fromWall, toWall: c.toWall },
            `move one of the rooms so ${c.fromRoom}.${c.fromWall} aligns with ${c.toRoom}.${c.toWall}`,
          ),
        );
      } else {
        const pos = c.position ?? 50;
        if (pos < 5 || pos > 95) {
          findings.push(
            f(
              'door_opening',
              'warning',
              `Door on ${c.fromRoom}.${c.fromWall} -> ${c.toRoom}.${c.toWall} is at ${pos}%, too close to a corner.`,
              [c.fromRoom, c.toRoom],
              { position: pos },
              `reposition the door to between 10% and 90%`,
            ),
          );
        }
      }
    }
    return findings;
  },

  windowless_habitable(ctx) {
    const findings = [];
    for (const r of ctx.rooms) {
      const kind = ctx.kinds.get(r.name);
      if (!HABITABLE_KINDS.has(kind)) continue;
      if (hasWindow(r)) continue;
      findings.push(
        f(
          'windowless_habitable',
          'warning',
          `Habitable room "${r.name}" (${kind}) has no window wall.`,
          [r.name],
          { kind },
          `change one exterior-facing wall on ${r.name} to 'window'`,
        ),
      );
    }
    return findings;
  },

  bedroom_bath_adjacency(ctx) {
    const findings = [];
    const baths = new Set(
      ctx.rooms
        .filter((r) => ['bath', 'ensuite', 'powder'].includes(ctx.kinds.get(r.name)))
        .map((r) => r.name),
    );
    if (baths.size === 0) return [];

    // Build connection graph (door + open-wall) for hop counting.
    const graph = new Map();
    for (const r of ctx.rooms) graph.set(r.name, new Set());
    for (const c of ctx.connections) {
      if (c.fromRoom === 'outside' || c.toRoom === 'outside') continue;
      if (!graph.has(c.fromRoom) || !graph.has(c.toRoom)) continue;
      graph.get(c.fromRoom).add(c.toRoom);
      graph.get(c.toRoom).add(c.fromRoom);
    }
    for (const e of ctx.adjacency) {
      const [aName, bName] = e.rooms;
      const a = ctx.roomsByName.get(aName);
      const b = ctx.roomsByName.get(bName);
      const aWall = (a?.walls ?? []).find((w) => w.direction === e.edge.fromA);
      const bWall = (b?.walls ?? []).find((w) => w.direction === e.edge.fromB);
      if (aWall?.type === 'open' && bWall?.type === 'open') {
        graph.get(aName)?.add(bName);
        graph.get(bName)?.add(aName);
      }
    }

    function hopsToBath(start) {
      const visited = new Map([[start, 0]]);
      const queue = [start];
      while (queue.length) {
        const node = queue.shift();
        const d = visited.get(node);
        if (baths.has(node) && node !== start) return d;
        for (const next of graph.get(node) ?? []) {
          if (!visited.has(next)) {
            visited.set(next, d + 1);
            queue.push(next);
          }
        }
      }
      return Infinity;
    }

    const bedrooms = ctx.rooms.filter((r) => {
      const k = ctx.kinds.get(r.name);
      return k === 'bedroom' || k === 'master_bedroom';
    });

    for (const bedroom of bedrooms) {
      const isMaster = ctx.kinds.get(bedroom.name) === 'master_bedroom';
      const hops = hopsToBath(bedroom.name);
      // Master: should have an ensuite (1 hop) or hop <= 2.
      // Other bedrooms: should be within 2 hops of a bathroom.
      const limit = 2;
      if (hops > limit) {
        findings.push(
          f(
            'bedroom_bath_adjacency',
            'warning',
            `${isMaster ? 'Primary' : 'Bedroom'} "${bedroom.name}" is ${hops === Infinity ? 'not connected to' : `${hops} hops from`} the nearest bathroom. Bedrooms should be within ${limit} hops of a bathroom.`,
            [bedroom.name],
            { hopsToBath: hops === Infinity ? null : hops, limit, isMaster },
            isMaster
              ? `add an ensuite adjacent to ${bedroom.name} and connect them with a door`
              : `add a hall bath off the same hallway as ${bedroom.name}`,
          ),
        );
      }
    }
    return findings;
  },

  wet_walls(ctx) {
    // Regional / cultural preference: shared wet walls reduce plumbing cost
    // (common in North American/European construction) but some traditions
    // (e.g. Vastu, certain South Asian conventions) keep kitchen and bath
    // physically separated. Severity is `info`, not `warning`, so neither
    // preference is penalised by default. Authors who want the strict
    // "share walls" rule can run with `--strict` to escalate it.
    const wetRooms = ctx.rooms.filter((r) => WET_KINDS.has(ctx.kinds.get(r.name)));
    if (wetRooms.length < 2) return [];
    const wetNames = new Set(wetRooms.map((r) => r.name));
    const wetPairsAdjacent = ctx.adjacency.some(
      (e) => wetNames.has(e.rooms[0]) && wetNames.has(e.rooms[1]),
    );
    if (wetPairsAdjacent) return [];
    return [
      f(
        'wet_walls',
        'info',
        'No two wet rooms (kitchen/bath/laundry) share a wall. This costs more in plumbing but is preferred by some traditions; treat as a preference, not a defect.',
        wetRooms.map((r) => r.name),
        { wetRoomCount: wetRooms.length, preference: 'either' },
        `if your tradition prefers shared wet walls, group two wet rooms against a shared interior wall; otherwise leave as-is`,
      ),
    ];
  },

  bathroom_off_entry(ctx) {
    // A bathroom should not connect directly to an entry/foyer/lobby room
    // or the outside. Doors should land in a hallway, living area, or
    // bedroom corridor instead.
    const entryKinds = new Set(['entry', 'lobby']);
    const bathKinds = new Set(['bath', 'ensuite', 'powder']);
    const findings = [];
    for (const c of ctx.connections) {
      const fromOut = c.fromRoom === 'outside';
      const toOut = c.toRoom === 'outside';
      const fromKind = ctx.kinds.get(c.fromRoom);
      const toKind = ctx.kinds.get(c.toRoom);
      const bathSide =
        bathKinds.has(fromKind) ? c.fromRoom :
        bathKinds.has(toKind) ? c.toRoom : null;
      if (!bathSide) continue;
      const otherKind = bathSide === c.fromRoom ? toKind : fromKind;
      const otherSide = bathSide === c.fromRoom ? c.toRoom : c.fromRoom;
      const otherIsOutside = bathSide === c.fromRoom ? toOut : fromOut;
      if (otherIsOutside) {
        findings.push(
          f(
            'bathroom_off_entry',
            'warning',
            `Bathroom "${bathSide}" opens directly to the outside. Bathrooms should be reached through interior circulation, not through an exterior door.`,
            [bathSide],
            { otherSide: 'outside' },
            `move the exterior door to an entry/foyer instead`,
          ),
        );
        continue;
      }
      if (entryKinds.has(otherKind)) {
        findings.push(
          f(
            'bathroom_off_entry',
            'warning',
            `Bathroom "${bathSide}" opens directly off the ${otherKind} "${otherSide}". Most occupants prefer bathrooms reached through a hallway or living area, not the entry.`,
            [bathSide, otherSide],
            { otherKind },
            `add a hallway buffer or move the bathroom door to face a hallway / living room instead of ${otherSide}`,
          ),
        );
      }
    }
    return findings;
  },

  corridor_only_hallway(ctx) {
    // A hallway whose entire purpose is to connect two rooms is wasted
    // floor area; the rooms could share an open wall or a single
    // doorway instead.
    const findings = [];
    for (const r of ctx.rooms) {
      if (ctx.kinds.get(r.name) !== 'hallway') continue;
      const conns = ctx.connections.filter(
        (c) => c.fromRoom === r.name || c.toRoom === r.name,
      );
      const distinctNeighbors = new Set(
        conns.map((c) => (c.fromRoom === r.name ? c.toRoom : c.fromRoom)),
      );
      distinctNeighbors.delete('outside');
      const area = r.width * r.height;
      if (distinctNeighbors.size <= 2 && area >= 30) {
        findings.push(
          f(
            'corridor_only_hallway',
            'warning',
            `Hallway "${r.name}" only connects ${distinctNeighbors.size} other room(s) and consumes ${area} sqft. Consider replacing the hallway with a direct doorway or open-plan transition.`,
            [r.name, ...distinctNeighbors],
            { neighborCount: distinctNeighbors.size, area },
            `delete ${r.name} and connect ${[...distinctNeighbors].join(' <-> ')} directly, or merge them into an open-plan zone`,
          ),
        );
      }
    }
    return findings;
  },

  bathroom_privacy(ctx) {
    const findings = [];
    for (const c of ctx.connections) {
      if (c.toRoom === 'outside' || c.fromRoom === 'outside') continue;
      const fromKind = ctx.kinds.get(c.fromRoom);
      const toKind = ctx.kinds.get(c.toRoom);
      const bathKinds = ['bath', 'ensuite', 'powder'];
      const bathSide = bathKinds.includes(fromKind)
        ? c.fromRoom
        : bathKinds.includes(toKind)
          ? c.toRoom
          : null;
      const otherSide = bathSide === c.fromRoom ? c.toRoom : c.fromRoom;
      const otherKind = bathSide === c.fromRoom ? toKind : fromKind;
      if (!bathSide) continue;
      if (PUBLIC_KINDS.has(otherKind)) {
        findings.push(
          f(
            'bathroom_privacy',
            'warning',
            `Bathroom "${bathSide}" opens directly into a public room "${otherSide}" (${otherKind}). Prefer a hallway buffer.`,
            [bathSide, otherSide],
            { otherKind },
            `route ${bathSide} through a hallway or foyer instead of directly off ${otherSide}`,
          ),
        );
      }
    }
    return findings;
  },

  bedroom_size(ctx) {
    const MIN_AREAS = { bedroom: 70, master_bedroom: 120 };
    const findings = [];
    for (const r of ctx.rooms) {
      const kind = ctx.kinds.get(r.name);
      const min = MIN_AREAS[kind];
      if (!min) continue;
      const area = r.width * r.height;
      if (area < min) {
        findings.push(
          f(
            'bedroom_size',
            'warning',
            `${kind.replace('_', ' ')} "${r.name}" is ${area} sqft; typical minimum is ${min} sqft.`,
            [r.name],
            { area, minimum: min },
            `resize ${r.name} to at least ${min} sqft`,
          ),
        );
      }
    }
    return findings;
  },

  overlap(ctx) {
    const findings = [];
    for (let i = 0; i < ctx.rooms.length; i++) {
      for (let j = i + 1; j < ctx.rooms.length; j++) {
        if (rectsOverlap(ctx.rooms[i], ctx.rooms[j])) {
          findings.push(
            f(
              'overlap',
              'error',
              `Rooms "${ctx.rooms[i].name}" and "${ctx.rooms[j].name}" overlap.`,
              [ctx.rooms[i].name, ctx.rooms[j].name],
              {},
              `move or resize one of the rooms to eliminate the overlap`,
            ),
          );
        }
      }
    }
    return findings;
  },

  // -------------------------------------------------------------------------
  // Multi-floor rules
  //
  // These no-op on single-floor plans; they only emit findings when ctx
  // carries more than one floor.
  // -------------------------------------------------------------------------

  footprint_aligned(ctx) {
    if (!ctx.floors || ctx.floors.length < 2) return [];
    const findings = [];
    const ground = ctx.floors[0];
    if (!ground.bbox) return [];
    const { xMin: gx1, yMin: gy1, xMax: gx2, yMax: gy2 } = ground.bbox;
    const tolerance = 1; // ft
    for (const upper of ctx.floors.slice(1)) {
      if (!upper.bbox) continue;
      const { xMin: ux1, yMin: uy1, xMax: ux2, yMax: uy2 } = upper.bbox;
      // Upper floor must be a (near-)subset of the ground footprint.
      const out =
        ux1 < gx1 - tolerance ||
        uy1 < gy1 - tolerance ||
        ux2 > gx2 + tolerance ||
        uy2 > gy2 + tolerance;
      if (out) {
        findings.push(
          f(
            'footprint_aligned',
            'warning',
            `Floor "${upper.floorId}" footprint (${ux1},${uy1})-(${ux2},${uy2}) is not contained within ground floor footprint (${gx1},${gy1})-(${gx2},${gy2}). Cantilevers larger than ${tolerance}ft are uncommon and require structural review.`,
            [],
            {
              floorId: upper.floorId,
              upperBbox: upper.bbox,
              groundBbox: ground.bbox,
            },
            `realign rooms on ${upper.floorId} so its bounding box fits within the ground-floor outline`,
          ),
        );
      }
    }
    return findings;
  },

  stair_vertical_aligned(ctx) {
    if (!ctx.floors || ctx.floors.length < 2) return [];
    const findings = [];
    const verticals = ctx.verticalConnections ?? [];

    // Index stairs and lifts by floor for O(1) lookup.
    const indexByFloor = new Map();
    for (const fl of ctx.floors) {
      const m = new Map();
      for (const s of fl.stairs ?? []) m.set(s.name, { kind: 'stair', node: s });
      for (const l of fl.lifts ?? []) m.set(l.name, { kind: 'lift', node: l });
      indexByFloor.set(fl.floorId, m);
    }

    // 1) Every multi-floor plan with stairs needs a `vertical` link covering them.
    const stairsWithoutLink = new Set();
    for (const fl of ctx.floors) {
      for (const s of fl.stairs ?? []) {
        const linked = verticals.some((v) =>
          (v.links ?? []).some((link) => link.floor === fl.floorId && link.element === s.name),
        );
        if (!linked) stairsWithoutLink.add(`${fl.floorId}.${s.name}`);
      }
    }
    if (stairsWithoutLink.size > 0) {
      findings.push(
        f(
          'stair_vertical_aligned',
          'warning',
          `Stair element(s) declared on more than one floor but missing a \`vertical\` link: ${[...stairsWithoutLink].join(', ')}. Without it the analyzer treats each floor's stair independently.`,
          [],
          { stairs: [...stairsWithoutLink] },
          'add `vertical FloorA.StairName to FloorB.StairName` (extend with more `to` clauses for ≥ 3 floors)',
        ),
      );
    }

    // 2) Each `vertical` link must resolve to elements at identical (x, z)
    //    and identical width across all referenced floors.
    for (const v of verticals) {
      const links = v.links ?? [];
      if (links.length < 2) continue;
      const resolved = links
        .map((link) => {
          const idx = indexByFloor.get(link.floor);
          if (!idx) return { link, missing: true };
          const hit = idx.get(link.element);
          if (!hit) return { link, missing: true };
          return { link, kind: hit.kind, node: hit.node, missing: false };
        });
      const missing = resolved.filter((r) => r.missing);
      if (missing.length > 0) {
        findings.push(
          f(
            'stair_vertical_aligned',
            'error',
            `\`vertical\` link references missing element(s): ${missing.map((m) => `${m.link.floor}.${m.link.element}`).join(', ')}.`,
            [],
            { unresolved: missing.map((m) => m.link) },
            'either declare the missing stair/lift on each referenced floor, or remove the link',
          ),
        );
        continue;
      }
      const [first, ...rest] = resolved;
      const baseX = first.node.x;
      const baseZ = first.node.z;
      const baseWidth = first.node.width ?? null;
      for (const r of rest) {
        const dx = Math.abs((r.node.x ?? 0) - baseX);
        const dz = Math.abs((r.node.z ?? 0) - baseZ);
        const widthMismatch =
          baseWidth !== null && r.node.width !== undefined && r.node.width !== baseWidth;
        if (dx > 0.5 || dz > 0.5 || widthMismatch) {
          findings.push(
            f(
              'stair_vertical_aligned',
              'warning',
              `Vertical shaft \`${first.link.floor}.${first.link.element}\` and \`${r.link.floor}.${r.link.element}\` are misaligned: position (${baseX},${baseZ}) vs (${r.node.x},${r.node.z}); width ${baseWidth ?? '?'} vs ${r.node.width ?? '?'}.`,
              [],
              {
                base: { x: baseX, z: baseZ, width: baseWidth },
                other: { x: r.node.x, z: r.node.z, width: r.node.width },
                deltaX: dx,
                deltaZ: dz,
              },
              `align ${r.link.floor}.${r.link.element} to (${baseX},${baseZ}) and width ${baseWidth ?? 'baseWidth'} so the shaft stacks cleanly`,
            ),
          );
        }
      }
    }
    return findings;
  },

  // -------------------------------------------------------------------------
  // Single-floor stair geometry rules. They run per-floor (not in
  // MULTI_FLOOR_RULES). Each rule looks at every stair declared on the
  // floor and at the room that physically contains its 2D footprint.
  // -------------------------------------------------------------------------

  stair_through_walls(ctx) {
    const findings = [];
    const stairs = ctx.stairs ?? [];
    if (stairs.length === 0) return findings;
    const defaultUnit = ctx.config?.default_unit ?? 'ft';
    const stairCode = ctx.config?.stair_code ?? 'residential';
    const landing = requiredLanding(defaultUnit, stairCode);

    for (const stair of stairs) {
      const fp = computeStairFootprint(stair, defaultUnit);
      const { container, intersecting } = findStairContainer(fp, ctx.rooms);

      if (intersecting.length === 0) {
        findings.push(
          f(
            'stair_through_walls',
            'error',
            `Stair "${stair.name}" footprint (${fp.bbox.x1.toFixed(1)},${fp.bbox.y1.toFixed(1)})-(${fp.bbox.x2.toFixed(1)},${fp.bbox.y2.toFixed(1)}) on floor "${ctx.floorId}" does not intersect any room. Place the stair inside a room.`,
            [],
            { stair: stair.name, floorId: ctx.floorId, footprint: fp.bbox },
            `move ${stair.name} so it sits inside a stair-core room`,
          ),
        );
        continue;
      }

      if (container) continue; // wholly contained — no through-walls finding

      // Footprint extends outside every overlapping room: pick the room
      // with the largest overlap area as the "intended" container so the
      // suggestion can target it.
      let target = intersecting[0];
      let bestArea = 0;
      for (const r of intersecting) {
        const rb = roomBounds(r);
        const ix = Math.max(0, Math.min(rb.x2, fp.bbox.x2) - Math.max(rb.x1, fp.bbox.x1));
        const iy = Math.max(0, Math.min(rb.y2, fp.bbox.y2) - Math.max(rb.y1, fp.bbox.y1));
        const area = ix * iy;
        if (area > bestArea) {
          bestArea = area;
          target = r;
        }
      }

      const targetBounds = roomBounds(target);
      const overflowLeft = Math.max(0, targetBounds.x1 - fp.bbox.x1);
      const overflowRight = Math.max(0, fp.bbox.x2 - targetBounds.x2);
      const overflowTop = Math.max(0, targetBounds.y1 - fp.bbox.y1);
      const overflowBottom = Math.max(0, fp.bbox.y2 - targetBounds.y2);
      const requiredWidth = target.width + overflowLeft + overflowRight;
      const requiredHeight = target.height + overflowTop + overflowBottom;
      // The room needs to contain the run *plus* a full landing on
      // each end. For straight runs along the long axis the answer is
      // simply runLength + 2 * landing (e.g. 16.5 + 2*3 = 22.5 → 23).
      // For runs along the short axis the perpendicular dimension
      // governs and we just need to clear the existing overflow.
      const requiredHeightWithLanding =
        fp.direction === 'top' || fp.direction === 'bottom'
          ? Math.max(requiredHeight, fp.runLength + 2 * landing)
          : requiredHeight;
      const requiredWidthWithLanding =
        fp.direction === 'left' || fp.direction === 'right'
          ? Math.max(requiredWidth, fp.runLength + 2 * landing)
          : requiredWidth;

      const piercingRooms = intersecting
        .filter((r) => r.name !== target.name)
        .map((r) => r.name);

      const altShape = suggestStairShape(stair, fp, target, defaultUnit);
      const baseSuggestion = `enlarge "${target.name}" to at least (${Math.ceil(requiredWidthWithLanding)} x ${Math.ceil(requiredHeightWithLanding)} ${defaultUnit}) to fit the ${fp.runLength.toFixed(1)}${defaultUnit} run plus 2x ${landing}${defaultUnit} landings`;
      const suggestion = altShape ? `${baseSuggestion}; OR ${altShape}` : baseSuggestion;

      const piercingMsg =
        piercingRooms.length > 0
          ? ` and pierces walls of [${piercingRooms.join(', ')}]`
          : '';
      findings.push(
        f(
          'stair_through_walls',
          'error',
          `Stair "${stair.name}" footprint (${fp.bbox.x1.toFixed(1)},${fp.bbox.y1.toFixed(1)})-(${fp.bbox.x2.toFixed(1)},${fp.bbox.y2.toFixed(1)}) extends outside its containing room "${target.name}"${piercingMsg}. The ${fp.shapeType} stair needs a ${fp.width.toFixed(1)} x ${fp.height.toFixed(1)} ${defaultUnit} footprint (${fp.stepCount} steps x ${fp.tread.toFixed(2)}${defaultUnit} tread = ${fp.runLength.toFixed(1)}${defaultUnit} run).`,
          [target.name, ...piercingRooms],
          {
            stair: stair.name,
            floorId: ctx.floorId,
            container: target.name,
            footprint: fp.bbox,
            piercing: piercingRooms,
            requiredWidth: Math.ceil(requiredWidthWithLanding),
            requiredHeight: Math.ceil(requiredHeightWithLanding),
            shapeType: fp.shapeType,
          },
          suggestion,
        ),
      );

      if (fp.approximate) {
        findings.push(
          f(
            'stair_shape_unsupported',
            'info',
            `Stair "${stair.name}" uses shape "${fp.shapeType}"; the critic computes only a conservative bounding box for this shape, so footprint findings may be approximate.`,
            [stair.name],
            { stair: stair.name, shapeType: fp.shapeType },
            'verify the rendered 2D plan visually for shape-specific clearances',
          ),
        );
      }
    }
    return findings;
  },

  stair_landing_clearance(ctx) {
    const findings = [];
    const stairs = ctx.stairs ?? [];
    if (stairs.length === 0) return findings;
    const defaultUnit = ctx.config?.default_unit ?? 'ft';
    const stairCode = ctx.config?.stair_code ?? 'residential';
    const minLanding = requiredLanding(defaultUnit, stairCode);

    for (const stair of stairs) {
      const fp = computeStairFootprint(stair, defaultUnit);
      const { container } = findStairContainer(fp, ctx.rooms);
      if (!container) continue; // stair_through_walls already covers this
      const cb = roomBounds(container);

      let entryClear;
      let exitClear;
      if (fp.direction === 'top') {
        // climb upward (toward small Y); entry at bottom edge of stair.
        entryClear = cb.y2 - fp.bbox.y2;
        exitClear = fp.bbox.y1 - cb.y1;
      } else if (fp.direction === 'bottom') {
        entryClear = fp.bbox.y1 - cb.y1;
        exitClear = cb.y2 - fp.bbox.y2;
      } else if (fp.direction === 'right') {
        entryClear = fp.bbox.x1 - cb.x1;
        exitClear = cb.x2 - fp.bbox.x2;
      } else {
        // 'left'
        entryClear = cb.x2 - fp.bbox.x2;
        exitClear = fp.bbox.x1 - cb.x1;
      }

      if (entryClear < minLanding - 0.001) {
        findings.push(
          f(
            'stair_landing_clearance',
            'warning',
            `Stair "${stair.name}" entry landing inside "${container.name}" is ${Math.max(0, entryClear).toFixed(2)}${defaultUnit}; ${stairCode} code requires ${minLanding}${defaultUnit}.`,
            [container.name],
            {
              stair: stair.name,
              floorId: ctx.floorId,
              container: container.name,
              end: 'entry',
              clearance: Math.max(0, entryClear),
              required: minLanding,
              stairCode,
            },
            `enlarge "${container.name}" by ${Math.max(0.5, minLanding - entryClear).toFixed(1)}${defaultUnit} on the ${fp.entry.edge} side, or shorten the stair`,
          ),
        );
      }
      if (exitClear < minLanding - 0.001) {
        findings.push(
          f(
            'stair_landing_clearance',
            'warning',
            `Stair "${stair.name}" exit landing inside "${container.name}" is ${Math.max(0, exitClear).toFixed(2)}${defaultUnit}; ${stairCode} code requires ${minLanding}${defaultUnit}.`,
            [container.name],
            {
              stair: stair.name,
              floorId: ctx.floorId,
              container: container.name,
              end: 'exit',
              clearance: Math.max(0, exitClear),
              required: minLanding,
              stairCode,
            },
            `enlarge "${container.name}" by ${Math.max(0.5, minLanding - exitClear).toFixed(1)}${defaultUnit} on the ${fp.exit.edge} side, or shorten the stair`,
          ),
        );
      }
    }
    return findings;
  },

  stair_door_collision(ctx) {
    const findings = [];
    const stairs = ctx.stairs ?? [];
    if (stairs.length === 0) return findings;
    const defaultUnit = ctx.config?.default_unit ?? 'ft';
    const doorWidth = ctx.config?.door_size?.[0] ?? convertLengthToUnit(3, 'ft', defaultUnit);

    // Build per-room footprint index for O(stairs * rooms) lookups.
    const stairsByContainer = new Map();
    for (const stair of stairs) {
      const fp = computeStairFootprint(stair, defaultUnit);
      const { container } = findStairContainer(fp, ctx.rooms);
      if (!container) continue;
      if (!stairsByContainer.has(container.name)) stairsByContainer.set(container.name, []);
      stairsByContainer.get(container.name).push({ stair, footprint: fp });
    }
    if (stairsByContainer.size === 0) return findings;

    for (const c of ctx.connections) {
      // Determine the (stair-room, other-room) pair, if any. We only emit
      // a finding when one end is a stair-bearing room; we still need the
      // other room's wall bounds because connect positions are measured
      // along the *overlap* between the two walls, not along the stair
      // room's full wall length.
      let stairSide = null;
      let otherSide = null;
      if (stairsByContainer.has(c.fromRoom)) {
        stairSide = { roomName: c.fromRoom, wall: c.fromWall };
        otherSide = { roomName: c.toRoom, wall: c.toWall };
      } else if (stairsByContainer.has(c.toRoom)) {
        stairSide = { roomName: c.toRoom, wall: c.toWall };
        otherSide = { roomName: c.fromRoom, wall: c.fromWall };
      } else {
        continue;
      }
      const stairRoom = ctx.roomsByName.get(stairSide.roomName);
      if (!stairRoom || !stairSide.wall) continue;
      const otherRoom = otherSide.roomName === 'outside' ? null : ctx.roomsByName.get(otherSide.roomName);
      const sb = roomBounds(stairRoom);
      const isHoriz = stairSide.wall === 'top' || stairSide.wall === 'bottom';
      // Compute the overlap between the stair-room's wall and the other
      // room's facing wall along the perpendicular axis.
      let overlapStart;
      let overlapEnd;
      if (otherRoom) {
        const ob = roomBounds(otherRoom);
        if (isHoriz) {
          overlapStart = Math.max(sb.x1, ob.x1);
          overlapEnd = Math.min(sb.x2, ob.x2);
        } else {
          overlapStart = Math.max(sb.y1, ob.y1);
          overlapEnd = Math.min(sb.y2, ob.y2);
        }
        if (overlapEnd <= overlapStart) continue; // door_opening rule covers this
      } else {
        // Outside connection: overlap = stair-room's full wall extent.
        if (isHoriz) {
          overlapStart = sb.x1;
          overlapEnd = sb.x2;
        } else {
          overlapStart = sb.y1;
          overlapEnd = sb.y2;
        }
      }
      const overlapLen = overlapEnd - overlapStart;
      const pos = c.position ?? 50;
      const doorCenter = overlapStart + (overlapLen * pos) / 100;
      const doorMin = doorCenter - doorWidth / 2;
      const doorMax = doorCenter + doorWidth / 2;
      for (const { stair, footprint } of stairsByContainer.get(stairSide.roomName)) {
        const stairProjMin = isHoriz ? footprint.bbox.x1 : footprint.bbox.y1;
        const stairProjMax = isHoriz ? footprint.bbox.x2 : footprint.bbox.y2;
        // Strict inequalities so a door whose far edge lands exactly on
        // the stair-tread edge (touching but not overlapping) is allowed.
        // Add a small tolerance to absorb floating-point error from the
        // overlapStart + overlapLen * pct math (1mm in feet).
        const collisionEps = 0.005;
        if (doorMax > stairProjMin + collisionEps && stairProjMax > doorMin + collisionEps) {
          // Suggest percentages that clear the stair, expressed against
          // the same overlap the user authored against.
          const candidates = [];
          if (stairProjMin > overlapStart + doorWidth) {
            const pct = Math.max(0, Math.floor(((stairProjMin - overlapStart - doorWidth / 2) / overlapLen) * 100));
            candidates.push(`${pct}%`);
          }
          if (stairProjMax < overlapEnd - doorWidth) {
            const pct = Math.min(100, Math.ceil(((stairProjMax - overlapStart + doorWidth / 2) / overlapLen) * 100));
            candidates.push(`${pct}%`);
          }
          const suggestionPct = candidates.length > 0 ? candidates.join(' or ') : 'a different wall';
          findings.push(
            f(
              'stair_door_collision',
              'warning',
              `Connect "${c.fromRoom}.${c.fromWall} -> ${c.toRoom}.${c.toWall} at ${pos}%" on stair-bearing room "${stairSide.roomName}" lands at ${doorCenter.toFixed(2)}${defaultUnit} on the ${stairSide.wall} wall, inside the footprint of stair "${stair.name}" (${stairProjMin.toFixed(1)}-${stairProjMax.toFixed(1)} ${defaultUnit}).`,
              [c.fromRoom, c.toRoom],
              {
                stair: stair.name,
                floorId: ctx.floorId,
                container: stairSide.roomName,
                wall: stairSide.wall,
                doorPosition: pos,
                doorCenter,
                stairProjection: [stairProjMin, stairProjMax],
              },
              `move the door to ${suggestionPct} on ${stairSide.roomName}.${stairSide.wall} (outside the stair tread strip)`,
            ),
          );
        }
      }
    }
    return findings;
  },

  stair_room_access(ctx) {
    const findings = [];
    const stairs = ctx.stairs ?? [];
    if (stairs.length === 0) return findings;
    const defaultUnit = ctx.config?.default_unit ?? 'ft';
    const doorWidth = ctx.config?.door_size?.[0] ?? convertLengthToUnit(3, 'ft', defaultUnit);

    // Build container -> stairs map and per-stair footprint.
    const stairsByContainer = new Map();
    for (const stair of stairs) {
      const fp = computeStairFootprint(stair, defaultUnit);
      const { container } = findStairContainer(fp, ctx.rooms);
      if (!container) continue;
      if (!stairsByContainer.has(container.name)) stairsByContainer.set(container.name, []);
      stairsByContainer.get(container.name).push({ stair, footprint: fp });
    }

    for (const [containerName, entries] of stairsByContainer) {
      const room = ctx.roomsByName.get(containerName);
      if (!room) continue;
      const rb = roomBounds(room);

      // Find the connections on this room.
      const conns = ctx.connections.filter(
        (c) => c.fromRoom === containerName || c.toRoom === containerName,
      );

      const usable = conns.filter((c) => {
        // Skip outside doors here — we want a horizontal connection to
        // another non-stair room on the same floor.
        if (c.fromRoom === 'outside' || c.toRoom === 'outside') return false;
        // Determine which side is the stair-bearing room and which wall.
        const myWall = c.fromRoom === containerName ? c.fromWall : c.toWall;
        const otherName = c.fromRoom === containerName ? c.toRoom : c.fromRoom;
        if (!myWall) return false;
        const otherRoom = ctx.roomsByName.get(otherName);
        if (!otherRoom) return false;
        const ob = roomBounds(otherRoom);
        const isHoriz = myWall === 'top' || myWall === 'bottom';
        // Connect positions are measured along the *overlap* between the
        // two facing walls (calculatePositionOnWallOverlap), so we need
        // both rooms' bounds to derive the door's actual coordinate.
        let overlapStart;
        let overlapEnd;
        if (isHoriz) {
          overlapStart = Math.max(rb.x1, ob.x1);
          overlapEnd = Math.min(rb.x2, ob.x2);
        } else {
          overlapStart = Math.max(rb.y1, ob.y1);
          overlapEnd = Math.min(rb.y2, ob.y2);
        }
        if (overlapEnd <= overlapStart) return false;
        const overlapLen = overlapEnd - overlapStart;
        const pos = c.position ?? 50;
        const doorCenter = overlapStart + (overlapLen * pos) / 100;
        const doorMin = doorCenter - doorWidth / 2;
        const doorMax = doorCenter + doorWidth / 2;
        for (const { footprint } of entries) {
          const stairProjMin = isHoriz ? footprint.bbox.x1 : footprint.bbox.y1;
          const stairProjMax = isHoriz ? footprint.bbox.x2 : footprint.bbox.y2;
          // Match stair_door_collision: allow doors that touch the tread
          // edge (FP-tolerant), only reject true overlap.
          const collisionEps = 0.005;
          if (doorMax > stairProjMin + collisionEps && stairProjMax > doorMin + collisionEps) return false;
        }
        return true;
      });

      if (usable.length === 0) {
        const stairNames = entries.map((e) => e.stair.name);
        // Suggest a wall that has clear space outside the stair footprint.
        let suggestionWall = null;
        let suggestionPct = '50%';
        for (const wall of ['top', 'right', 'bottom', 'left']) {
          const isHoriz = wall === 'top' || wall === 'bottom';
          const wallStart = isHoriz ? rb.x1 : rb.y1;
          const wallLen = isHoriz ? room.width : room.height;
          // Find a clear stretch outside every stair footprint on this wall.
          let blocked = false;
          for (const { footprint } of entries) {
            const projMin = isHoriz ? footprint.bbox.x1 : footprint.bbox.y1;
            const projMax = isHoriz ? footprint.bbox.x2 : footprint.bbox.y2;
            if (projMin <= wallStart + doorWidth && projMax >= wallStart + wallLen - doorWidth) {
              blocked = true;
              break;
            }
            // The wall has a clear band — choose 5% beyond the stair.
            const beforePct = ((projMin - wallStart - doorWidth / 2) / wallLen) * 100;
            const afterPct = ((projMax - wallStart + doorWidth / 2) / wallLen) * 100;
            if (beforePct >= 10) suggestionPct = `${Math.max(10, Math.floor(beforePct - 5))}%`;
            else if (afterPct <= 90) suggestionPct = `${Math.min(90, Math.ceil(afterPct + 5))}%`;
          }
          if (!blocked) {
            suggestionWall = wall;
            break;
          }
        }
        const wallHint = suggestionWall
          ? `${containerName}.${suggestionWall}`
          : `${containerName}.<wall>`;
        findings.push(
          f(
            'stair_room_access',
            'warning',
            `Stair-bearing room "${containerName}" on floor "${ctx.floorId}" has no door/opening to another room on this floor that clears the stair footprint. Stair(s) ${stairNames.map((s) => `"${s}"`).join(', ')} are stranded.`,
            [containerName],
            {
              floorId: ctx.floorId,
              container: containerName,
              stairs: stairNames,
            },
            `add \`connect ${wallHint} to <Hall>.<wall> door at ${suggestionPct}\` so occupants can reach the stair on ${ctx.floorId}`,
          ),
        );
      }
    }
    return findings;
  },

  stair_landing_egress(ctx) {
    if (!ctx.floors || ctx.floors.length === 0) return [];
    const findings = [];
    const verticals = ctx.verticalConnections ?? [];
    const defaultUnit = ctx.config?.default_unit ?? 'ft';
    const stairCode = ctx.config?.stair_code ?? 'residential';
    const doorWidth = ctx.config?.door_size?.[0] ?? convertLengthToUnit(3, 'ft', defaultUnit);
    const landing = requiredLanding(defaultUnit, stairCode);

    for (const floor of ctx.floors) {
      for (const stair of floor.stairs ?? []) {
        // Only straight stairs are at risk: U / L / spiral / winder cores have
        // an interior landing that lets occupants traverse between strips
        // inside the core, so a single egress on either side suffices.
        const shapeType = stair.shape?.type ?? 'straight';
        if (shapeType !== 'straight') continue;

        const fp = computeStairFootprint(stair, defaultUnit);
        const { container } = findStairContainer(fp, floor.rooms);
        if (!container) continue; // stair_through_walls / stair_landing_clearance own that case

        // Determine which strips are required for this (floor, stair) pair.
        // - boarding strip: needed when this floor has a place to climb up to
        //   (i.e. stair appears at index < length-1 in some `vertical` chain).
        // - arrival strip: needed when something climbs up TO this floor on
        //   this stair (i.e. stair appears at index >= 1 in some chain).
        // A stair that isn't part of any `vertical` chain is treated as
        // boarding-only (occupant climbs from this floor to the next implied
        // level); stair_vertical_aligned will already be flagging the missing
        // chain.
        let needsBoard = false;
        let needsArrival = false;
        for (const v of verticals) {
          const links = v.links ?? [];
          const idx = links.findIndex((l) => l.floor === floor.floorId && l.element === stair.name);
          if (idx === -1) continue;
          if (idx > 0) needsArrival = true;
          if (idx < links.length - 1) needsBoard = true;
        }
        if (!needsBoard && !needsArrival) needsBoard = true;

        const required = [];
        if (needsBoard) required.push({ kind: 'board', strip: bottomStepLandingStrip(fp, landing) });
        if (needsArrival) required.push({ kind: 'arrive', strip: topStepLandingStrip(fp, landing) });

        for (const { kind, strip } of required) {
          const served = floor.connections.some((c) =>
            connectionServesLandingStrip(c, container, fp, strip, floor, doorWidth),
          );
          if (served) continue;
          const suggestion = suggestLandingEgressConnection(floor, container, fp, strip, stairCode);
          const suggestionText = suggestion
            ? `add \`connect ${suggestion.fromRoom}.${suggestion.fromWall} to ${suggestion.toRoom}.${suggestion.toWall} ${suggestion.type} at ${suggestion.position}%\``
            : `add an opening on "${container.name}" that lands within ${strip.axis}=[${strip.range[0].toFixed(2)}, ${strip.range[1].toFixed(2)}] ${defaultUnit} and clears the tread strip`;
          const stripLabel = kind === 'board' ? 'boarding (bottom-step)' : 'arrival (top-step)';
          findings.push(
            f(
              'stair_landing_egress',
              'warning',
              `Straight stair "${stair.name}" on floor "${floor.floorId}" has no usable connection serving its ${stripLabel} landing strip inside "${container.name}" (${strip.axis}=[${strip.range[0].toFixed(2)}, ${strip.range[1].toFixed(2)}] ${defaultUnit}). ${kind === 'board' ? "Occupants on this floor cannot reach the first tread" : "Occupants arriving from the floor below land in a dead end"}.`,
              [container.name],
              {
                stair: stair.name,
                floorId: floor.floorId,
                container: container.name,
                landingKind: kind,
                stripBox: { x1: strip.x1, y1: strip.y1, x2: strip.x2, y2: strip.y2 },
                stripAxis: strip.axis,
                stripRange: strip.range,
                stairCode,
                suggestionParams: suggestion ?? null,
              },
              suggestionText,
            ),
          );
        }
      }
    }
    return findings;
  },

  multi_floor_egress(ctx) {
    if (!ctx.floors || ctx.floors.length < 2) return [];
    const findings = [];
    const ground = ctx.floors[0];

    // Ground floor must connect to outside.
    const groundOutside = (ground.connections ?? []).some(
      (c) => c.fromRoom === 'outside' || c.toRoom === 'outside',
    );
    if (!groundOutside) {
      findings.push(
        f(
          'multi_floor_egress',
          'error',
          `Ground floor "${ground.floorId}" has no connection to outside. A multi-floor building needs at least one exterior door at street level.`,
          [],
          { floorId: ground.floorId },
          `add \`connect <Entry>.<wall> to outside door at 50%\` on ${ground.floorId}`,
        ),
      );
    }

    // Every upper floor that contains a habitable room needs a stair (or lift)
    // declared on that floor, and a `vertical` link reaching the ground floor.
    const verticals = ctx.verticalConnections ?? [];
    for (const upper of ctx.floors.slice(1)) {
      const habitable = (upper.rooms ?? []).some((r) =>
        HABITABLE_KINDS.has(upper.kinds.get(r.name)),
      );
      if (!habitable) continue;
      const hasCirculation = (upper.stairs?.length ?? 0) + (upper.lifts?.length ?? 0) > 0;
      if (!hasCirculation) {
        findings.push(
          f(
            'multi_floor_egress',
            'error',
            `Upper floor "${upper.floorId}" has habitable rooms but no stair or lift element. Occupants cannot legally reach this floor.`,
            [],
            { floorId: upper.floorId },
            `add a \`stair\` element on ${upper.floorId} and stack it with the matching stair on ${ground.floorId}`,
          ),
        );
        continue;
      }
      const reachesGround = verticals.some((v) => {
        const ids = (v.links ?? []).map((l) => l.floor);
        return ids.includes(upper.floorId) && ids.includes(ground.floorId);
      });
      if (!reachesGround) {
        findings.push(
          f(
            'multi_floor_egress',
            'warning',
            `Floor "${upper.floorId}" has stairs/lifts but no \`vertical\` link to ground floor "${ground.floorId}". Egress path is structurally undefined.`,
            [],
            { floorId: upper.floorId },
            `add \`vertical ${ground.floorId}.<Stair> to ${upper.floorId}.<Stair>\` to close the egress chain`,
          ),
        );
      }
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Orchestration: run everything against a DSL string.
// Returns { findings, summary, score, allClean, ctx, json, semWarnings }.
// Callers are responsible for emit/exit behaviour; this function never
// calls emit*().
// ---------------------------------------------------------------------------

export async function runCriticOnDsl(dsl, { only = null, skip = null, strict = false } = {}) {
  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) {
    return { parseErrors };
  }
  const { errors: semErrors, warnings: semWarnings } = await runLangiumValidation(document);
  if (semErrors.length > 0) {
    return { semErrors, semWarnings };
  }

  const floorplan = document.parseResult.value;
  const json = convertFloorplanToJson(floorplan);
  if (!json.data) {
    return { convertError: 'Failed to convert floorplan to JSON' };
  }

  const astConnections = extractConnectionsFromAst(floorplan);
  const ctx = buildCriticContext(
    json.data.floors,
    astConnections,
    json.data.verticalConnections ?? [],
    json.data.config ?? {},
  );
  if (!ctx) {
    return { convertError: 'No floors in floorplan; nothing to critique.' };
  }

  const ruleNames = Object.keys(rules).filter((n) => {
    if (only && !only.includes(n)) return false;
    if (skip && skip.has(n)) return false;
    return true;
  });

  // Rules that need cross-floor context (ctx.floors / ctx.verticalConnections)
  // run once on the merged ctx. All other rules run per-floor so that
  // single-floor rules like windowless_habitable, bathroom_privacy, and
  // bedroom_bath_adjacency catch issues on upper floors too.
  const MULTI_FLOOR_RULES = new Set([
    'footprint_aligned',
    'stair_vertical_aligned',
    'multi_floor_egress',
    'stair_landing_egress',
  ]);
  // Rules that only make sense on the ground floor (because they look for
  // exterior doors). On upper floors, multi_floor_egress already covers
  // the equivalent check via vertical links.
  const GROUND_FLOOR_ONLY_RULES = new Set(['entry_from_outside']);

  const findings = [];
  const failedRules = new Set();
  const seenFingerprints = new Set();
  const pushUnique = (rFindings) => {
    for (const f of rFindings) {
      const fp = `${f.rule}|${f.severity}|${f.message}|${(f.rooms ?? []).join(',')}`;
      if (seenFingerprints.has(fp)) continue;
      seenFingerprints.add(fp);
      findings.push(f);
    }
  };

  const perFloorCtxs = ctx.floors && ctx.floors.length > 0 ? ctx.floors : [ctx];
  for (const name of ruleNames) {
    const rule = rules[name];
    let collected;
    if (MULTI_FLOOR_RULES.has(name)) {
      collected = rule(ctx);
    } else if (GROUND_FLOOR_ONLY_RULES.has(name)) {
      collected = rule(perFloorCtxs[0]);
    } else {
      collected = [];
      for (const floorCtx of perFloorCtxs) {
        // Each per-floor ctx carries only its own floor's rooms / connections,
        // so single-floor rules naturally scope to that floor.
        const r = rule(floorCtx);
        if (r.length) collected.push(...r);
      }
    }
    if (collected.length > 0) failedRules.add(name);
    pushUnique(collected);
  }

  // Surface the validator's 3D-specific warnings as low-severity critic
  // findings under a synthetic `validator_3d` rule so the agent treats
  // "wall mismatch", "room taller than floor", etc. the same way as
  // architectural rules (instead of having to scrape semWarnings).
  const validator3dKeywords = [
    '3D viewer',
    '3D rendering',
    '3D view',
    'realistic 3D',
  ];
  for (const w of semWarnings ?? []) {
    const msg = w?.message ?? '';
    if (!validator3dKeywords.some((k) => msg.includes(k))) continue;
    findings.push(
      f(
        'validator_3d',
        'info',
        msg,
        [],
        { source: 'langium-validator', original: w },
        'check 3D rendering and adjust wall types / room heights so the 3D view stays consistent',
      ),
    );
    failedRules.add('validator_3d');
  }

  if (strict) {
    for (const x of findings) {
      if (x.severity === 'warning') x.severity = 'error';
    }
  }

  const errorCount = findings.filter((x) => x.severity === 'error').length;
  const warningCount = findings.filter((x) => x.severity === 'warning').length;
  const infoCount = findings.filter((x) => x.severity === 'info').length;

  let score = 100;
  for (const x of findings) {
    if (x.severity === 'error') score -= 10;
    else if (x.severity === 'warning') score -= 3;
    else score -= 1;
  }
  score = Math.max(0, score);

  return {
    findings,
    summary: {
      errorCount,
      warningCount,
      infoCount,
      rulesChecked: ruleNames,
      rulesFailed: [...failedRules],
    },
    score,
    allClean: findings.length === 0,
    ctx,
    json,
    semWarnings,
  };
}
