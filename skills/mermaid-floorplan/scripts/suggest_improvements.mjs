#!/usr/bin/env node
/**
 * suggest_improvements.mjs — translate design_critic findings into
 * concrete `modify.mjs` operations (where possible) plus advisory notes
 * (for things modify.mjs cannot express, like adding `connect`
 * statements).
 *
 * Pure heuristics; no LLM. Intended as the bridge between the critic and
 * `modify.mjs`, so the agent can iterate:
 *
 *     design_critic.mjs -> suggest_improvements.mjs -> modify.mjs -> validate.mjs
 *
 * Usage:
 *   node suggest_improvements.mjs <file.floorplan> [--strict] [--skip r1,r2]
 *     [--only r1,r2] [--critic critic.json] [--ops-out suggested-ops.json]
 *   node suggest_improvements.mjs --dsl '<literal>'
 *
 * If `--critic` is omitted, the critic is run internally on the same DSL.
 * `--ops-out <path>` writes only the applicable operations (ready for
 * `modify.mjs --ops <path>`); advisory-only suggestions are never written.
 *
 * Output `data` shape:
 *   {
 *     suggestions: [
 *       {
 *         finding: { rule, severity, message, rooms, details },
 *         operations: [ { action, target, params } ],
 *         advisory: [ "..." ],
 *         confidence: "high" | "medium" | "low"
 *       }
 *     ],
 *     applicableOps: [ ...flat list of ops ready for modify.mjs... ],
 *     advisory: [ ...flat list of advisory strings... ],
 *     summary: {
 *       findings: N,
 *       withOps: N,
 *       advisoryOnly: N,
 *       applicableOps: N
 *     }
 *   }
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { parseArgs, readDsl, emitOk, emitValidationError, run } from './_lib.mjs';
import { runCriticOnDsl, hasWindow, sharedEdge, inferKind } from './_critic_lib.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resizeToMinSquare(area, minArea) {
  const scale = Math.sqrt(minArea / Math.max(area, 1));
  return scale;
}

/**
 * Find the "outside-facing" walls of a room — walls with no adjacent room
 * on that side. Returns an array of { direction, currentType }.
 */
function findExteriorWalls(room, ctx) {
  const sides = ['top', 'right', 'bottom', 'left'];
  const adjacentSides = new Set();
  for (const edge of ctx.adjacency) {
    if (!edge.rooms.includes(room.name)) continue;
    const fromWall = edge.rooms[0] === room.name ? edge.edge.fromA : edge.edge.fromB;
    adjacentSides.add(fromWall);
  }
  return sides
    .filter((s) => !adjacentSides.has(s))
    .map((dir) => ({
      direction: dir,
      currentType: (room.walls ?? []).find((w) => w.direction === dir)?.type ?? 'solid',
    }));
}

/**
 * Look up a room by name across every floor in the context. The primary
 * `ctx.roomsByName` only covers the first floor, so multi-floor findings
 * for upper-floor rooms need this helper.
 */
function findRoomAcrossFloors(name, ctx) {
  if (!name) return null;
  if (ctx.roomsByName.has(name)) return ctx.roomsByName.get(name);
  for (const floor of ctx.floors ?? []) {
    if (floor.roomsByName?.has(name)) return floor.roomsByName.get(name);
  }
  return null;
}

