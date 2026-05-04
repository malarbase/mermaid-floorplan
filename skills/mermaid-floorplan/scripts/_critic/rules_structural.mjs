/**
 * Structural rules: layout, connectivity, egress, and roof.
 *
 * These rules check whether the floorplan makes physical sense —
 * can you get in, can you reach every room, do floors stack correctly,
 * and is the roof properly capped with a parapet?
 *
 * All multi-floor rules (footprint_aligned, missing_roof_floor,
 * roof_parapet_walls) must be listed in MULTI_FLOOR_RULES inside
 * runCriticOnDsl so they receive the merged ctx rather than per-floor
 * slices.
 */

import { f, sharedEdge, rectsOverlap, roomBounds, HABITABLE_KINDS, convertLengthToUnit } from './geometry.mjs';

// Matches floor IDs that represent a roof layer (case-insensitive).
// Covers: Roof, RoofDeck, RoofSlab, RoofGarden, etc.
const ROOF_FLOOR_RE = /roof/i;

export const structuralRules = {
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

  door_window_overlap(ctx) {
    const findings = [];
    const defaultUnit = ctx.config?.default_unit ?? 'ft';
    const doorWidth = ctx.config?.door_size?.[0] ?? convertLengthToUnit(3, 'ft', defaultUnit);

    for (const c of ctx.connections) {
      // Only rigid door connections have a panel that can physically block a
      // window opening. Archways (opening) have no door panel.
      if (c.doorType !== 'door') continue;

      // Check both sides of the connection for positioned window specs.
      for (const [roomName, wallDir] of [
        [c.fromRoom, c.fromWall],
        [c.toRoom, c.toWall],
      ]) {
        if (roomName === 'outside') continue;
        const room = ctx.roomsByName.get(roomName);
        if (!room || !wallDir) continue;

        // Positioned window specs only — whole-wall types have no geometry to collide with.
        const windowSpecs = (room.walls ?? []).filter(
          (w) => w.direction === wallDir && w.type === 'window' && w.position != null && w.width != null,
        );
        if (windowSpecs.length === 0) continue;

        const rb = roomBounds(room);
        const isHoriz = wallDir === 'top' || wallDir === 'bottom';
        const wallLength = isHoriz ? room.width : room.height;
        const wallStart = isHoriz ? rb.x1 : rb.y1;

        // Compute the door's absolute centre on this room's wall. Connection
        // positions are percentages of the shared-edge overlap (or the full
        // wall for outside connections), mirroring stair_door_collision.
        const otherRoomName = roomName === c.fromRoom ? c.toRoom : c.fromRoom;
        const otherRoom =
          otherRoomName === 'outside' ? null : ctx.roomsByName.get(otherRoomName);
        let overlapStart, overlapEnd;
        if (otherRoom) {
          const ob = roomBounds(otherRoom);
          overlapStart = isHoriz ? Math.max(rb.x1, ob.x1) : Math.max(rb.y1, ob.y1);
          overlapEnd = isHoriz ? Math.min(rb.x2, ob.x2) : Math.min(rb.y2, ob.y2);
          if (overlapEnd <= overlapStart) continue;
        } else {
          overlapStart = wallStart;
          overlapEnd = wallStart + wallLength;
        }
        const overlapLen = overlapEnd - overlapStart;
        const pos = c.position ?? 50;
        const doorCenter = overlapStart + (overlapLen * pos) / 100;
        const doorMin = doorCenter - doorWidth / 2;
        const doorMax = doorCenter + doorWidth / 2;

        for (const ws of windowSpecs) {
          const defaultWindowWidth = ctx.config?.window_size?.[0] ?? convertLengthToUnit(4, 'ft', defaultUnit);
          const winWidth = ws.width ?? defaultWindowWidth;
          const winCenter =
            ws.isPercentage !== false
              ? wallStart + (ws.position / 100) * wallLength
              : wallStart + ws.position;
          const winMin = winCenter - winWidth / 2;
          const winMax = winCenter + winWidth / 2;

          const eps = 0.005;
          if (doorMax > winMin + eps && winMax > doorMin + eps) {
            findings.push(
              f(
                'door_window_overlap',
                'error',
                `Door "${c.fromRoom}.${c.fromWall} → ${c.toRoom}.${c.toWall}" at ${pos}% (abs [${doorMin.toFixed(1)}–${doorMax.toFixed(1)} ${defaultUnit}]) overlaps window spec on "${roomName}.${wallDir}" at ${ws.position}${ws.isPercentage !== false ? '%' : ` ${defaultUnit}`} (window [${winMin.toFixed(1)}–${winMax.toFixed(1)} ${defaultUnit}]).`,
                [roomName],
                {
                  roomName,
                  wallDir,
                  doorPos: pos,
                  doorSpan: [doorMin, doorMax],
                  windowPos: ws.position,
                  windowSpan: [winMin, winMax],
                },
                `move the door to avoid the window span, or reposition the window spec`,
              ),
            );
          }
        }
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
  // Multi-floor structural rules (run once on merged ctx)
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

  // -------------------------------------------------------------------------
  // Roof rules (multi-floor, run once on merged ctx)
  //
  // missing_roof_floor: the topmost declared floor has stairs/lifts but no
  //   floor Roof exists above it. In the 3D viewer the stair geometry has
  //   nothing to punch through and "ends in mid-air".
  //
  // roof_parapet_walls: a floor whose ID matches /roof/i has at least one
  //   room with an `open`-typed wall. That strips the parapet from the render.
  //   DSL wall default is `solid`, so un-listed walls are already correct;
  //   the rule only fires when an author has explicitly set `open`.
  // -------------------------------------------------------------------------

  missing_roof_floor(ctx) {
    if (!ctx.floors || ctx.floors.length < 2) return [];
    const topFloor = ctx.floors[ctx.floors.length - 1];
    const topHasCirculation =
      (topFloor.stairs?.length ?? 0) + (topFloor.lifts?.length ?? 0) > 0;
    if (!topHasCirculation) return [];
    const hasRoofFloor = ctx.floors.some((fl) => ROOF_FLOOR_RE.test(fl.floorId ?? ''));
    if (hasRoofFloor) return [];
    return [
      f(
        'missing_roof_floor',
        'warning',
        `The topmost floor "${topFloor.floorId}" has stairs/lifts but no \`floor Roof\` block exists above it. In the 3D viewer the stair exit has no slab to punch through and reads as "ends in mid-air".`,
        [],
        { topFloorId: topFloor.floorId },
        'add a `floor Roof { room RoofSlab at (0,0) size (<W> x <H>) height 3ft walls [top: solid, right: solid, bottom: solid, left: solid] }` block above the top floor',
      ),
    ];
  },

  roof_parapet_walls(ctx) {
    if (!ctx.floors) return [];
    // Parapet walls are typically 3–4 ft. Rooms that inherit the full floor
    // height will render as a full-story wall rather than a low parapet.
    const defaultUnit = ctx.config?.default_unit ?? 'ft';
    const MAX_PARAPET_FT = 4;
    const maxParapet = convertLengthToUnit(MAX_PARAPET_FT, 'ft', defaultUnit);

    const findings = [];
    for (const fl of ctx.floors) {
      if (!ROOF_FLOOR_RE.test(fl.floorId ?? '')) continue;
      for (const room of fl.rooms ?? []) {
        // Check 1: walls must be solid, not open.
        const openWalls = (room.walls ?? []).filter((w) => w.type === 'open');
        if (openWalls.length > 0) {
          const sides = openWalls.map((w) => w.direction ?? w.side ?? '?').join(', ');
          findings.push(
            f(
              'roof_parapet_walls',
              'warning',
              `Roof floor "${fl.floorId}" room "${room.name}" has open walls (${sides}). Open walls render as no parapet — use \`solid\` on all sides to produce a parapet wall.`,
              [room.name],
              { floorId: fl.floorId, openSides: openWalls.map((w) => w.direction ?? w.side) },
              `change walls [${sides}] on ${room.name} from \`open\` to \`solid\` to render a parapet`,
            ),
          );
        }

        // Check 2: room must have an explicit short height.
        // The JSON field `roomHeight` carries the vertical height declared by
        // `height <v>` in the DSL; `room.height` is the 2D plan depth (size Y).
        // Without an explicit roomHeight the room inherits the full floor height
        // and the parapet renders as a full-story wall.
        const roomHeight = room.roomHeight; // vertical height declared via `height` keyword
        const hasExplicitHeight = roomHeight != null;
        const isTooTall = hasExplicitHeight && roomHeight > maxParapet + 0.001;
        if (!hasExplicitHeight || isTooTall) {
          const heightMsg = hasExplicitHeight
            ? `height ${roomHeight}${defaultUnit} exceeds the typical parapet maximum (${MAX_PARAPET_FT}ft)`
            : `no explicit height — will inherit the full floor height and render as a full-story wall`;
          findings.push(
            f(
              'roof_parapet_walls',
              'warning',
              `Roof floor "${fl.floorId}" room "${room.name}" has ${heightMsg}. Parapet walls should be 3–4 ft tall.`,
              [room.name],
              { floorId: fl.floorId, roomHeight: roomHeight ?? null, maxParapetFt: MAX_PARAPET_FT },
              `add \`height 3ft\` to ${room.name} so the parapet renders at the correct scale`,
            ),
          );
        }
      }
    }
    return findings;
  },
};
