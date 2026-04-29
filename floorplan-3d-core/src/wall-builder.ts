/**
 * Unified wall generation with optional CSG support
 *
 * This module provides wall generation that works in both CSG-enabled and
 * non-CSG environments. When `three-bvh-csg` is available, walls are generated
 * with proper cutouts for doors/windows. Otherwise, simple box walls are used
 * (doors/windows clip through).
 *
 * Usage:
 *   // Initialize CSG (call once at startup via csg-manager)
 *   const csgEnabled = await initCSG();
 *
 *   // Generate walls (uses CSG if available)
 *   const wallBuilder = new WallBuilder();
 *   wallBuilder.generateWall(...);
 */

import * as THREE from 'three';
import { generateConnection } from './connection-geometry.js';
import { findMatchingConnections, shouldRenderConnection } from './connection-matcher.js';
import type { ThemeColors, ViewerTheme } from './constants.js';
import { DIMENSIONS, getThemeColors } from './constants.js';
// Use centralized CSG manager - ensures single source of truth for CSG initialization
import { type CSGBrush, type CSGEvaluator, getCSG, isCsgAvailable } from './csg-manager.js';
import { reassignMaterialsByNormal } from './csg-utils.js';
import { MaterialFactory, type MaterialSet } from './materials.js';
import type { JsonConfig, JsonConnection, JsonRoom, JsonWall } from './types.js';
import {
  analyzeWallOwnership,
  hasContinuousWallAt,
  hasNeighborAtCorner,
  type StyleResolver,
  type WallSegment,
} from './wall-ownership.js';

/**
 * Hole specification for wall cutouts
 */
export interface HoleSpec {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  isVertical: boolean;
  wallThickness: number;
}

/**
 * Wall geometry specification
 */
export interface WallGeometry {
  width: number;
  depth: number;
  posX: number;
  posZ: number;
  isVertical: boolean;
}

/**
 * Calculate wall geometry (dimensions and position).
 *
 * Horizontal walls (top/bottom) extend past the room edge by `wallThickness/2`
 * **only** when the adjacent corner has no perpendicular neighbour room that
 * would fill it.  When a neighbour exists, the extension is omitted so the two
 * walls share exactly one edge — no overlapping volume, no Z-fighting corner.
 *
 * Vertical walls (left/right) **never** extend past the room edge in the Z
 * direction — they always butt against the top/bottom walls (or open space at
 * exterior corners).  This guarantees that every corner is owned by exactly
 * one wall.
 *
 * @param wall         Wall data
 * @param room         Room data
 * @param wallThickness Wall thickness
 * @param allRooms     All rooms on the same floor (default empty = treat all
 *                     corners as exterior, matching the pre-fix behaviour for
 *                     callers that don't have room context)
 * @returns Wall geometry specification
 */
export function calculateWallGeometry(
  wall: JsonWall,
  room: JsonRoom,
  wallThickness: number,
  allRooms: JsonRoom[] = [],
): WallGeometry {
  const halfT = wallThickness / 2;

  let width = 0,
    depth = 0,
    posX = 0,
    posZ = 0;
  let isVertical = false;

  switch (wall.direction) {
    case 'top':
    case 'bottom': {
      // Extend left (start) and right (end) ends only where there is no
      // perpendicular neighbour to fill the corner cell.
      const extStart = !hasNeighborAtCorner(room, wall, 'start', allRooms) ? halfT : 0;
      const extEnd = !hasNeighborAtCorner(room, wall, 'end', allRooms) ? halfT : 0;
      width = room.width + extStart + extEnd;
      depth = wallThickness;
      // Centre shifts when the extensions are asymmetric.
      posX = room.x - extStart + width / 2;
      posZ = wall.direction === 'top' ? room.z : room.z + room.height;
      break;
    }
    case 'left':
    case 'right': {
      // Segment positions are adjusted by adjustSegmentsForCorners to embed the
      // vertical wall's end faces (halfT - CUTTER_INFLATE) into the horizontal
      // walls.  The depth here represents the full span used for door/window
      // hole brushes (createExplicitHole / createConnectionHole); the actual
      // rendered segment length comes from endPos - startPos after adjustment.
      width = wallThickness;
      depth = room.height;
      posX = wall.direction === 'left' ? room.x : room.x + room.width;
      posZ = room.z + room.height / 2;
      isVertical = true;
      break;
    }
  }

  return { width, depth, posX, posZ, isVertical };
}

