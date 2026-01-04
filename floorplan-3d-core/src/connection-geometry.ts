/**
 * Connection geometry generation for doors and windows
 * 
 * Provides platform-agnostic mesh generation for connections (doors/windows)
 * using simple Three.js box geometry (no CSG required).
 */

import * as THREE from 'three';
import type { JsonConnection, JsonFloor, JsonRoom, JsonWall } from './types.js';
import { DIMENSIONS } from './constants.js';
import type { ViewerTheme, ThemeColors } from './constants.js';
import { getThemeColors } from './constants.js';
import type { MaterialStyle } from './materials.js';
import { findMatchingConnections, shouldRenderConnection } from './connection-matcher.js';
import { calculatePositionWithFallback, type RoomBounds } from 'floorplan-common';

export interface ConnectionGeometryOptions {
  wallThickness: number;
  defaultHeight: number;
  theme?: ViewerTheme;
  styleMap?: Map<string, MaterialStyle>;
}

/**
 * Generate all connection meshes for a floor
 * 
 * @param floor - Floor data with rooms
 * @param allConnections - All connections in the floorplan
 * @param options - Rendering options
 * @returns Group containing all connection meshes
 */
export function generateFloorConnections(
  floor: JsonFloor,
  allConnections: JsonConnection[],
  options: ConnectionGeometryOptions
): THREE.Group {
  const group = new THREE.Group();
  group.name = `floor-${floor.id}-connections`;

  const theme = options.theme ?? 'light';
  const colors = getThemeColors(theme);

  // Process each room's walls
  for (const room of floor.rooms) {
    for (const wall of room.walls) {
      // Find connections for this wall
      const matches = findMatchingConnections(room, wall, allConnections);

      for (const match of matches) {
        // Check if this wall should render the connection (deduplication)
        if (!shouldRenderConnection(match, wall, floor.rooms)) {
          continue;
        }

        // Find target room (may be undefined if on different floor)
        const targetRoom = floor.rooms.find((r) => r.name === match.otherRoomName);

        // Generate connection mesh
        const connectionMesh = generateConnection(
          match.connection,
          room,
          targetRoom,
          wall,
          options.wallThickness,
          colors
        );

        if (connectionMesh) {
          group.add(connectionMesh);
        }
      }
    }
  }

  return group;
}

/**
 * Generate a single connection (door or window) mesh
 * 
 * @param connection - Connection data
 * @param sourceRoom - Room containing the wall
 * @param targetRoom - Target room (may be undefined for cross-floor connections)
 * @param wall - Wall data
 * @param wallThickness - Wall thickness in scene units
 * @param colors - Theme colors
 * @returns Object3D (Mesh or Group) or null if connection type not supported
 */
export function generateConnection(
  connection: JsonConnection,
  sourceRoom: JsonRoom,
  targetRoom: JsonRoom | undefined,
  wall: JsonWall,
  wallThickness: number,
  colors: ThemeColors
): THREE.Object3D | null {
  const isSingleDoor = connection.doorType === 'door';
  const isDoubleDoor = connection.doorType === 'double-door';
  const isWindow = connection.doorType === 'window';

  if (!isSingleDoor && !isDoubleDoor && !isWindow) {
    return null; // Unsupported connection type
  }

  // Calculate position along wall (uses overlap for uneven room segments)
  const position = calculateConnectionPosition(sourceRoom, targetRoom, wall, connection);

  // Room elevation
  const roomElevation = sourceRoom.elevation ?? 0;

  if (isDoubleDoor) {
    return renderDoubleDoorGeometry(
      connection,
      sourceRoom,
      wall,
      position,
      wallThickness,
      roomElevation,
      colors
    );
  } else if (isSingleDoor) {
    return renderDoorGeometry(
      connection,
      sourceRoom,
      wall,
      position,
      wallThickness,
      roomElevation,
      colors
    );
  } else {
    return renderWindowGeometry(
      connection,
      sourceRoom,
      wall,
      position,
      wallThickness,
      roomElevation,
      colors
    );
  }
}

/**
 * Calculate connection position along the wall
 * 
 * Uses the shared overlap calculation to position doors correctly when
 * rooms have uneven common wall segments (partial overlap).
 * 
 * @param room - Room data
 * @param targetRoom - Target room (for overlap calculation)
 * @param wall - Wall data
 * @param connection - Connection data
 * @returns Object with holeX, holeZ, holeY, and isVertical
 */
