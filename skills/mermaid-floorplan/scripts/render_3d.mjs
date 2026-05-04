#!/usr/bin/env node
/**
 * render_3d.mjs — render a .floorplan DSL as an axonometric (isometric)
 * SVG/PNG so the agent can self-review the 3D structure without launching
 * the full Three.js floorplan-viewer.
 *
 * Each room is drawn as an extruded box (top + two visible side faces).
 * Walls are colour-coded by type (solid / window / open / door-gap),
 * floors are stacked by elevation, and stairs render as a sloped run of
 * tread lines spanning the floor below.
 *
 * Limits & non-goals:
 *   - This is a static, untextured isometric projection — not a Three.js
 *     scene. Use it for "is the layout sensible in 3D?" feedback. Reach
 *     for the floorplan-viewer (drag-and-drop the DSL) for full WebGL,
 *     materials, GLB export, and interactive camera.
 *   - Doors are rendered as gaps in the wall fill, not as swing arcs.
 *   - Lifts render as solid shafts, not animated cars.
 *
 * Usage:
 *   node render_3d.mjs <file.floorplan> [--out plan-3d.png] [--svg-out plan-3d.svg]
 *                      [--width 1200] [--angle iso|cabinet]
 *
 * Exit codes mirror render.mjs:
 *   0 — rendered
 *   1 — DSL failed to parse
 *   2 — runtime error
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

const ANGLES = {
  iso: { dx: Math.cos((30 * Math.PI) / 180), dy: Math.sin((30 * Math.PI) / 180) },
  cabinet: { dx: Math.cos((45 * Math.PI) / 180) * 0.5, dy: Math.sin((45 * Math.PI) / 180) * 0.5 },
};

const COLORS = {
  roof: '#fafafa',
  roofStroke: '#888',
  wallSolidFront: '#d8d4cc',
  wallSolidSide: '#bcb6a8',
  wallWindow: '#9ec5d6',
  wallOpen: '#ede6cf',
  wallStroke: '#555',
  floorSlab: '#cfcabe',
  floorSlabSide: '#a5a094',
  stair: '#a87c4a',
  stairTread: '#6b4a26',
  lift: '#9aa3ad',
  liftStroke: '#3b4350',
  text: '#222',
  bg: '#ffffff',
};

function ensureDir(p) {
  mkdirSync(dirname(resolve(p)), { recursive: true });
}

function project(x, y, z, angle) {
  // (x: right, y: up, z: depth) → screen-space (sx, sy).
  const sx = (x - z) * angle.dx;
  const sy = -y + (x + z) * angle.dy;
  return { sx, sy };
}

function polygon(points, fill, stroke = COLORS.wallStroke, strokeWidth = 0.5) {
  const d = points.map((p) => `${p.sx.toFixed(2)},${p.sy.toFixed(2)}`).join(' ');
  return `<polygon points="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="miter" />`;
}

function line(p1, p2, stroke, strokeWidth = 0.4) {
  return `<line x1="${p1.sx.toFixed(2)}" y1="${p1.sy.toFixed(2)}" x2="${p2.sx.toFixed(2)}" y2="${p2.sy.toFixed(2)}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function text(p, content, opts = {}) {
  const { size = 4, anchor = 'middle', dy = 0, weight = 'normal', fill = COLORS.text } = opts;
  return `<text x="${p.sx.toFixed(2)}" y="${(p.sy + dy).toFixed(2)}" font-size="${size}" font-family="Helvetica, Arial, sans-serif" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escape(content)}</text>`;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function wallSpec(room, direction) {
  return (room.walls ?? []).find((x) => x.direction === direction) ?? null;
}

function solidFill(side) {
  return side === 'front' ? COLORS.wallSolidFront : COLORS.wallSolidSide;
}

function lerp2d(p0, p1, t) {
  return { sx: p0.sx + (p1.sx - p0.sx) * t, sy: p0.sy + (p1.sy - p0.sy) * t };
}

/**
 * Render a wall face as one or three sub-polygons.
 *
 * p0..p3 are the four projected screen corners where the wall axis runs
 * from t=0 (p0/p3 end) to t=1 (p1/p2 end):
 *   bottom edge: p0 → p1
 *   top edge:    p3 → p2
 *
 * When the spec has a positioned window (`position` + `width` both set),
 * the face is split into up to three sub-rects: solid | window | solid.
 * Otherwise the whole face uses the wall-type colour (existing behaviour).
 *
 * @param {object} p0 p1 p2 p3 - Projected screen points
 * @param {object|null} spec   - JsonWall spec for this direction (may be null)
 * @param {number} wallLength  - World-unit length of the wall along the axis
 * @param {'front'|'side'} side
 */