/**
 * Create geometry for a wall segment
 *
 * @param segment - Wall segment data
 * @param wallThickness - Wall thickness
 * @param wallHeight - Wall height
 * @param isVertical - Whether wall is vertical (left/right)
 * @returns BoxGeometry for the segment
 */
export function createWallSegmentGeometry(
  segment: WallSegment,
  wallThickness: number,
  wallHeight: number,
  isVertical: boolean,
): THREE.BoxGeometry {
  const segmentLength = segment.endPos - segment.startPos;
  // Asymmetric wall span:
  //   bottom = elevation - EMBED         (wall extends DOWN into slab below to
  //                                        bury the floor↔wall coplanar seam)
  //   top    = elevation + wallHeight    (NOT extended into slab above, plus a
  //            - CEILING_GAP              5mm air gap so wall and ceiling slab
  //                                        never overlap volumetrically — that
  //                                        overlap is what makes the wall
  //                                        shimmer through the slab at orbit
  //                                        angles, even at small magnitudes.
  //                                        See `setExplodedView` for why a
  //                                        purely vertical air gap suppresses
  //                                        the shimmer: 1% explode adds enough
  //                                        separation to break the overlap.)
  const embeddedHeight = wallHeight + DIMENSIONS.WALL.EMBED - DIMENSIONS.WALL.CEILING_GAP;

  if (isVertical) {
    return new THREE.BoxGeometry(wallThickness, embeddedHeight, segmentLength);
  } else {
    return new THREE.BoxGeometry(segmentLength, embeddedHeight, wallThickness);
  }
}

/**
 * Calculate position for a wall segment
 *
 * @param segment - Wall segment data
 * @param wall - Wall data
 * @param room - Room data
 * @param wallThickness - Wall thickness
 * @returns Position { x, z } for the segment center
 */
export function calculateWallSegmentPosition(
  segment: WallSegment,
  wall: JsonWall,
  room: JsonRoom,
  wallThickness: number,
): { x: number; z: number } {
  const segmentLength = segment.endPos - segment.startPos;
  const baseGeom = calculateWallGeometry(wall, room, wallThickness);
  const isVertical = wall.direction === 'left' || wall.direction === 'right';

  if (isVertical) {
    return {
      x: baseGeom.posX,
      z: room.z + segment.startPos + segmentLength / 2,
    };
  } else {
    return {
      x: room.x + segment.startPos + segmentLength / 2,
      z: baseGeom.posZ,
    };
  }
}

/**
 * Options for wall builder
 */
export interface WallBuilderOptions {
  wallThickness?: number;
  defaultHeight?: number;
  theme?: ViewerTheme;
  styleResolver?: StyleResolver;
  config?: JsonConfig;
}

/**
 * Wall builder class that manages CSG operations
 *
 * Uses the centralized CSG manager from csg-manager.ts.
 * Call initCSG() before creating WallBuilder instances to enable CSG operations.
 */
export class WallBuilder {
  private evaluator: CSGEvaluator | null = null;
  private theme?: ViewerTheme;
  private themeColors: ThemeColors;
  private styleResolver: StyleResolver = () => undefined;

  constructor() {
    // Use centralized CSG manager - CSG must be initialized via initCSG() before this
    if (isCsgAvailable()) {
      this.evaluator = new (getCSG().Evaluator)();
    }
    this.themeColors = getThemeColors('light');
  }