function calculateConnectionPosition(
  room: JsonRoom,
  targetRoom: JsonRoom | undefined,
  wall: JsonWall,
  connection: JsonConnection
): { holeX: number; holeZ: number; holeY: number; isVertical: boolean } {
  const roomHeight = room.roomHeight ?? DIMENSIONS.WALL.HEIGHT;
  const roomElevation = room.elevation ?? 0;

  // Determine if wall is vertical (left/right) or horizontal (top/bottom)
  const isVertical = wall.direction === 'left' || wall.direction === 'right';

  // Get position percentage (default to 50% = center)
  const positionPercent = connection.position ?? 50;

  // Convert 3D room coordinates to RoomBounds (z -> y for shared utility)
  const sourceBounds: RoomBounds = {
    x: room.x,
    y: room.z,  // 3D uses z for depth
    width: room.width,
    height: room.height,
  };
  const targetBounds: RoomBounds | null = targetRoom ? {
    x: targetRoom.x,
    y: targetRoom.z,
    width: targetRoom.width,
    height: targetRoom.height,
  } : null;

  // Calculate position using shared utility (considers overlap for uneven segments)
  let holeX: number;
  let holeZ: number;

  if (isVertical) {
    // Vertical wall (left/right)
    holeX = wall.direction === 'left' ? room.x : room.x + room.width;
    holeZ = calculatePositionWithFallback(sourceBounds, targetBounds, true, positionPercent);
  } else {
    // Horizontal wall (top/bottom)
    holeX = calculatePositionWithFallback(sourceBounds, targetBounds, false, positionPercent);
    holeZ = wall.direction === 'top' ? room.z : room.z + room.height;
  }

  // Y position (vertical center of wall)
  const holeY = roomElevation + roomHeight / 2;

  return { holeX, holeZ, holeY, isVertical };
}

/**
 * Render door geometry with swing
 * 
 * @param connection - Connection data
 * @param room - Source room
 * @param wall - Wall data
 * @param position - Calculated position
 * @param wallThickness - Wall thickness
 * @param roomElevation - Room floor elevation
 * @param colors - Theme colors
 * @returns Door mesh
 */
function renderDoorGeometry(
  connection: JsonConnection,
  room: JsonRoom,
  wall: JsonWall,
  position: { holeX: number; holeZ: number; holeY: number; isVertical: boolean },
  wallThickness: number,
  roomElevation: number,
  colors: ThemeColors
): THREE.Mesh {
  // Door dimensions
  let doorWidth: number;
  if (connection.width !== undefined) {
    doorWidth = connection.width;
  } else if (connection.doorType === 'double-door') {
    doorWidth = DIMENSIONS.DOUBLE_DOOR.WIDTH;
  } else {
    doorWidth = DIMENSIONS.DOOR.WIDTH;
  }

  const doorHeight = connection.height ?? DIMENSIONS.DOOR.HEIGHT;

  // Create door panel geometry with pivot at edge
  const doorPanelGeom = new THREE.BoxGeometry(
    doorWidth,
    doorHeight,
    DIMENSIONS.DOOR.PANEL_THICKNESS
  );
  // Shift geometry so pivot is at left edge (extending to +x)
  doorPanelGeom.translate(doorWidth / 2, 0, 0);

  // Create material
  const material = new THREE.MeshStandardMaterial({
    color: colors.DOOR,
    roughness: 0.7,
    metalness: 0.0,
  });

  const doorMesh = new THREE.Mesh(doorPanelGeom, material);
  doorMesh.name = `door-${connection.fromRoom}-${connection.toRoom}`;

  // Calculate hinge position
  const { hingeX, hingeZ, hingeSideSign } = calculateHingePosition(
    connection,
    wall,
    position,
    doorWidth
  );

  // Position door at hinge
  doorMesh.position.set(hingeX, roomElevation + doorHeight / 2, hingeZ);

  // Calculate door rotation (base angle + swing)
  const rotation = calculateDoorRotation(connection, room, wall, hingeSideSign, position.isVertical);
  doorMesh.rotation.y = rotation;

  return doorMesh;
}

/**
 * Render double-door geometry with two mirrored panels
 * 
 * @param connection - Connection data
 * @param room - Source room
 * @param wall - Wall data
 * @param position - Calculated position
 * @param wallThickness - Wall thickness
 * @param roomElevation - Room floor elevation
 * @param colors - Theme colors
 * @returns Group containing two door panels
 */