function renderWallFace(p0, p1, p2, p3, spec, wallLength, side) {
  const parts = [];

  const hasPositionedWindow =
    spec?.type === 'window' && spec.position != null && spec.width != null;

  if (!hasPositionedWindow) {
    // Whole-wall fill — existing behaviour.
    let fill;
    if (spec?.type === 'window') fill = COLORS.wallWindow;
    else if (spec?.type === 'open') fill = COLORS.wallOpen;
    else fill = solidFill(side);
    parts.push(polygon([p0, p1, p2, p3], fill));
    return parts.join('\n');
  }

  // Compute fractional range [tStart, tEnd] of the window along the wall axis.
  const winCenter =
    spec.isPercentage !== false ? spec.position / 100 : spec.position / wallLength;
  const winHalf = spec.width / wallLength / 2;
  const tStart = Math.max(0, winCenter - winHalf);
  const tEnd = Math.min(1, winCenter + winHalf);

  // Interpolate along bottom (p0→p1) and top (p3→p2) edges.
  const lb = (t) => lerp2d(p0, p1, t);
  const lt = (t) => lerp2d(p3, p2, t);

  if (tStart > 0.001) {
    parts.push(polygon([p0, lb(tStart), lt(tStart), p3], solidFill(side)));
  }
  parts.push(polygon([lb(tStart), lb(tEnd), lt(tEnd), lt(tStart)], COLORS.wallWindow));
  if (tEnd < 0.999) {
    parts.push(polygon([lb(tEnd), p1, p2, lt(tEnd)], solidFill(side)));
  }
  return parts.join('\n');
}

/**
 * Render an extruded room box. Three faces are visible from the
 * +x/+y/-z viewpoint we project from: the roof slab (top), the front
 * wall (-z, "bottom" in floorplan coords), and the right wall (+x).
 * Other rooms behind it depth-sort earlier so this room paints on top
 * of them.
 */
function renderRoomBox({ room, elevation, height, angle }) {
  const { x, z, width, height: depth, name, label } = room;
  const x0 = x;
  const x1 = x + width;
  const z0 = z;
  const z1 = z + depth;
  const y0 = elevation;
  const y1 = elevation + height;

  // Eight corners
  const v = (vx, vy, vz) => project(vx, vy, vz, angle);
  const fbl = v(x0, y0, z1); // front-bottom-left
  const fbr = v(x1, y0, z1); // front-bottom-right
  const ftr = v(x1, y1, z1); // front-top-right
  const ftl = v(x0, y1, z1); // front-top-left
  const bbl = v(x0, y0, z0); // back-bottom-left
  const bbr = v(x1, y0, z0); // back-bottom-right
  const btr = v(x1, y1, z0); // back-top-right
  const btl = v(x0, y1, z0); // back-top-left

  const parts = [];
  // Front wall (z = z1, facing camera) — "bottom" in floorplan coords.
  // Wall axis runs left→right (x0→x1), so t=0 is fbl/ftl, t=1 is fbr/ftr.
  parts.push(renderWallFace(fbl, fbr, ftr, ftl, wallSpec(room, 'bottom'), room.width, 'front'));
  // Right wall (x = x1, facing camera) — "right" in floorplan coords.
  // Wall axis runs back→front (z0→z1), so t=0 is bbr/btr, t=1 is fbr/ftr.
  parts.push(renderWallFace(bbr, fbr, ftr, btr, wallSpec(room, 'right'), room.height, 'side'));
  // Roof slab (y = y1, top)
  parts.push(polygon([ftl, ftr, btr, btl], COLORS.roof, COLORS.roofStroke, 0.4));

  // Light room label centred on the roof. Cap the size so a single big
  // room doesn't dominate the figure.
  const center = v(x + width / 2, y1, z + depth / 2);
  const labelText = label || name;
  const labelSize = Math.min(2.5, Math.min(width, depth) * 0.18);
  parts.push(text(center, labelText, { size: labelSize }));
  return parts.join('\n');
}