  /**
   * Set the theme for material generation
   */
  setTheme(theme: ViewerTheme): void {
    this.theme = theme;
    this.themeColors = getThemeColors(theme);
  }

  /**
   * Set the style resolver for wall ownership detection
   */
  setStyleResolver(resolver: StyleResolver): void {
    this.styleResolver = resolver;
  }

  /**
   * Generate a complete wall with holes for a room
   * Uses CSG if available, otherwise generates simple box walls
   *
   * @param connectionsGroup - Optional separate group for door/window meshes.
   *   When provided, connection geometry (door frames, window glass) is placed
   *   here instead of `group`, allowing independent layer visibility toggling.
   *   When omitted, connection meshes are added to `group` (backward-compatible).
   */
  generateWall(
    wall: JsonWall,
    room: JsonRoom,
    allRooms: JsonRoom[],
    connections: JsonConnection[],
    materials: MaterialSet,
    group: THREE.Group,
    config: JsonConfig = {},
    connectionsGroup?: THREE.Group,
  ): void {
    const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
    const elevation = room.elevation || 0;
    const wallHeight =
      wall.wallHeight || room.roomHeight || config.default_height || DIMENSIONS.WALL.HEIGHT;

    // Analyze wall ownership
    const ownership = analyzeWallOwnership(room, wall, allRooms, this.styleResolver);

    if (!ownership.shouldRender) {
      // Still need to process connections for door rendering
      this.processConnectionsOnly(
        wall,
        room,
        allRooms,
        connections,
        materials,
        connectionsGroup ?? group,
        elevation,
        config,
      );
      return;
    }

    // Adjust segment extents so corner cells are owned by exactly one wall with
    // no overlapping volume (eliminating Z-fighting at every room corner).
    const adjustedSegments = this.adjustSegmentsForCorners(
      ownership.segments,
      wall,
      room,
      wallThickness,
      allRooms,
    );

    if (this.evaluator && isCsgAvailable()) {
      // CSG path: generate wall with proper cutouts
      this.generateWallWithCSG(
        wall,
        room,
        adjustedSegments,
        allRooms,
        connections,
        materials,
        group,
        elevation,
        wallHeight,
        wallThickness,
        config,
        connectionsGroup,
      );
    } else {
      // Fallback path: simple box walls (doors clip through)
      this.generateSimpleWall(
        wall,
        room,
        adjustedSegments,
        allRooms,
        connections,
        materials,
        group,
        elevation,
        wallHeight,
        wallThickness,
        config,
        connectionsGroup,
      );
    }
  }