function renderDoubleDoorGeometry(
  connection: JsonConnection,
  room: JsonRoom,
  wall: JsonWall,
  position: { holeX: number; holeZ: number; holeY: number; isVertical: boolean },
  wallThickness: number,
  roomElevation: number,
  colors: ThemeColors
): THREE.Group {
  const group = new THREE.Group();
  group.name = `double-door-${connection.fromRoom}-${connection.toRoom}`;

  // Total door opening width
  const totalWidth = connection.width ?? DIMENSIONS.DOUBLE_DOOR.WIDTH;
  // Each panel is half the total width
  const panelWidth = totalWidth / 2;
  const doorHeight = connection.height ?? DIMENSIONS.DOOR.HEIGHT;

  // Create material (shared between panels)
  const material = new THREE.MeshStandardMaterial({
    color: colors.DOOR,
    roughness: 0.7,
    metalness: 0.0,
  });

  // Determine opensIn direction
  const opensIn = connection.opensInto ? connection.opensInto === room.name : true;

  // Create left panel (hinged on left side of opening)
  const leftPanel = createDoubleDoorPanel(
    panelWidth,
    doorHeight,
    material,
    'left',
    position,
    wall,
    roomElevation,
    opensIn
  );
  leftPanel.name = `double-door-left-${connection.fromRoom}-${connection.toRoom}`;
  group.add(leftPanel);

  // Create right panel (hinged on right side of opening)
  const rightPanel = createDoubleDoorPanel(
    panelWidth,
    doorHeight,
    material,
    'right',
    position,
    wall,
    roomElevation,
    opensIn
  );
  rightPanel.name = `double-door-right-${connection.fromRoom}-${connection.toRoom}`;
  group.add(rightPanel);

  return group;
}

/**
 * Create a single panel of a double door
 * 
 * @param panelWidth - Width of this panel
 * @param doorHeight - Height of the door
 * @param material - Material to use
 * @param side - 'left' or 'right' panel
 * @param position - Center position of the opening
 * @param wall - Wall data
 * @param roomElevation - Room floor elevation
 * @param opensIn - Whether door opens into the source room
 * @returns Door panel mesh
 */
function createDoubleDoorPanel(
  panelWidth: number,
  doorHeight: number,
  material: THREE.Material,
  side: 'left' | 'right',
  position: { holeX: number; holeZ: number; isVertical: boolean },
  wall: JsonWall,
  roomElevation: number,
  opensIn: boolean
): THREE.Mesh {
  // Create door panel geometry with pivot at edge
  const doorPanelGeom = new THREE.BoxGeometry(
    panelWidth,
    doorHeight,
    DIMENSIONS.DOOR.PANEL_THICKNESS
  );
  // Shift geometry so pivot is at left edge (extending to +x)
  doorPanelGeom.translate(panelWidth / 2, 0, 0);

  const doorMesh = new THREE.Mesh(doorPanelGeom, material);

  // Calculate hinge position
  // Left panel hinges at -panelWidth from center
  // Right panel hinges at +panelWidth from center
  const hingeSideSign = side === 'left' ? -1 : 1;
  
  let hingeX = position.holeX;
  let hingeZ = position.holeZ;

  if (position.isVertical) {
    hingeZ = position.holeZ + hingeSideSign * panelWidth;
  } else {
    hingeX = position.holeX + hingeSideSign * panelWidth;
  }

  // Position door at hinge
  doorMesh.position.set(hingeX, roomElevation + doorHeight / 2, hingeZ);

  // Calculate rotation
  // Each panel swings in opposite directions (mirrored)
  let baseAngle = 0;

  if (!position.isVertical) {
    // Horizontal wall - left panel points to +X, right panel to -X when closed
    baseAngle = side === 'left' ? 0 : Math.PI;
  } else {
    // Vertical wall - left panel points to +Z, right panel to -Z when closed
    baseAngle = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
  }

  // Apply swing - panels swing away from each other (mirrored)
  let wallFactor = 1;
  if (wall.direction === 'bottom' || wall.direction === 'left') {
    wallFactor = -1;
  }

  const openFactor = opensIn ? 1 : -1;
  // Left panel swings one way, right panel swings the other
  const swingDir = hingeSideSign * wallFactor * openFactor;

  const finalAngle = baseAngle + swingDir * DIMENSIONS.DOOR.DEFAULT_SWING_ANGLE;
  doorMesh.rotation.y = finalAngle;

  return doorMesh;
}

/**
 * Calculate hinge position along the wall
 * 
 * @param connection - Connection data
 * @param wall - Wall data
 * @param position - Base position
 * @param doorWidth - Door width
 * @returns Hinge position and side sign
 */