/** Closest hallway (or circulation room) by centroid distance. */
function nearestHallway(room, ctx) {
  const hallways = ctx.rooms.filter(
    (r) =>
      r.name !== room.name &&
      ['hallway', 'entry', 'lobby'].includes(ctx.kinds.get(r.name)),
  );
  if (hallways.length === 0) return null;
  const cx = room.x + room.width / 2;
  const cy = room.z + room.height / 2;
  let best = null;
  let bestDist = Infinity;
  for (const h of hallways) {
    const hx = h.x + h.width / 2;
    const hy = h.z + h.height / 2;
    const d = Math.abs(cx - hx) + Math.abs(cy - hy);
    if (d < bestDist) {
      bestDist = d;
      best = h;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Per-rule suggestion builders.
// Each returns { operations: [...], advisory: [...], confidence }.
// ---------------------------------------------------------------------------

const suggesters = {
  corridor_width(finding, ctx) {
    const roomName = finding.rooms[0];
    const room = ctx.roomsByName.get(roomName);
    if (!room) return null;
    const minShort = 4;
    const [w, h] = [room.width, room.height];
    let newW = w;
    let newH = h;
    if (w <= h) newW = Math.max(w, minShort);
    else newH = Math.max(h, minShort);
    if (newW === w && newH === h) return null;
    return {
      operations: [
        { action: 'resize_room', target: roomName, params: { width: newW, height: newH } },
      ],
      advisory: [],
      confidence: 'high',
    };
  },

  bedroom_size(finding, ctx) {
    const roomName = finding.rooms[0];
    const room = ctx.roomsByName.get(roomName);
    if (!room) return null;
    const min = finding.details?.minimum ?? 70;
    const area = room.width * room.height;
    if (area >= min) return null;
    const scale = resizeToMinSquare(area, min);
    const newW = Math.ceil(room.width * scale);
    const newH = Math.ceil(room.height * scale);
    return {
      operations: [
        { action: 'resize_room', target: roomName, params: { width: newW, height: newH } },
      ],
      advisory: [
        `Resizing ${roomName} will shift neighbouring rooms if they are positioned relative to it; re-run validate.mjs.`,
      ],
      confidence: 'medium',
    };
  },

  windowless_habitable(finding, ctx) {
    const roomName = finding.rooms[0];
    const room = ctx.roomsByName.get(roomName);
    if (!room) return null;
    const exterior = findExteriorWalls(room, ctx);
    if (exterior.length === 0) {
      return {
        operations: [],
        advisory: [
          `${roomName} has no exterior-facing walls; consider redesigning so at least one side touches the building envelope.`,
        ],
        confidence: 'low',
      };
    }
    // Prefer a wall that is currently 'solid' over 'door' / 'open'.
    const pickable =
      exterior.find((e) => e.currentType === 'solid') ?? exterior[0];
    const nextWalls = {};
    nextWalls[pickable.direction] = 'window';
    return {
      operations: [
        { action: 'update_walls', target: roomName, params: nextWalls },
      ],
      advisory: [],
      confidence: 'high',
    };
  },

  overlap(finding, ctx) {
    const [a, b] = finding.rooms;
    const ra = ctx.roomsByName.get(a);
    const rb = ctx.roomsByName.get(b);
    if (!ra || !rb) return null;
    // Heuristic: push b to the right of a.
    const newX = ra.x + ra.width;
    const newY = rb.z;
    return {
      operations: [],
      advisory: [
        `Rooms ${a} and ${b} overlap. Simplest fix: \`modify.mjs\` with { action: "move_room", target: "${b}", params: { x: ${newX}, y: ${newY} } } — but review manually, the move may cascade.`,
      ],
      confidence: 'low',
    };
  },

  entry_from_outside(finding, ctx) {
    const entry = ctx.rooms.find((r) => ctx.kinds.get(r.name) === 'entry') ?? ctx.rooms[0];
    if (!entry) return null;
    return {
      operations: [],
      advisory: [
        `Add exterior door: \`connect ${entry.name}.top to outside door at 50%\` (after the floor block).`,
      ],
      confidence: 'high',
    };
  },

  reachability(finding, ctx) {
    const roomName = finding.rooms[0];
    const room = ctx.roomsByName.get(roomName);
    if (!room) return null;

    // Pick the best connection candidate.
    const neighbors = ctx.adjacency
      .filter((e) => e.rooms.includes(roomName))
      .map((e) => {
        const other = e.rooms[0] === roomName ? e.rooms[1] : e.rooms[0];
        return { other, edge: e.edge, length: e.length };
      });

    if (neighbors.length === 0) {
      return {
        operations: [],
        advisory: [
          `${roomName} has no adjacent rooms on the floor; you need to move it (modify.mjs move_room) or add a connecting corridor.`,
        ],
        confidence: 'low',
      };
    }

    // Prefer a hallway neighbour if possible.
    const hall = neighbors.find((n) => ctx.kinds.get(n.other) === 'hallway');
    const pick = hall ?? neighbors[0];
    const fromWall = pick.edge.fromA === (finding.rooms[0] === roomName ? pick.edge.fromA : pick.edge.fromB)
      ? pick.edge.fromA
      : pick.edge.fromB;

    // Determine each side's wall name relative to roomName.
    const roomIsA = ctx.adjacency.find(
      (e) => e.rooms.includes(roomName) && e.rooms.includes(pick.other),
    )?.rooms[0] === roomName;
    const mineWall = roomIsA ? pick.edge.fromA : pick.edge.fromB;
    const theirWall = roomIsA ? pick.edge.fromB : pick.edge.fromA;

    return {
      operations: [],
      advisory: [
        `Connect ${roomName} to ${pick.other}: \`connect ${roomName}.${mineWall} to ${pick.other}.${theirWall} door at 50%\`.`,
      ],
      confidence: 'high',
    };
  },

  door_opening(finding, ctx) {
    if (finding.details?.position !== undefined) {
      // Position out of range — emit advisory to re-write the connect line with 50%.
      const [a, b] = finding.rooms;
      return {
        operations: [],
        advisory: [
          `Reposition the door between ${a} and ${b} to 50% (or any value in [10, 90]) by editing the \`connect\` line.`,
        ],
        confidence: 'medium',
      };
    }
    // Walls don't share an edge: harder; advise manual review.
    const [a, b] = finding.rooms;
    return {
      operations: [],
      advisory: [
        `Door between ${a} and ${b} is declared on walls that don't touch. Either adjust the wall-pair in the \`connect\` statement, or use \`move_room\` on one of the rooms so their walls align.`,
      ],
      confidence: 'low',
    };
  },

  bedroom_bath_adjacency(finding, ctx) {
    const masterName = finding.rooms[0];
    const master = ctx.roomsByName.get(masterName);
    if (!master) return null;
    // Find closest bath room
    const baths = ctx.rooms.filter((r) =>
      ['bath', 'ensuite', 'powder'].includes(ctx.kinds.get(r.name)),
    );
    if (baths.length === 0) {
      return {
        operations: [],
        advisory: [
          `Add a bath/ensuite near ${masterName} (e.g., modify.mjs add_room with ~30-50 sqft next to the master).`,
        ],
        confidence: 'low',
      };
    }
    const cx = master.x + master.width / 2;
    const cy = master.z + master.height / 2;
    baths.sort((a, b) => {
      const da = Math.abs(a.x + a.width / 2 - cx) + Math.abs(a.z + a.height / 2 - cy);
      const db = Math.abs(b.x + b.width / 2 - cx) + Math.abs(b.z + b.height / 2 - cy);
      return da - db;
    });
    const bath = baths[0];
    // Is it already adjacent?
    const edge = sharedEdge(master, bath);
    if (edge) {
      return {
        operations: [],
        advisory: [
          `Connect ${masterName} to ${bath.name}: \`connect ${masterName}.${edge.fromA} to ${bath.name}.${edge.fromB} door at 50%\`.`,
        ],
        confidence: 'high',
      };
    }
    return {
      operations: [],
      advisory: [
        `Move ${bath.name} adjacent to ${masterName} with modify.mjs move_room, then add a connect door.`,
      ],
      confidence: 'low',
    };
  },

  wet_walls(finding, ctx) {
    const wetNames = finding.rooms;
    return {
      operations: [],
      advisory: [
        `Wet rooms (${wetNames.join(', ')}) are not adjacent. Consider modify.mjs move_room so at least two share a wall for plumbing efficiency.`,
      ],
      confidence: 'low',
    };
  },

  bathroom_privacy(finding, ctx) {
    const [bath, other] = finding.rooms;
    return {
      operations: [],
      advisory: [
        `Avoid ${bath} opening directly into ${other}. Prefer routing through a hallway: remove the direct connect and add a hallway room between them.`,
      ],
      confidence: 'medium',
    };
  },

  stair_through_walls(finding, ctx) {
    const containerName = finding.details?.container ?? finding.rooms[0];
    const room = findRoomAcrossFloors(containerName, ctx);
    if (!room) {
      return {
        operations: [],
        advisory: [finding.suggestion ?? `Stair "${finding.details?.stair}" pierces the walls of "${containerName}". Enlarge the room or change the stair shape.`],
        confidence: 'low',
      };
    }
    const requiredW = finding.details?.requiredWidth ?? room.width;
    const requiredH = finding.details?.requiredHeight ?? room.height;
    const newW = Math.max(room.width, requiredW);
    const newH = Math.max(room.height, requiredH);
    if (newW === room.width && newH === room.height) {
      return {
        operations: [],
        advisory: [finding.suggestion ?? `Switch stair shape to fit "${containerName}".`],
        confidence: 'low',
      };
    }
    return {
      operations: [
        { action: 'resize_room', target: containerName, params: { width: newW, height: newH } },
      ],
      advisory: [
        `Resizing ${containerName} to ${newW} x ${newH} ${ctx.config?.default_unit ?? 'ft'} will fit the stair run plus landings; alternatively, switch the stair to a U-shaped or L-shaped layout. Re-run validate.mjs after applying.`,
      ],
      confidence: 'medium',
    };
  },

  stair_landing_clearance(finding, ctx) {
    const containerName = finding.details?.container ?? finding.rooms[0];
    const room = findRoomAcrossFloors(containerName, ctx);
    if (!room) return null;
    const required = finding.details?.required ?? 3;
    const clearance = finding.details?.clearance ?? 0;
    const deficit = Math.max(0.5, required - clearance);
    // The stair's long axis is implicit in which end this finding came from.
    // Heuristically: if the room is narrower than the stair run, add to the
    // height; otherwise add to the same axis the deficit lies along. Since
    // we do not have direction in details, conservatively grow the longer
    // edge so the resize is unambiguous.
    let newW = room.width;
    let newH = room.height;
    if (room.height >= room.width) {
      newH = Math.ceil(room.height + deficit);
    } else {
      newW = Math.ceil(room.width + deficit);
    }
    return {
      operations: [
        { action: 'resize_room', target: containerName, params: { width: newW, height: newH } },
      ],
      advisory: [
        `Add ${deficit.toFixed(1)} ${ctx.config?.default_unit ?? 'ft'} to "${containerName}" so the ${finding.details?.end ?? 'stair'} landing meets the ${finding.details?.stairCode ?? 'residential'} ${required} ft minimum.`,
      ],
      confidence: 'medium',
    };
  },

  stair_door_collision(finding, ctx) {
    return {
      operations: [],
      advisory: [
        finding.suggestion ??
          `Reposition the door on stair-bearing room "${finding.details?.container}" so it lands outside the stair tread strip.`,
      ],
      confidence: 'medium',
    };
  },

  stair_room_access(finding, ctx) {
    return {
      operations: [],
      advisory: [
        finding.suggestion ??
          `Add a connect from "${finding.details?.container}" to a hallway/room on the same floor so the stair is reachable.`,
      ],
      confidence: 'medium',
    };
  },

  stair_landing_egress(finding, ctx) {
    const params = finding.details?.suggestionParams;
    const containerName = finding.details?.container ?? finding.rooms[0];
    const stairCode = finding.details?.stairCode ?? ctx.config?.stair_code ?? 'residential';
    const landingKind = finding.details?.landingKind ?? 'arrive';
    const stripLabel = landingKind === 'board' ? 'boarding (bottom-step)' : 'arrival (top-step)';
    if (!params || !params.fromRoom || !params.toRoom || !params.type) {
      return {
        operations: [],
        advisory: [
          finding.suggestion ??
            `Add an opening on "${containerName}" so the ${stripLabel} landing of stair "${finding.details?.stair}" is reachable.`,
        ],
        confidence: 'low',
      };
    }
    return {
      operations: [
        {
          action: 'add_connection',
          target: finding.details?.floorId ?? null,
          params: {
            fromRoom: params.fromRoom,
            fromWall: params.fromWall,
            toRoom: params.toRoom,
            toWall: params.toWall,
            type: params.type,
            position: params.position,
          },
        },
      ],
      advisory: [
        `Add \`connect ${params.fromRoom}.${params.fromWall} to ${params.toRoom}.${params.toWall} ${params.type} at ${params.position}%\` so occupants exit the ${stripLabel} landing of stair "${finding.details?.stair}" on floor "${finding.details?.floorId}". Defaulting to "${params.type}" per stair_code=${stairCode}.`,
      ],
      confidence: 'high',
    };
  },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

run(async () => {
  const args = parseArgs();
  const dsl = readDsl(args);
  const strict = args.strict === true;
  const only = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
  const skip = args.skip ? new Set(String(args.skip).split(',').map((s) => s.trim())) : null;

  // Re-run the critic to keep findings + ctx aligned (even if --critic is
  // supplied, we still need ctx for geometry look-ups).
  const result = await runCriticOnDsl(dsl, { only, skip, strict });
  if (result.parseErrors) emitValidationError(result.parseErrors);
  if (result.semErrors) emitValidationError(result.semErrors, null, result.semWarnings ?? []);
  if (result.convertError) emitValidationError([{ message: result.convertError }]);

  let findings = result.findings;
  if (args.critic) {
    // Override findings with pre-computed ones (preserves severity tweaks
    // the caller may have made), but still compute suggestions against the
    // current DSL's ctx.
    try {
      const precomputed = JSON.parse(readFileSync(args.critic, 'utf-8'));
      findings = precomputed?.data?.findings ?? precomputed?.findings ?? findings;
    } catch (err) {
      emitValidationError([{ message: `Could not read --critic '${args.critic}': ${err.message}` }]);
    }
  }

  const suggestions = [];
  const applicableOps = [];
  const advisoryFlat = [];

  for (const finding of findings) {
    const builder = suggesters[finding.rule];
    if (!builder) {
      suggestions.push({
        finding,
        operations: [],
        advisory: [finding.suggestion ?? 'No automated suggestion available for this rule.'],
        confidence: 'low',
      });
      if (finding.suggestion) advisoryFlat.push(finding.suggestion);
      continue;
    }
    const s = builder(finding, result.ctx);
    if (!s) {
      suggestions.push({
        finding,
        operations: [],
        advisory: [finding.suggestion ?? 'No actionable suggestion could be derived.'],
        confidence: 'low',
      });
      continue;
    }
    suggestions.push({ finding, ...s });
    applicableOps.push(...s.operations);
    advisoryFlat.push(...s.advisory);
  }

  const data = {
    suggestions,
    applicableOps,
    advisory: advisoryFlat,
    summary: {
      findings: findings.length,
      withOps: suggestions.filter((s) => s.operations.length > 0).length,
      advisoryOnly: suggestions.filter((s) => s.operations.length === 0).length,
      applicableOps: applicableOps.length,
    },
  };

  if (args['ops-out'] && applicableOps.length > 0) {
    const outPath = resolve(args['ops-out']);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(applicableOps, null, 2));
    data.opsOut = outPath;
  }

  emitOk(data, result.semWarnings ?? []);
});