  /**
   * Generate wall using CSG for proper cutouts
   */
  private generateWallWithCSG(
    wall: JsonWall,
    room: JsonRoom,
    segments: WallSegment[],
    allRooms: JsonRoom[],
    connections: JsonConnection[],
    materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    wallHeight: number,
    wallThickness: number,
    config: JsonConfig,
    connectionsGroup?: THREE.Group,
  ): void {
    const { Brush, SUBTRACTION } = getCSG();
    const isVertical = wall.direction === 'left' || wall.direction === 'right';
    const baseGeometry = this.getWallGeometry(wall, room, wallThickness, allRooms);

    // Collect all holes
    const holes: CSGBrush[] = [];

    // Destination for door/window meshes — separate group when provided so
    // connection visibility can be toggled independently of wall segments.
    const connDest = connectionsGroup ?? group;

    // Handle explicit wall type (window/door)
    if (wall.type === 'door' || wall.type === 'window') {
      const holeBrush = this.createExplicitHole(
        wall,
        room,
        baseGeometry,
        wallThickness,
        elevation,
        config,
      );
      if (holeBrush) {
        holes.push(holeBrush);
        // Add glass for windows
        if (wall.type === 'window') {
          const glassMesh = this.createWindowGlass(
            wall,
            room,
            baseGeometry,
            elevation,
            materials,
            config,
          );
          if (glassMesh) connDest.add(glassMesh);
        }
      }
    }

    // Handle connections
    const connectionMatches = findMatchingConnections(room, wall, connections);
    for (const match of connectionMatches) {
      const shouldRender = shouldRenderConnection(match, wall, allRooms);
      const holeData = this.createConnectionHole(
        match.connection,
        room,
        wall,
        baseGeometry,
        wallThickness,
        elevation,
        allRooms,
        config,
      );
      if (holeData) {
        holes.push(holeData.brush);
        // Add door/window mesh if this wall should render it
        if (shouldRender && match.connection.doorType !== 'opening') {
          const connectionMesh = generateConnection(
            match.connection,
            room,
            allRooms.find((r) => r.name === match.connection.toRoom),
            wall,
            wallThickness,
            this.themeColors,
          );
          if (connectionMesh) {
            connectionMesh.position.y += elevation;
            connDest.add(connectionMesh);
          }
        }
      }
    }

    // Generate each segment with CSG.
    // Asymmetric wall span (see createWallSegmentGeometry comment for full
    // rationale): bottom = elevation - EMBED, top = elevation + wallHeight -
    // CEILING_GAP. The center is shifted to keep both faces at those exact Y
    // values without disturbing the segment's local-space geometry.
    const wallCenterY =
      elevation + wallHeight / 2 - DIMENSIONS.WALL.EMBED / 2 - DIMENSIONS.WALL.CEILING_GAP / 2;

    for (const segment of segments) {
      const segmentLength = segment.endPos - segment.startPos;
      if (segmentLength < 0.01) continue;

      const segmentGeom = this.getSegmentGeometry(
        segment,
        wall,
        room,
        wallThickness,
        wallHeight,
        isVertical,
      );
      const segmentPos = this.getSegmentPosition(segment, wall, room, wallThickness, isVertical);

      // Create per-face materials
      const segmentMaterials = MaterialFactory.createPerFaceWallMaterials(
        segment.ownerStyle,
        segment.hasAdjacentRoom ? segment.adjacentStyle : undefined,
        wall.direction,
        this.theme,
      );

      const segmentBrush = new Brush(segmentGeom, segmentMaterials);
      segmentBrush.position.set(segmentPos.x, wallCenterY, segmentPos.z);
      segmentBrush.updateMatrixWorld();

      // Filter holes for this segment
      const segmentHoles = this.filterHolesForSegment(holes, segment, room, isVertical);

      // Perform CSG and add to scene
      const resultMesh = this.performCSG(segmentBrush, segmentHoles, segmentMaterials, SUBTRACTION);
      if (resultMesh) {
        group.add(resultMesh);
      }
    }
  }

