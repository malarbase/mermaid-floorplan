/**
 * Stair-safety rules. All six rules share a coherent domain — they check
 * that every stair fits inside a room, has adequate landings, does not
 * collide with doors, is reachable from the floor it serves, and connects
 * correctly between floors.
 *
 * Private helpers in this file:
 *   connectionServesLandingStrip  — geometry for stair_landing_egress
 *   suggestLandingEgressConnection — suggestion builder for stair_landing_egress
 */

import {
  f,
  roomBounds,
  computeStairFootprint,
  findStairContainer,
  bottomStepLandingStrip,
  topStepLandingStrip,
  suggestStairShape,
  requiredLanding,
  convertLengthToUnit,
} from './geometry.mjs';

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stair rules
// ---------------------------------------------------------------------------

export const stairRules = {
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
};