/**
 * Floor slab: a thin extruded rectangle directly below the rooms. Helps
 * read the floor boundary even when interior rooms don't tile fully.
 */
function renderFloorSlab({ bbox, elevation, angle }) {
  const SLAB_THICK = 0.6;
  const { xMin, yMin, xMax, yMax } = bbox;
  const v = (vx, vy, vz) => project(vx, vy, vz, angle);
  const slabTopFL = v(xMin, elevation, yMax);
  const slabTopFR = v(xMax, elevation, yMax);
  const slabTopBR = v(xMax, elevation, yMin);
  const slabTopBL = v(xMin, elevation, yMin);
  const slabBotFL = v(xMin, elevation - SLAB_THICK, yMax);
  const slabBotFR = v(xMax, elevation - SLAB_THICK, yMax);
  const slabBotBR = v(xMax, elevation - SLAB_THICK, yMin);

  return [
    polygon([slabTopFL, slabTopFR, slabTopBR, slabTopBL], COLORS.floorSlab, '#888', 0.4),
    polygon([slabTopFL, slabTopFR, slabBotFR, slabBotFL], COLORS.floorSlabSide, '#888', 0.4),
    polygon([slabTopFR, slabTopBR, slabBotBR, slabBotFR], COLORS.floorSlabSide, '#888', 0.4),
  ].join('\n');
}

/**
 * Render a stair as a sloped run of tread bars. Approximates the climb
 * direction (`shape.direction` of straight stairs) with a simple ramp;
 * curved/spiral shapes degrade to a generic ramp.
 */
function renderStair({ stair, elevation, angle }) {
  const { x, z, rise = 10, width = 4, shape = {}, name, label } = stair;
  const dir = shape?.direction ?? 'top';
  const runLength = Math.max(8, rise * 1.1);
  const treads = Math.max(8, Math.round(rise / 0.65));
  const v = (vx, vy, vz) => project(vx, vy, vz, angle);
  const parts = [];
  for (let i = 0; i < treads; i++) {
    const t = i / treads;
    const t1 = (i + 1) / treads;
    const y0 = elevation + rise * t;
    const y1 = elevation + rise * t1;
    let p0, p1, p2, p3;
    if (dir === 'top' || dir === 'bottom') {
      const dz = dir === 'top' ? -1 : 1;
      const z0 = z + (dz === -1 ? runLength * (1 - t) : runLength * t);
      const z1m = z + (dz === -1 ? runLength * (1 - t1) : runLength * t1);
      p0 = v(x, y0, z0);
      p1 = v(x + width, y0, z0);
      p2 = v(x + width, y1, z1m);
      p3 = v(x, y1, z1m);
    } else {
      const dx = dir === 'right' ? 1 : -1;
      const x0 = x + (dx === 1 ? runLength * t : runLength * (1 - t));
      const x1 = x + (dx === 1 ? runLength * t1 : runLength * (1 - t1));
      p0 = v(x0, y0, z);
      p1 = v(x1, y0, z);
      p2 = v(x1, y1, z + width);
      p3 = v(x0, y1, z + width);
    }
    parts.push(polygon([p0, p1, p2, p3], COLORS.stair, COLORS.stairTread, 0.3));
  }
  // Label on the lowest tread
  const labelP = v(x + width / 2, elevation, z);
  parts.push(text(labelP, label || name, { size: 3, dy: 4 }));
  return parts.join('\n');
}