  /**
   * Generate simple box wall without CSG (fallback)
   */
  private generateSimpleWall(
    wall: JsonWall,
    room: JsonRoom,
    segments: WallSegment[],
    allRooms: JsonRoom[],
    connections: JsonConnection[],
    materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    wallHeight: number,
    wallThickness: number,
    config: JsonConfig,
    connectionsGroup?: THREE.Group,
  ): void {
    const isVertical = wall.direction === 'left' || wall.direction === 'right';
    const baseGeometry = this.getWallGeometry(wall, room, wallThickness, allRooms);

    // Destination for door/window meshes — separate group when provided.
    const connDest = connectionsGroup ?? group;

    // Handle explicit wall type (window)
    if (wall.type === 'window') {
      const glassMesh = this.createWindowGlass(
        wall,
        room,
        baseGeometry,
        elevation,
        materials,
        config,
      );
      if (glassMesh) connDest.add(glassMesh);
    }

    // Handle connections - add door meshes (they'll clip through walls)
    const connectionMatches = findMatchingConnections(room, wall, connections);
    for (const match of connectionMatches) {
      const shouldRender = shouldRenderConnection(match, wall, allRooms);
      if (shouldRender && match.connection.doorType !== 'opening') {
        const connectionMesh = generateConnection(
          match.connection,
          room,
          allRooms.find((r) => r.name === match.connection.toRoom),
          wall,
          wallThickness,
          this.themeColors,
        );
        if (connectionMesh) {
          connectionMesh.position.y += elevation;
          connDest.add(connectionMesh);
        }
      }
    }

    // Generate simple box walls for each segment.
    // Same asymmetric span as the CSG path (see createWallSegmentGeometry):
    // bottom = elevation - EMBED, top = elevation + wallHeight - CEILING_GAP.
    const wallCenterY =
      elevation + wallHeight / 2 - DIMENSIONS.WALL.EMBED / 2 - DIMENSIONS.WALL.CEILING_GAP / 2;

    for (const segment of segments) {
      const segmentLength = segment.endPos - segment.startPos;
      if (segmentLength < 0.01) continue;

      const segmentGeom = this.getSegmentGeometry(
        segment,
        wall,
        room,
        wallThickness,
        wallHeight,
        isVertical,
      );
      const segmentPos = this.getSegmentPosition(segment, wall, room, wallThickness, isVertical);

      const segmentMaterial = MaterialFactory.createWallMaterial(segment.ownerStyle, this.theme);
      const wallMesh = new THREE.Mesh(segmentGeom, segmentMaterial);
      wallMesh.position.set(segmentPos.x, wallCenterY, segmentPos.z);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      group.add(wallMesh);
    }
  }

  /**
   * Process connections for door rendering only
   */
  private processConnectionsOnly(
    wall: JsonWall,
    room: JsonRoom,
    allRooms: JsonRoom[],
    connections: JsonConnection[],
    _materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    config: JsonConfig,
  ): void {
    const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
    const connectionMatches = findMatchingConnections(room, wall, connections);

    for (const match of connectionMatches) {
      const shouldRender = shouldRenderConnection(match, wall, allRooms);
      if (shouldRender && match.connection.doorType !== 'opening') {
        const connectionMesh = generateConnection(
          match.connection,
          room,
          allRooms.find((r) => r.name === match.connection.toRoom),
          wall,
          wallThickness,
          this.themeColors,
        );
        if (connectionMesh) {
          connectionMesh.position.y += elevation;
          group.add(connectionMesh);
        }
      }
    }
  }

  /**
   * Calculate wall dimensions and position (delegates to exported function)
   */
  private getWallGeometry(
    wall: JsonWall,
    room: JsonRoom,
    wallThickness: number,
    allRooms: JsonRoom[] = [],
  ): WallGeometry {
    return calculateWallGeometry(wall, room, wallThickness, allRooms);
  }

  /**
   * Create segment geometry (delegates to exported function)
   */
  private getSegmentGeometry(
    segment: WallSegment,
    _wall: JsonWall,
    _room: JsonRoom,
    wallThickness: number,
    wallHeight: number,
    isVertical: boolean,
  ): THREE.BoxGeometry {
    return createWallSegmentGeometry(segment, wallThickness, wallHeight, isVertical);
  }

  /**
   * Calculate segment position (delegates to exported function)
   */
  private getSegmentPosition(
    segment: WallSegment,
    wall: JsonWall,
    room: JsonRoom,
    wallThickness: number,
    _isVertical: boolean,
  ): { x: number; z: number } {
    return calculateWallSegmentPosition(segment, wall, room, wallThickness);
  }

