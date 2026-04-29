/**
 * Habitable-quality rules: natural light, room size, privacy, and
 * plumbing adjacency.
 *
 * These rules check the livability of the floorplan — can bedrooms see
 * daylight, are bathrooms reachable from bedrooms, is the plumbing grouped
 * sensibly, and are private rooms shielded from public spaces?
 */

import { f, HABITABLE_KINDS, WET_KINDS, PUBLIC_KINDS, hasWindow } from './geometry.mjs';

export const habitableRules = {
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
};
