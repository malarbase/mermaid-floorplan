/**
 * Door mesh creation and positioning logic
 */

import * as THREE from 'three';
import { DIMENSIONS } from './constants';
import { JsonConnection, JsonRoom, JsonWall } from './types';

export interface DoorConfig {
  connection: JsonConnection;
  room: JsonRoom;
  wall: JsonWall;
  holeX: number;
  holeZ: number;
  holeY: number;
  isVertical: boolean;
  material: THREE.Material;
}

export class DoorRenderer {
  /**
   * Create a door mesh with proper positioning and rotation
   */
  renderDoor(config: DoorConfig): THREE.Mesh {
    // Use connection-specific dimensions if available, else defaults
    // For double-door, use full width if specified, else double the single door width
    let doorWidth: number;
    if (config.connection.width !== undefined) {
      doorWidth = config.connection.width;
    } else if (config.connection.doorType === 'double-door') {
      doorWidth = DIMENSIONS.DOUBLE_DOOR.WIDTH;
    } else {
      doorWidth = DIMENSIONS.DOOR.WIDTH;
    }

    // Use connection height if specified, else default
    const doorHeight = config.connection.height ?? DIMENSIONS.DOOR.HEIGHT;

    // Create door panel geometry with pivot at edge
    const doorPanelGeom = new THREE.BoxGeometry(
      doorWidth,
      doorHeight,
      DIMENSIONS.DOOR.PANEL_THICKNESS
    );
    // Shift geometry so pivot is at left edge (extending to +x)
    doorPanelGeom.translate(doorWidth / 2, 0, 0);

    const doorMesh = new THREE.Mesh(doorPanelGeom, config.material);

    // Calculate hinge position
    const { hingeX, hingeZ, hingeSideSign } = this.calculateHingePosition(
      config,
      doorWidth
    );

    doorMesh.position.set(hingeX, config.holeY, hingeZ);

    // Calculate door rotation (base angle + swing)
    const rotation = this.calculateDoorRotation(config, hingeSideSign);
    doorMesh.rotation.y = rotation;

    return doorMesh;
  }

  /**
   * Calculate hinge position along the wall
   */
  private calculateHingePosition(
    config: DoorConfig,
    doorWidth: number
  ): { hingeX: number; hingeZ: number; hingeSideSign: number } {
    const { holeX, holeZ, wall, connection, isVertical } = config;

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

    let hingeX = holeX;
    let hingeZ = holeZ;

    if (isVertical) {
      hingeZ = holeZ + hingeSideSign * (doorWidth / 2);
    } else {
      hingeX = holeX + hingeSideSign * (doorWidth / 2);
    }

    return { hingeX, hingeZ, hingeSideSign };
  }

  /**
   * Calculate door rotation (closed position + swing)
   */
  private calculateDoorRotation(
    config: DoorConfig,
    hingeSideSign: number
  ): number {
    const { wall, connection, room, isVertical } = config;

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
}