/**
 * Render a lift as a solid extruded shaft. We draw it from the lowest to
 * the highest floor it appears on so it visually pierces every floor it
 * connects, even if the renderer is iterating per-floor elsewhere.
 */
function renderLift({ lift, elevation, height, angle }) {
  const { x, z, width, height: depth, name, label } = lift;
  const v = (vx, vy, vz) => project(vx, vy, vz, angle);
  const x0 = x;
  const x1 = x + width;
  const z0 = z;
  const z1 = z + depth;
  const y0 = elevation;
  const y1 = elevation + height;
  const fbl = v(x0, y0, z1);
  const fbr = v(x1, y0, z1);
  const ftr = v(x1, y1, z1);
  const ftl = v(x0, y1, z1);
  const bbr = v(x1, y0, z0);
  const btr = v(x1, y1, z0);
  const btl = v(x0, y1, z0);
  const parts = [];
  parts.push(polygon([fbl, fbr, ftr, ftl], COLORS.lift, COLORS.liftStroke, 0.5));
  parts.push(polygon([fbr, bbr, btr, ftr], COLORS.lift, COLORS.liftStroke, 0.5));
  parts.push(polygon([ftl, ftr, btr, btl], COLORS.lift, COLORS.liftStroke, 0.5));
  const center = v(x + width / 2, y1, z + depth / 2);
  parts.push(text(center, label || name, { size: 3, fill: '#fff' }));
  return parts.join('\n');
}