function calculateHingePosition(
  connection: JsonConnection,
  wall: JsonWall,
  position: { holeX: number; holeZ: number; isVertical: boolean },
  doorWidth: number
): { hingeX: number; hingeZ: number; hingeSideSign: number } {
  // Determine swing side (right vs left)
  const swingRight = connection.swing !== 'left'; // Default to right

  // Determine hinge side sign based on wall direction and swing
  // Based on "Facing the door from INSIDE the room":
  // Top (Look -Z): Right is +X (Max)
  // Bottom (Look +Z): Right is -X (Min)
  // Left (Look -X): Right is -Z (Min)
  // Right (Look +X): Right is +Z (Max)
  let hingeSideSign = 0;

  switch (wall.direction) {
    case 'top':
      hingeSideSign = swingRight ? 1 : -1;
      break;
    case 'bottom':
      hingeSideSign = swingRight ? -1 : 1;
      break;
    case 'left':
      hingeSideSign = swingRight ? -1 : 1;
      break;
    case 'right':
      hingeSideSign = swingRight ? 1 : -1;
      break;
  }

  let hingeX = position.holeX;
  let hingeZ = position.holeZ;

  if (position.isVertical) {
    hingeZ = position.holeZ + hingeSideSign * (doorWidth / 2);
  } else {
    hingeX = position.holeX + hingeSideSign * (doorWidth / 2);
  }

  return { hingeX, hingeZ, hingeSideSign };
}

/**
 * Calculate door rotation (closed position + swing)
 * 
 * @param connection - Connection data
 * @param room - Source room
 * @param wall - Wall data
 * @param hingeSideSign - Hinge side sign from calculation
 * @param isVertical - Whether wall is vertical
 * @returns Rotation angle in radians
 */
function calculateDoorRotation(
  connection: JsonConnection,
  room: JsonRoom,
  wall: JsonWall,
  hingeSideSign: number,
  isVertical: boolean
): number {
  // 1. Calculate base angle (closed position)
  let baseAngle = 0;

  if (!isVertical) {
    // Horizontal Wall (Along X)
    // Target Dir: (-hingeSideSign, 0, 0)
    // If hingeSideSign=1 (Max), Target=-X. Mesh=+X. Rot=PI.
    // If hingeSideSign=-1 (Min), Target=+X. Mesh=+X. Rot=0.
    baseAngle = hingeSideSign === 1 ? Math.PI : 0;
  } else {
    // Vertical Wall (Along Z)
    // Target Dir: (0, 0, -hingeSideSign)
    // Mesh=+X.
    // If hingeSideSign=1 (Max), Target=-Z. Need X->-Z. Rot=+PI/2.
    // If hingeSideSign=-1 (Min), Target=+Z. Need X->+Z. Rot=-PI/2.
    baseAngle = hingeSideSign === 1 ? Math.PI / 2 : -Math.PI / 2;
  }

  // 2. Calculate swing rotation
  const opensIn = connection.opensInto ? connection.opensInto === room.name : true;

  let wallFactor = 1;
  if (wall.direction === 'bottom' || wall.direction === 'left') {
    wallFactor = -1;
  }

  const openFactor = opensIn ? 1 : -1;
  const swingDir = hingeSideSign * wallFactor * openFactor;

  const finalAngle = baseAngle + swingDir * DIMENSIONS.DOOR.DEFAULT_SWING_ANGLE;

  return finalAngle;
}

/**
 * Render window geometry
 * 
 * @param connection - Connection data
 * @param room - Source room
 * @param wall - Wall data
 * @param position - Calculated position
 * @param wallThickness - Wall thickness
 * @param roomElevation - Room floor elevation
 * @param colors - Theme colors
 * @returns Window mesh
 */
function renderWindowGeometry(
  connection: JsonConnection,
  room: JsonRoom,
  wall: JsonWall,
  position: { holeX: number; holeZ: number; isVertical: boolean },
  wallThickness: number,
  roomElevation: number,
  colors: ThemeColors
): THREE.Mesh {
  // Window dimensions
  const windowWidth = connection.width ?? DIMENSIONS.WINDOW.WIDTH;
  const windowHeight = connection.height ?? DIMENSIONS.WINDOW.HEIGHT;
  const sillHeight = roomElevation + (DIMENSIONS.WINDOW.SILL_HEIGHT);

  // Create window geometry
  const windowGeom = new THREE.BoxGeometry(
    position.isVertical ? DIMENSIONS.WINDOW.GLASS_THICKNESS : windowWidth,
    windowHeight,
    position.isVertical ? windowWidth : DIMENSIONS.WINDOW.GLASS_THICKNESS
  );

  // Create transparent material
  const material = new THREE.MeshStandardMaterial({
    color: colors.WINDOW,
    roughness: 0.0,
    metalness: 0.9,
    transparent: true,
    opacity: 0.3,
  });

  const windowMesh = new THREE.Mesh(windowGeom, material);
  windowMesh.name = `window-${connection.fromRoom}-${connection.toRoom}`;

  // Position window
  windowMesh.position.set(
    position.holeX,
    sillHeight + windowHeight / 2,
    position.holeZ
  );

  return windowMesh;
}

