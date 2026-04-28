/**
 * Shared layout primitives used by program_to_skeleton.mjs and
 * generate_variations.mjs. Encapsulates default room sizes, default wall
 * types, and the DSL rendering logic so the starter and variation
 * generators can't drift.
 */

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SIZE_BY_KIND = {
  entry: { width: 6, height: 6 },
  living: { width: 14, height: 12 },
  dining: { width: 10, height: 10 },
  kitchen: { width: 10, height: 10 },
  hallway: { width: 4, height: 12 },
  bedroom: { width: 12, height: 12 },
  bathroom: { width: 6, height: 6 },
  powder_room: { width: 4, height: 5 },
  laundry: { width: 6, height: 4 },
  closet: { width: 4, height: 4 },
  office: { width: 10, height: 10 },
  garage: { width: 12, height: 20 },
  utility: { width: 6, height: 6 },
  storage: { width: 6, height: 6 },
  // Straight-stair core: 6 ft wide x 23 ft deep. Sized for a 10 ft floor-
  // to-floor rise (~16.5 ft of treads at 7"/11" risers) plus 3 ft landings
  // at top and bottom. See references/multi-floor.md → "Stair footprint
  // and landings".
  stair: { width: 6, height: 23 },
  lift: { width: 4, height: 6 },
  retail: { width: 30, height: 20 },
  backroom: { width: 10, height: 10 },
  hotel_bedroom: { width: 12, height: 14 },
  hotel_wet: { width: 6, height: 8 },
  other: { width: 10, height: 10 },
};

const DEFAULT_WALLS_BY_KIND = {
  entry: { top: 'solid', right: 'solid', bottom: 'solid', left: 'solid' },
  living: { top: 'window', right: 'solid', bottom: 'solid', left: 'solid' },
  kitchen: { top: 'window', right: 'solid', bottom: 'solid', left: 'solid' },
  bedroom: { top: 'solid', right: 'solid', bottom: 'window', left: 'solid' },
  hotel_bedroom: { top: 'solid', right: 'solid', bottom: 'window', left: 'solid' },
  office: { top: 'solid', right: 'solid', bottom: 'window', left: 'solid' },
  retail: { top: 'solid', right: 'solid', bottom: 'window', left: 'solid' },
};

export function defaultWallsFor(kind) {
  return (
    DEFAULT_WALLS_BY_KIND[kind] ?? {
      top: 'solid',
      right: 'solid',
      bottom: 'solid',
      left: 'solid',
    }
  );
}

/** Pick a width/height pair for a room. Explicit sizes win. */
export function resolveSize(room) {
  if (room.size?.width && room.size?.height) {
    return { width: room.size.width, height: room.size.height };
  }
  if (room.size?.area) {
    const defaults = DEFAULT_SIZE_BY_KIND[room.kind] ?? DEFAULT_SIZE_BY_KIND.other;
    const ratio = defaults.width / defaults.height;
    const height = Math.max(2, Math.round(Math.sqrt(room.size.area / ratio)));
    const width = Math.max(2, Math.round(room.size.area / height));
    return { width, height };
  }
  const d = DEFAULT_SIZE_BY_KIND[room.kind] ?? DEFAULT_SIZE_BY_KIND.other;
  return { width: d.width, height: d.height };
}

