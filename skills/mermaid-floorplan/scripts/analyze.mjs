#!/usr/bin/env node
/**
 * analyze.mjs — structured metrics + adjacency graph for a .floorplan.
 *
 * Mirrors the MCP `analyze_floorplan` tool and adds a room adjacency graph
 * based on shared-wall detection.
 *
 * Usage:
 *   node analyze.mjs <file.floorplan> [--area-unit sqft|sqm] [--no-rooms]
 *   node analyze.mjs --dsl '<literal>'
 *
 * Output `data` shape:
 *   {
 *     summary: { floorCount, totalRooms, grossFloorArea, areaUnit },
 *     floors: [ { id, index, roomCount, netArea, boundingBox, efficiency } ],
 *     rooms:  [ { name, floor, area, dimensions, label } ],
 *     connections: [ { from, to, wallPair, doorType, position } ],
 *     adjacency: [ { rooms: [a, b], sharedWall: "right|left|top|bottom", lengthUnits } ]
 *   }
 */

import { convertFloorplanToJson } from 'floorplan-language';
import {
  parseArgs,
  readDsl,
  parseDsl,
  runLangiumValidation,
  emitOk,
  emitValidationError,
  run,
} from './_lib.mjs';

const SQFT_TO_SQM = 0.092903;

function formatArea(value, unit) {
  if (unit === 'sqm') return Math.round(value * SQFT_TO_SQM * 100) / 100;
  return value;
}

/**
 * Compute an adjacency graph for rooms on a single floor. Two rooms are
 * adjacent when their bounding boxes share a common edge segment of length
 * > 0. Returns the shared wall direction from each room's perspective and
 * the shared segment length in grid units.
 */
function computeAdjacency(rooms) {
  const adj = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      // floorplan-language JSON uses (x, z) for ground-plane coords; treat z as y.
      const ax1 = a.x,
        ay1 = a.z,
        ax2 = a.x + a.width,
        ay2 = a.z + a.height;
      const bx1 = b.x,
        by1 = b.z,
        bx2 = b.x + b.width,
        by2 = b.z + b.height;

      // Vertical shared edge: a.right = b.left or a.left = b.right
      if (ax2 === bx1 && ay1 < by2 && by1 < ay2) {
        const len = Math.min(ay2, by2) - Math.max(ay1, by1);
        adj.push({
          rooms: [a.name, b.name],
          sharedWall: 'a.right=b.left',
          lengthUnits: len,
        });
      } else if (bx2 === ax1 && ay1 < by2 && by1 < ay2) {
        const len = Math.min(ay2, by2) - Math.max(ay1, by1);
        adj.push({
          rooms: [a.name, b.name],
          sharedWall: 'a.left=b.right',
          lengthUnits: len,
        });
      }
      // Horizontal shared edge: a.bottom = b.top or a.top = b.bottom
      else if (ay2 === by1 && ax1 < bx2 && bx1 < ax2) {
        const len = Math.min(ax2, bx2) - Math.max(ax1, bx1);
        adj.push({
          rooms: [a.name, b.name],
          sharedWall: 'a.bottom=b.top',
          lengthUnits: len,
        });
      } else if (by2 === ay1 && ax1 < bx2 && bx1 < ax2) {
        const len = Math.min(ax2, bx2) - Math.max(ax1, bx1);
        adj.push({
          rooms: [a.name, b.name],
          sharedWall: 'a.top=b.bottom',
          lengthUnits: len,
        });
      }
    }
  }
  return adj;
}

run(async () => {
  const args = parseArgs();
  const dsl = readDsl(args);
  const areaUnit = args['area-unit'] === 'sqm' ? 'sqm' : 'sqft';
  const includeRooms = args['no-rooms'] !== true;

  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) emitValidationError(parseErrors);

  const { errors: semErrors, warnings: semWarnings } = await runLangiumValidation(document);
  if (semErrors.length > 0) {
    emitValidationError(semErrors, null, semWarnings);
  }

  const floorplan = document.parseResult.value;
  const json = convertFloorplanToJson(floorplan);
  if (!json.data) {
    emitValidationError([{ message: 'Failed to convert floorplan to JSON' }]);
  }

  const { floors, summary, connections } = json.data;

  const summaryResp = summary
    ? {
        floorCount: summary.floorCount,
        totalRooms: summary.totalRoomCount,
        grossFloorArea: formatArea(summary.grossFloorArea, areaUnit),
        areaUnit,
      }
    : null;

  const floorsResp = floors.map((f) => ({
    id: f.id,
    index: f.index,
    roomCount: f.metrics?.roomCount ?? f.rooms.length,
    netArea: formatArea(f.metrics?.netArea ?? 0, areaUnit),
    boundingBox: f.metrics?.boundingBox
      ? {
          width: f.metrics.boundingBox.width,
          height: f.metrics.boundingBox.height,
          area: formatArea(f.metrics.boundingBox.area, areaUnit),
        }
      : null,
    efficiency: f.metrics?.efficiency ?? 0,
  }));

  const roomsResp = includeRooms
    ? floors.flatMap((f) =>
        f.rooms.map((r) => ({
          name: r.name,
          floor: f.id,
          area: formatArea(r.area ?? r.width * r.height, areaUnit),
          dimensions: { width: r.width, height: r.height },
          position: { x: r.x, y: r.z },
          label: r.label ?? null,
        })),
      )
    : undefined;

  const adjacency = floors.flatMap((f) =>
    computeAdjacency(f.rooms).map((e) => ({ ...e, floor: f.id })),
  );

  const connectionsResp = (connections ?? []).map((c) => ({
    from: c.fromRoom,
    to: c.toRoom,
    wallPair: `${c.fromRoom}.${c.fromWall}->${c.toRoom}.${c.toWall}`,
    doorType: c.doorType,
    position: c.position,
  }));

  emitOk(
    {
      summary: summaryResp,
      floors: floorsResp,
      rooms: roomsResp,
      adjacency,
      connections: connectionsResp,
    },
    semWarnings,
  );
});