  /**
   * Create explicit hole for door/window wall type
   */
  private createExplicitHole(
    wall: JsonWall,
    room: JsonRoom,
    geometry: WallGeometry,
    wallThickness: number,
    elevation: number,
    config: JsonConfig,
  ): CSGBrush | null {
    if (!isCsgAvailable()) return null;
    const { Brush } = getCSG();

    const defaultDoorWidth = config.door_width ?? DIMENSIONS.DOOR.WIDTH;
    const defaultDoorHeight = config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
    const defaultWindowWidth = config.window_width ?? DIMENSIONS.WINDOW.WIDTH;
    const defaultWindowHeight = config.window_height ?? DIMENSIONS.WINDOW.HEIGHT;
    const windowSillHeight = config.window_sill ?? DIMENSIONS.WINDOW.SILL_HEIGHT;

    const defaultWidth = wall.type === 'door' ? defaultDoorWidth : defaultWindowWidth;
    const defaultHeight = wall.type === 'door' ? defaultDoorHeight : defaultWindowHeight;

    const holeWidth = wall.width || defaultWidth;
    const holeHeight = wall.height || defaultHeight;

    const holeY =
      elevation + (wall.type === 'door' ? holeHeight / 2 : windowSillHeight + holeHeight / 2);

    let holeX = geometry.posX;
    let holeZ = geometry.posZ;

    if (wall.position !== undefined) {
      let ratio = 0.5;
      if (wall.isPercentage) {
        ratio = wall.position / 100;
      } else {
        const wallLength = geometry.isVertical ? room.height : room.width;
        ratio = wall.position / wallLength;
      }

      if (geometry.isVertical) {
        holeZ = room.z + room.height * ratio;
      } else {
        holeX = room.x + room.width * ratio;
      }
    }

    const holeGeom = new THREE.BoxGeometry(
      geometry.isVertical ? wallThickness * 2 : holeWidth,
      holeHeight,
      geometry.isVertical ? holeWidth : wallThickness * 2,
    );
    const holeBrush = new Brush(holeGeom);
    holeBrush.position.set(holeX, holeY, holeZ);
    holeBrush.updateMatrixWorld();
    return holeBrush;
  }

  /**
   * Create window glass mesh
   */
  private createWindowGlass(
    wall: JsonWall,
    room: JsonRoom,
    geometry: WallGeometry,
    elevation: number,
    materials: MaterialSet,
    config: JsonConfig,
  ): THREE.Mesh | null {
    const defaultWindowWidth = config.window_width ?? DIMENSIONS.WINDOW.WIDTH;
    const defaultWindowHeight = config.window_height ?? DIMENSIONS.WINDOW.HEIGHT;
    const windowSillHeight = config.window_sill ?? DIMENSIONS.WINDOW.SILL_HEIGHT;

    const holeWidth = wall.width || defaultWindowWidth;
    const holeHeight = wall.height || defaultWindowHeight;
    const holeY = elevation + windowSillHeight + holeHeight / 2;

    let holeX = geometry.posX;
    let holeZ = geometry.posZ;

    if (wall.position !== undefined) {
      const ratio = wall.isPercentage
        ? wall.position / 100
        : wall.position / (geometry.isVertical ? room.height : room.width);
      if (geometry.isVertical) {
        holeZ = room.z + room.height * ratio;
      } else {
        holeX = room.x + room.width * ratio;
      }
    }

    const glassGeom = new THREE.BoxGeometry(
      geometry.isVertical ? DIMENSIONS.WINDOW.GLASS_THICKNESS : holeWidth,
      holeHeight,
      geometry.isVertical ? holeWidth : DIMENSIONS.WINDOW.GLASS_THICKNESS,
    );
    const glassMesh = new THREE.Mesh(glassGeom, materials.window);
    glassMesh.position.set(holeX, holeY, holeZ);
    return glassMesh;
  }