run(async () => {
  const args = parseArgs();
  const dsl = readDsl(args);
  const angleName = (args.angle ?? 'iso').toLowerCase();
  const angle = ANGLES[angleName];
  if (!angle) {
    emitValidationError([
      { message: `Unknown --angle "${angleName}". Use one of: ${Object.keys(ANGLES).join(', ')}.` },
    ]);
  }

  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) emitValidationError(parseErrors);

  const { errors: semErrors, warnings: semWarnings } = await runLangiumValidation(document);

  const conv = convertFloorplanToJson(document.parseResult.value);
  if (!conv.data) {
    emitValidationError(
      conv.errors?.map((e) => ({ message: e.message })) ?? [
        { message: 'JSON conversion produced no data.' },
      ],
    );
  }

  const cfg = conv.data.config ?? {};
  const defaultHeight = Number(cfg.default_height ?? cfg.defaultHeight ?? 10);
  const lengthUnit = cfg.default_unit ?? cfg.defaultUnit ?? 'ft';
  const orderedFloors = [...conv.data.floors].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  // Compute scene bbox in floorplan coords (xz plane).
  let xMin = Infinity;
  let zMin = Infinity;
  let xMax = -Infinity;
  let zMax = -Infinity;
  let totalRise = 0;
  for (const fl of orderedFloors) {
    for (const r of fl.rooms ?? []) {
      xMin = Math.min(xMin, r.x);
      zMin = Math.min(zMin, r.z);
      xMax = Math.max(xMax, r.x + r.width);
      zMax = Math.max(zMax, r.z + r.height);
    }
    totalRise += Number(fl.height ?? defaultHeight);
  }
  if (!isFinite(xMin)) {
    emitValidationError([{ message: 'No rooms found in document; nothing to render.' }]);
  }

  // Painter's-algorithm depth key: rooms farther from camera (low x+z, high
  // y) draw first. Within each floor we sort by ascending (x + z); across
  // floors we draw bottom-up.
  const elevations = new Map();
  let acc = 0;
  for (const fl of orderedFloors) {
    elevations.set(fl.id, acc);
    acc += Number(fl.height ?? defaultHeight);
  }

  const drawables = [];
  for (const fl of orderedFloors) {
    const elevation = elevations.get(fl.id);
    const height = Number(fl.height ?? defaultHeight);
    const fbbox = fl.rooms?.length
      ? {
          xMin: Math.min(...fl.rooms.map((r) => r.x)),
          yMin: Math.min(...fl.rooms.map((r) => r.z)),
          xMax: Math.max(...fl.rooms.map((r) => r.x + r.width)),
          yMax: Math.max(...fl.rooms.map((r) => r.z + r.height)),
        }
      : null;
    if (fbbox) {
      drawables.push({
        depth: -1, // slabs draw first within their floor
        elevation,
        kind: 'slab',
        render: () => renderFloorSlab({ bbox: fbbox, elevation, angle }),
      });
    }
    for (const room of fl.rooms ?? []) {
      drawables.push({
        depth: room.x + room.z,
        elevation,
        kind: 'room',
        render: () => renderRoomBox({ room, elevation, height, angle }),
      });
    }
    for (const stair of fl.stairs ?? []) {
      drawables.push({
        depth: stair.x + stair.z + 0.1,
        elevation,
        kind: 'stair',
        render: () => renderStair({ stair, elevation, angle }),
      });
    }
    for (const lift of fl.lifts ?? []) {
      drawables.push({
        depth: lift.x + lift.z + 0.05,
        elevation,
        kind: 'lift',
        render: () =>
          renderLift({ lift, elevation, height, angle }),
      });
    }
  }
  drawables.sort((a, b) => {
    if (a.elevation !== b.elevation) return a.elevation - b.elevation;
    return a.depth - b.depth;
  });

  // Compute SVG viewBox: project the scene bbox corners and pad.
  const corners = [];
  for (const yy of [0, totalRise]) {
    for (const xx of [xMin, xMax]) {
      for (const zz of [zMin, zMax]) corners.push(project(xx, yy, zz, angle));
    }
  }
  const svgXMin = Math.min(...corners.map((c) => c.sx));
  const svgYMin = Math.min(...corners.map((c) => c.sy));
  const svgXMax = Math.max(...corners.map((c) => c.sx));
  const svgYMax = Math.max(...corners.map((c) => c.sy));
  const padding = 4;
  const titleBand = 6;
  const titleParts = [];
  for (const fl of orderedFloors) {
    titleParts.push(`${fl.id} (${(fl.rooms?.length ?? 0)} rooms, ${fl.height ?? defaultHeight}${lengthUnit})`);
  }
  const titleText = `Axonometric (${angleName}) — ${titleParts.join('  ·  ')}`;
  const titleFontSize = 2.6;
  // Helvetica avg char width ~ 0.55 × font size; pad a little.
  const titleEstWidth = titleText.length * titleFontSize * 0.55 + padding * 2;
  const sceneWidth = svgXMax - svgXMin + 2 * padding;
  const vbW = Math.max(sceneWidth, titleEstWidth);
  const extraX = (vbW - sceneWidth) / 2;
  const vbX = svgXMin - padding - extraX;
  const vbY = svgYMin - padding - titleBand;
  const vbH = svgYMax - svgYMin + 2 * padding + titleBand;

  const svgInner = drawables.map((d) => d.render()).join('\n');
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet">`,
    `<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="${COLORS.bg}" />`,
    `<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${titleBand}" fill="#f4f1ec" />`,
    `<text x="${vbX + padding}" y="${vbY + titleBand - 1.5}" font-size="${titleFontSize}" font-family="Helvetica, Arial, sans-serif" fill="#444">${escape(titleText)}</text>`,
    svgInner,
    '</svg>',
  ].join('\n');

  const width = args.width ? Number(args.width) : 1200;
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: COLORS.bg,
  });
  const png = resvg.render().asPng();

  const pngOut = args.out ?? 'render-3d.png';
  const svgOut = args['svg-out'] ?? pngOut.replace(/\.png$/i, '.svg');
  ensureDir(pngOut);
  ensureDir(svgOut);
  writeFileSync(pngOut, png);
  writeFileSync(svgOut, svg);

  emitOk(
    {
      pngPath: resolve(pngOut),
      svgPath: resolve(svgOut),
      pngBytes: png.length,
      svgBytes: svg.length,
      width,
      angle: angleName,
      floors: orderedFloors.length,
      totalRise,
      lengthUnit,
      semanticErrors: semErrors.length,
    },
    semWarnings ?? [],
  );
});