/** Confidence sweep (reused by skeleton + variations). */
export function checkConfidence(brief, allowLow) {
  if (allowLow) return [];
  const findings = [];
  const check = (value, path) => {
    if (typeof value?.confidence === 'number' && value.confidence < 0.5) {
      findings.push({
        message: `Low confidence (${value.confidence.toFixed(2)}) at ${path}. Pass --allow-low-confidence to accept.`,
        path,
      });
    }
  };
  check(brief.footprint, 'footprint');
  check(brief.source, 'source.overallConfidence');
  for (const [i, room] of (brief.rooms ?? []).entries()) {
    check(room, `rooms[${i}].confidence`);
    check(room.size, `rooms[${i}].size.confidence`);
    check(room.position, `rooms[${i}].position.confidence`);
  }
  for (const [i, c] of (brief.connections ?? []).entries()) {
    check(c, `connections[${i}].confidence`);
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Packing strategies
//
// Each packer takes (rooms, options) and returns placements:
//   [{ room, size: { width, height }, pos: { x, y } }, ...]
//
// Rooms already carrying `relativeTo` or explicit `position` are passed
// through verbatim so the caller's intent wins.
// ---------------------------------------------------------------------------

function applyExplicit(room, size, placements) {
  if (room.relativeTo) {
    placements.push({ room, size, rel: { ...room.relativeTo }, pos: null });
    return true;
  }
  if (room.position?.x !== undefined && room.position?.y !== undefined) {
    placements.push({
      room,
      size,
      rel: null,
      pos: { x: room.position.x, y: room.position.y },
    });
    return true;
  }
  return false;
}

/** Row packing (default for program_to_skeleton). */
export function packRowWise(rooms, { rowWidth = 34 } = {}) {
  const placements = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowMaxHeight = 0;
  for (const r of rooms) {
    const size = resolveSize(r);
    if (applyExplicit(r, size, placements)) continue;
    if (cursorX > 0 && cursorX + size.width > rowWidth) {
      cursorY += rowMaxHeight;
      cursorX = 0;
      rowMaxHeight = 0;
    }
    placements.push({ room: r, size, rel: null, pos: { x: cursorX, y: cursorY } });
    cursorX += size.width;
    if (size.height > rowMaxHeight) rowMaxHeight = size.height;
  }
  return placements;
}

/** Linear strategy: all rooms in a single left-to-right row. Useful for
 *  narrow lots, rowhouses, and retail strip layouts. */
export function packLinear(rooms) {
  const placements = [];
  let cursorX = 0;
  for (const r of rooms) {
    const size = resolveSize(r);
    if (applyExplicit(r, size, placements)) continue;
    placements.push({ room: r, size, rel: null, pos: { x: cursorX, y: 0 } });
    cursorX += size.width;
  }
  return placements;
}

/** L-shaped strategy: first half of rooms along +x, second half along +y
 *  from the end of the first group. Good for corner lots and small houses
 *  where the entry anchors the L's outer corner. */
export function packLShape(rooms) {
  const placements = [];
  const half = Math.ceil(rooms.length / 2);
  let cursorX = 0;
  let cornerX = 0;
  let cornerY = 0;
  let maxHeightRow1 = 0;

  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    const size = resolveSize(r);
    if (applyExplicit(r, size, placements)) continue;
    if (i < half) {
      placements.push({ room: r, size, rel: null, pos: { x: cursorX, y: 0 } });
      cursorX += size.width;
      if (size.height > maxHeightRow1) maxHeightRow1 = size.height;
      cornerX = cursorX - size.width;
      cornerY = maxHeightRow1;
    } else {
      const placementIndex = placements.length;
      const yOffset =
        placementIndex === half
          ? cornerY
          : placements[placementIndex - 1].pos.y + placements[placementIndex - 1].size.height;
      placements.push({
        room: r,
        size,
        rel: null,
        pos: { x: cornerX, y: yOffset },
      });
    }
  }
  return placements;
}

/** Central-corridor strategy: insert a hallway spine and split rooms into
 *  two rows (above / below). Mirrors the layout used by the hero 2BR
 *  template. If no `hallway`-kinded room exists in the brief, one is
 *  synthesised at index 0 spanning the total room width. */
export function packCentralCorridor(rooms, { corridorWidth = 4 } = {}) {
  const synthesizeHall = !rooms.some((r) => r.kind === 'hallway');
  const working = synthesizeHall
    ? [
        {
          name: '_Hall',
          kind: 'hallway',
          label: 'Hall',
          size: { width: 34, height: corridorWidth },
        },
        ...rooms,
      ]
    : [...rooms];

  const others = working.filter((r) => r.kind !== 'hallway');
  const hall = working.find((r) => r.kind === 'hallway') ?? working[0];

  const half = Math.ceil(others.length / 2);
  const top = others.slice(0, half);
  const bottom = others.slice(half);

  const placements = [];

  // Row 1: public / above-hallway rooms
  let cursorX = 0;
  let maxTop = 0;
  for (const r of top) {
    const size = resolveSize(r);
    if (applyExplicit(r, size, placements)) continue;
    placements.push({ room: r, size, rel: null, pos: { x: cursorX, y: 0 } });
    cursorX += size.width;
    if (size.height > maxTop) maxTop = size.height;
  }
  const rowWidth = cursorX;

  // Hall: spans rowWidth (or the explicit hall width, whichever is larger)
  const hallSize = resolveSize(hall);
  const hallRendered = {
    room: hall,
    size: { width: Math.max(rowWidth, hallSize.width), height: corridorWidth },
    rel: null,
    pos: { x: 0, y: maxTop },
  };
  placements.push(hallRendered);

  // Row 2: private / below-hallway rooms
  cursorX = 0;
  const row2Y = maxTop + corridorWidth;
  for (const r of bottom) {
    const size = resolveSize(r);
    if (applyExplicit(r, size, placements)) continue;
    placements.push({ room: r, size, rel: null, pos: { x: cursorX, y: row2Y } });
    cursorX += size.width;
  }

  return placements;
}

// ---------------------------------------------------------------------------
// DSL rendering
// ---------------------------------------------------------------------------

function wallClause(walls) {
  return `walls [top: ${walls.top}, right: ${walls.right}, bottom: ${walls.bottom}, left: ${walls.left}]`;
}

function relClause(rel) {
  const parts = [`${rel.direction} ${rel.reference}`];
  if (rel.gap !== undefined && rel.gap !== null) parts.push(`gap ${rel.gap}`);
  if (rel.alignment) parts.push(`align ${rel.alignment}`);
  return parts.join(' ');
}

function labelClause(room) {
  if (room.label) return `label ${JSON.stringify(room.label)}`;
  return '';
}

function renderRoom(placement) {
  const { room, size, rel, pos } = placement;
  const walls = { ...defaultWallsFor(room.kind), ...(room.walls ?? {}) };
  const parts = [`    room ${room.name}`];
  if (pos) parts.push(`at (${pos.x},${pos.y})`);
  parts.push(`size (${size.width} x ${size.height})`);
  parts.push(wallClause(walls));
  if (rel) parts.push(relClause(rel));
  const lbl = labelClause(room);
  if (lbl) parts.push(lbl);
  return parts.join(' ');
}

function renderConnections(brief, anchor) {
  const lines = [];
  if (brief.connections && brief.connections.length > 0) {
    for (const c of brief.connections) {
      const kind = c.kind ?? 'door';
      const pos = c.position ?? 50;
      if (c.to === 'outside') {
        lines.push(`  connect ${c.from} to outside ${kind} at ${pos}%`);
      } else {
        lines.push(`  connect ${c.from} to ${c.to} ${kind} at ${pos}%`);
      }
    }
  } else if (anchor) {
    lines.push(`  connect ${anchor.name}.top to outside door at 50%`);
  }
  return lines;
}

export function renderDsl(brief, placements, headerLines = []) {
  const floorId = brief.floors?.[0]?.id ?? 'GroundFloor';
  const anchor = placements[0]?.room;
  const roomLines = placements.map((p) => renderRoom(p));
  const connLines = renderConnections(brief, anchor);
  return [
    ...(brief.title ? [`# ${brief.title}`] : []),
    ...headerLines.map((l) => `# ${l}`),
    '',
    '%%{version: 1.0}%%',
    'floorplan',
    '',
    '  config { default_unit: ft, area_unit: sqft }',
    '',
    `  floor ${floorId} {`,
    ...roomLines,
    `  }`,
    '',
    ...connLines,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Multi-floor splitting + rendering
// ---------------------------------------------------------------------------

/** Rooms typically placed on the ground floor of a residential plan. */
const GROUND_KINDS = new Set([
  'entry',
  'living',
  'dining',
  'kitchen',
  'powder_room',
  'laundry',
  'garage',
  'office',
  'mudroom',
  'utility',
  'storage',
  'retail',
  'lobby',
]);

/** Rooms that prefer the upper floor of a residential plan. */
const UPPER_KINDS = new Set([
  'bedroom',
  'master_bedroom',
  'bathroom',
  'closet',
  'hotel_bedroom',
  'hotel_wet',
]);

/**
 * Partition rooms across N floors. If a room declares `room.floor`, it is
 * routed verbatim. Otherwise rooms are bucketed by kind: GROUND_KINDS go
 * downstairs, UPPER_KINDS go upstairs, ambiguous kinds (hallway/closet on
 * a 1BR) fall onto whichever floor matches the larger neighbour.
 *
 * Returns { byFloor: Map<floorId, room[]>, floors: [{ id, height, label }] }.
 */
export function partitionRoomsByFloor(brief, { floors = 1, defaultFloorHeight = 10 } = {}) {
  const declaredFloors = Array.isArray(brief.floors) && brief.floors.length > 0
    ? brief.floors
    : null;

  let floorList;
  if (declaredFloors) {
    floorList = declaredFloors.map((f) => ({
      id: f.id,
      label: f.label,
      height: f.height ?? defaultFloorHeight,
    }));
  } else if (floors === 1) {
    floorList = [{ id: 'GroundFloor', height: defaultFloorHeight }];
  } else if (floors === 2) {
    floorList = [
      { id: 'GroundFloor', height: defaultFloorHeight },
      { id: 'FirstFloor', height: defaultFloorHeight },
    ];
  } else {
    floorList = [{ id: 'GroundFloor', height: defaultFloorHeight }];
    for (let i = 1; i < floors; i++) {
      const ord = i === 1 ? 'First' : i === 2 ? 'Second' : i === 3 ? 'Third' : `Floor${i + 1}`;
      floorList.push({ id: `${ord}Floor`, height: defaultFloorHeight });
    }
  }

  const byFloor = new Map(floorList.map((f) => [f.id, []]));

  for (const room of brief.rooms) {
    let target;
    if (room.floor && byFloor.has(room.floor)) {
      target = room.floor;
    } else if (floorList.length === 1) {
      target = floorList[0].id;
    } else if (UPPER_KINDS.has(room.kind)) {
      target = floorList[floorList.length - 1].id;
    } else if (GROUND_KINDS.has(room.kind)) {
      target = floorList[0].id;
    } else {
      target = floorList[0].id;
    }
    byFloor.get(target).push(room);
  }

  return { byFloor, floors: floorList };
}

/**
 * Render an N-floor plan with an automatic stair core stacked at the
 * supplied (x, y) on every floor and a `vertical` link tying them
 * together. `coresByFloor` maps floorId -> array of core declarations
 * (StairCore room + stair element). `floorPlacements` maps floorId ->
 * placements[].
 */
export function renderMultiFloorDsl({
  brief,
  floors,
  floorPlacements,
  stairCore,
  connectionsByFloor,
  headerLines = [],
}) {
  const lines = [];
  if (brief.title) lines.push(`# ${brief.title}`);
  for (const h of headerLines) lines.push(`# ${h}`);
  lines.push('');
  lines.push('%%{version: 1.0}%%');
  lines.push('floorplan');
  lines.push('');
  lines.push(`  config { default_unit: ft, area_unit: sqft, default_height: ${floors[0]?.height ?? 10} }`);
  lines.push('');

  for (const floor of floors) {
    const heightTok = floor.height ? ` height ${floor.height}ft` : '';
    lines.push(`  floor ${floor.id}${heightTok} {`);

    const coreRoomName = stairCore?.roomNamesByFloor?.get(floor.id) ?? stairCore?.roomName;
    if (stairCore && coreRoomName) {
      const wallClauseLine =
        '[top: solid, right: solid, bottom: solid, left: solid]';
      lines.push(
        `    room ${coreRoomName} at (${stairCore.x},${stairCore.y}) size (${stairCore.width} x ${stairCore.height}) walls ${wallClauseLine} label "Stair / Lift"`,
      );
    }

    const placements = floorPlacements.get(floor.id) ?? [];
    for (const p of placements) {
      lines.push(renderRoom(p));
    }

    if (stairCore) {
      lines.push('');
      lines.push(`    stair ${stairCore.stairName} at (${stairCore.stairX}, ${stairCore.stairY})`);
      lines.push('        shape straight toward top');
      lines.push(`        rise ${floor.height ?? 10}ft`);
      lines.push(`        width ${stairCore.stairWidth ?? 4}ft`);
      lines.push('        label "Stair"');
    }

    lines.push('  }');
    lines.push('');
  }

  for (const floor of floors) {
    const conns = connectionsByFloor?.get(floor.id) ?? [];
    if (conns.length === 0) continue;
    lines.push(`  # === ${floor.id} circulation ===`);
    for (const c of conns) lines.push(c);
    lines.push('');
  }

  if (stairCore && floors.length > 1) {
    lines.push('  # === Vertical connections ===');
    const verticalLinks = floors.map((f) => `${f.id}.${stairCore.stairName}`).join(' to ');
    lines.push(`  vertical ${verticalLinks}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Anchor selection (shared convention)
// ---------------------------------------------------------------------------

export function selectAnchor(rooms) {
  const list = [...rooms];
  let anchorIdx = list.findIndex((r) => (r.features ?? []).includes('anchor'));
  if (anchorIdx < 0) anchorIdx = list.findIndex((r) => r.kind === 'entry');
  if (anchorIdx > 0) {
    const [a] = list.splice(anchorIdx, 1);
    list.unshift(a);
  }
  return list;
}

export const STRATEGIES = {
  rows: { packer: packRowWise, label: 'Rows (left-to-right, wrap)' },
  linear: { packer: packLinear, label: 'Linear (single wide row)' },
  'l-shape': { packer: packLShape, label: 'L-shape (corner lot)' },
  'central-corridor': { packer: packCentralCorridor, label: 'Central corridor' },
};