  /**
   * Create connection hole
   */
  private createConnectionHole(
    connection: JsonConnection,
    room: JsonRoom,
    _wall: JsonWall,
    geometry: WallGeometry,
    wallThickness: number,
    elevation: number,
    allRooms: JsonRoom[],
    config: JsonConfig,
  ): { brush: CSGBrush; x: number; z: number; y: number } | null {
    if (!isCsgAvailable()) return null;
    const { Brush } = getCSG();

    // Door dimensions
    let doorWidth: number;
    let doorHeight: number;

    if (connection.width !== undefined) {
      doorWidth = connection.width;
    } else if (config.door_size) {
      doorWidth = config.door_size[0];
    } else {
      const singleDoorWidth = config.door_width ?? DIMENSIONS.DOOR.WIDTH;
      doorWidth = connection.doorType === 'double-door' ? singleDoorWidth * 2 : singleDoorWidth;
    }

    if (connection.fullHeight) {
      const roomHeight = room.roomHeight ?? config.default_height ?? DIMENSIONS.WALL.HEIGHT;
      doorHeight = roomHeight;
    } else if (connection.height !== undefined) {
      doorHeight = connection.height;
    } else if (config.door_size) {
      doorHeight = config.door_size[1];
    } else {
      doorHeight = config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
    }

    const holeY = elevation + doorHeight / 2;

    const sourceRoom = allRooms.find((r) => r.name === connection.fromRoom) || room;
    const percentage = connection.position ?? 50;
    const ratio = percentage / 100;

    const sourceIsVertical = connection.fromWall === 'left' || connection.fromWall === 'right';

    let holeX: number, holeZ: number;
    if (sourceIsVertical) {
      holeZ = sourceRoom.z + sourceRoom.height * ratio;
      holeX = connection.fromWall === 'left' ? sourceRoom.x : sourceRoom.x + sourceRoom.width;
    } else {
      holeX = sourceRoom.x + sourceRoom.width * ratio;
      holeZ = connection.fromWall === 'top' ? sourceRoom.z : sourceRoom.z + sourceRoom.height;
    }

    const holeGeom = new THREE.BoxGeometry(
      geometry.isVertical ? wallThickness * 2 : doorWidth,
      doorHeight,
      geometry.isVertical ? doorWidth : wallThickness * 2,
    );
    const holeBrush = new Brush(holeGeom);
    holeBrush.position.set(holeX, holeY, holeZ);
    holeBrush.updateMatrixWorld();

    return { brush: holeBrush, x: holeX, z: holeZ, y: holeY };
  }

  /**
   * Filter holes that overlap with a segment
   */
  private filterHolesForSegment(
    holes: CSGBrush[],
    segment: WallSegment,
    room: JsonRoom,
    isVertical: boolean,
  ): CSGBrush[] {
    if (holes.length === 0) return [];

    const wallStart = isVertical ? room.z : room.x;
    const segmentWorldStart = wallStart + segment.startPos;
    const segmentWorldEnd = wallStart + segment.endPos;

    return holes.filter((hole) => {
      const holePos = isVertical ? hole.position.z : hole.position.x;
      return holePos >= segmentWorldStart - 0.5 && holePos <= segmentWorldEnd + 0.5;
    });
  }

  /**
   * Adjust segment start/end positions to account for corner geometry.
   *
   * This is the heart of the Z-fighting corner fix.
   *
   * Horizontal walls (top/bottom)
   * ─────────────────────────────
   * Each exterior end is extended outward by halfT so the horizontal wall
   * fills the corner cell.  An interior end (adjacent room present) is NOT
   * extended — the corner cell will be empty, which is correct because the
   * adjacent room's horizontal wall will fill it from the other side.
   *
   * Vertical walls (left/right)
   * ───────────────────────────
   * Vertical walls always butt against the horizontal walls.  Both ends are
   * always shrunk inward by halfT regardless of adjacency, because every
   * corner cell is owned by a horizontal wall (either this room's or the
   * adjacent room's).
   */
  private adjustSegmentsForCorners(
    segments: WallSegment[],
    wall: JsonWall,
    room: JsonRoom,
    wallThickness: number,
    allRooms: JsonRoom[],
  ): WallSegment[] {
    if (segments.length === 0) return segments;

    const halfT = wallThickness / 2;
    const isHorizontal = wall.direction === 'top' || wall.direction === 'bottom';
    const adjusted = segments.map((s) => ({ ...s }));

    if (isHorizontal) {
      // Expand exterior ends; leave interior ends (adjacent room) unchanged.
      // Also skip the extension when a vertically-adjacent room has a vertical
      // wall at the same X boundary — that wall will cover the corner cell,
      // so extending here would expose the horizontal wall's outer face as a
      // visible bump between the two vertical segments (the T-joint bug).
      const wallZ = wall.direction === 'top' ? room.z : room.z + room.height;
      const extStart =
        !hasNeighborAtCorner(room, wall, 'start', allRooms) &&
        !hasContinuousWallAt(room.x, wallZ, room, allRooms)
          ? halfT
          : 0;
      const extEnd =
        !hasNeighborAtCorner(room, wall, 'end', allRooms) &&
        !hasContinuousWallAt(room.x + room.width, wallZ, room, allRooms)
          ? halfT
          : 0;

      if (extStart > 0) {
        adjusted[0] = { ...adjusted[0], startPos: adjusted[0].startPos - extStart };
      }
      if (extEnd > 0) {
        const last = adjusted.length - 1;
        adjusted[last] = { ...adjusted[last], endPos: adjusted[last].endPos + extEnd };
      }
    } else {
      // Vertical walls embed their ends (halfT - WALL_CORNER_EMBED) into the
      // adjacent horizontal wall so their end faces are never coplanar with any
      // visible surface.
      //
      // Exception — T-junctions: when a vertically-adjacent room shares the
      // SAME outer boundary (e.g. LiftCore and StairCore both with right wall
      // at X=6), shrinking BOTH ends creates a `wallThickness`-wide gap on the
      // outer face, exposing the intermediate horizontal wall's right face as a
      // visible bump.  In that case we leave the end unshrunk so the two
      // vertical wall segments remain flush and the outer face is continuous.
      // The horizontal wall at the junction will also not extend at that corner
      // (handled in the isHorizontal branch above), so there is no Z-fighting.
      const embed = DIMENSIONS.GEOMETRY.WALL_CORNER_EMBED;
      const shrink = halfT - embed; // < halfT so end face is inside the H-wall body
      const targetX = wall.direction === 'left' ? room.x : room.x + room.width;

      if (!hasContinuousWallAt(targetX, room.z, room, allRooms)) {
        adjusted[0] = { ...adjusted[0], startPos: adjusted[0].startPos + shrink };
      }
      const last = adjusted.length - 1;
      if (!hasContinuousWallAt(targetX, room.z + room.height, room, allRooms)) {
        adjusted[last] = { ...adjusted[last], endPos: adjusted[last].endPos - shrink };
      }

      // Guard: don't produce negative-length segments for tiny rooms.
      for (let i = 0; i < adjusted.length; i++) {
        if (adjusted[i].endPos < adjusted[i].startPos) {
          adjusted[i] = { ...adjusted[i], endPos: adjusted[i].startPos };
        }
      }
    }

    return adjusted;
  }

  /**
   * Perform CSG subtraction
   */
  private performCSG(
    wallBrush: CSGBrush,
    holes: CSGBrush[],
    materials: THREE.MeshStandardMaterial[],
    subtraction: number,
  ): THREE.Mesh | null {
    if (!this.evaluator) return null;

    if (holes.length > 0) {
      let currentBrush = wallBrush;
      for (const hole of holes) {
        currentBrush = this.evaluator.evaluate(currentBrush, hole, subtraction);
      }
      currentBrush.material = materials;
      reassignMaterialsByNormal(currentBrush.geometry, materials.length);
      currentBrush.castShadow = true;
      currentBrush.receiveShadow = true;
      return currentBrush;
    } else {
      const resultMesh = new THREE.Mesh(wallBrush.geometry, materials);
      resultMesh.position.copy(wallBrush.position);
      resultMesh.castShadow = true;
      resultMesh.receiveShadow = true;
      return resultMesh;
    }
  }
}
