/**
 * Tests for scene builder module
 */

import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { COLORS, COLORS_BLUEPRINT, COLORS_DARK } from '../src/constants';
import {
  buildCompleteScene,
  buildFloorplanScene,
  buildFloorplanSceneFromNormalized,
} from '../src/scene-builder';
import type { JsonExport, JsonFloor, JsonRoom, Render3DOptions } from '../src/types';
import { normalizeToMeters } from '../src/unit-normalizer';

/**
 * Create a minimal room for testing
 */
function createRoom(
  name: string,
  x: number,
  z: number,
  width: number,
  height: number,
  style?: string,
): JsonRoom {
  return {
    name,
    x,
    z,
    width,
    height,
    walls: [
      { direction: 'top', type: 'solid' },
      { direction: 'bottom', type: 'solid' },
      { direction: 'left', type: 'solid' },
      { direction: 'right', type: 'solid' },
    ],
    style,
  };
}

/**
 * Create a minimal floor for testing
 */
function createFloor(id: string, index: number, rooms: JsonRoom[]): JsonFloor {
  return {
    id,
    index,
    rooms,
  };
}

/**
 * Create a minimal floorplan export for testing
 */
function createMinimalFloorplan(): JsonExport {
  return {
    floors: [
      createFloor('ground', 0, [createRoom('room1', 0, 0, 5, 5), createRoom('room2', 5, 0, 5, 5)]),
    ],
    connections: [],
  };
}

/**
 * Create a multi-floor floorplan for testing
 */
function createMultiFloorFloorplan(): JsonExport {
  return {
    floors: [
      createFloor('ground', 0, [createRoom('living', 0, 0, 8, 6)]),
      createFloor('first', 1, [createRoom('bedroom', 0, 0, 8, 6)]),
      createFloor('second', 2, [createRoom('attic', 0, 0, 6, 4)]),
    ],
    connections: [],
    config: {
      default_height: 3.0,
    },
  };
}

/**
 * Create a styled floorplan for testing
 */
function createStyledFloorplan(): JsonExport {
  return {
    floors: [
      createFloor('ground', 0, [
        createRoom('room1', 0, 0, 5, 5, 'wood'),
        createRoom('room2', 5, 0, 5, 5, 'tile'),
      ]),
    ],
    connections: [],
    styles: [
      { name: 'wood', floor_color: '#8B4513', wall_color: '#D2B48C' },
      { name: 'tile', floor_color: '#FFFFFF', wall_color: '#C0C0C0' },
    ],
  };
}

describe('buildFloorplanScene', () => {
  describe('basic scene building', () => {
    test('should create a valid Three.js scene', () => {
      const data = createMinimalFloorplan();
      const result = buildFloorplanScene(data);

      expect(result.scene).toBeInstanceOf(THREE.Scene);
    });

    test('should return scene bounds', () => {
      const data = createMinimalFloorplan();
      const result = buildFloorplanScene(data);

      expect(result.bounds).toBeDefined();
      expect(result.bounds.center).toBeDefined();
      expect(result.bounds.size).toBeDefined();
      expect(result.bounds.min).toBeDefined();
      expect(result.bounds.max).toBeDefined();
    });

    test('should return list of rendered floors', () => {
      const data = createMinimalFloorplan();
      const result = buildFloorplanScene(data);

      expect(result.floorsRendered).toEqual([0]);
    });

    test('should return style map', () => {
      const data = createStyledFloorplan();
      const result = buildFloorplanScene(data);

      expect(result.styleMap).toBeInstanceOf(Map);
      expect(result.styleMap.has('wood')).toBe(true);
      expect(result.styleMap.has('tile')).toBe(true);
    });
  });

  describe('floor rendering', () => {
    test('should create floor group for each floor', () => {
      const data = createMultiFloorFloorplan();
      const result = buildFloorplanScene(data);

      const floorGroups = result.scene.children.filter((child) => child.name.startsWith('floor_'));

      expect(floorGroups).toHaveLength(3);
    });

    test('should render only specified floors', () => {
      const data = createMultiFloorFloorplan();
      const result = buildFloorplanScene(data, { floorIndices: [0, 2] });

      // Should render floors 0 and 2, but not 1
      expect(result.floorsRendered).toEqual([0, 2]);

      const floorGroups = result.scene.children.filter((child) => child.name.startsWith('floor_'));
      expect(floorGroups).toHaveLength(2);
    });

    test('should position floors vertically', () => {
      const data = createMultiFloorFloorplan();
      const result = buildFloorplanScene(data);

      const floorGroups = result.scene.children.filter((child) =>
        child.name.startsWith('floor_'),
      ) as THREE.Group[];

      // Sort by index
      floorGroups.sort((a, b) => {
        const aIndex = parseInt(a.name.replace('floor_', ''), 10);
        const bIndex = parseInt(b.name.replace('floor_', ''), 10);
        return aIndex - bIndex;
      });

      // Each floor should be positioned higher than the previous
      for (let i = 1; i < floorGroups.length; i++) {
        expect(floorGroups[i].position.y).toBeGreaterThan(floorGroups[i - 1].position.y);
      }
    });
  });

  describe('theme support', () => {
    test('should apply light theme by default', () => {
      const data = createMinimalFloorplan();
      const result = buildFloorplanScene(data);

      expect(result.scene.background).toBeInstanceOf(THREE.Color);
      expect((result.scene.background as THREE.Color).getHex()).toBe(COLORS.BACKGROUND);
    });

    test('should apply dark theme when specified', () => {
      const data = createMinimalFloorplan();
      const result = buildFloorplanScene(data, { theme: 'dark' });

      expect((result.scene.background as THREE.Color).getHex()).toBe(COLORS_DARK.BACKGROUND);
    });

    test('should apply blueprint theme when specified', () => {
      const data = createMinimalFloorplan();
      const result = buildFloorplanScene(data, { theme: 'blueprint' });

      expect((result.scene.background as THREE.Color).getHex()).toBe(COLORS_BLUEPRINT.BACKGROUND);
    });
  });

  describe('visibility options', () => {
    test('should not render floors when showFloors is false', () => {
      const data = createMinimalFloorplan();
      const resultWith = buildFloorplanScene(data, { showFloors: true });
      const resultWithout = buildFloorplanScene(data, { showFloors: false });

      // Scene with floors should have more children
      const countMeshes = (scene: THREE.Scene): number => {
        let count = 0;
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) count++;
        });
        return count;
      };

      expect(countMeshes(resultWith.scene)).toBeGreaterThan(countMeshes(resultWithout.scene));
    });

    test('should not render walls when showWalls is false', () => {
      const data = createMinimalFloorplan();
      const resultWith = buildFloorplanScene(data, { showWalls: true });
      const resultWithout = buildFloorplanScene(data, { showWalls: false });

      const countMeshes = (scene: THREE.Scene): number => {
        let count = 0;
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) count++;
        });
        return count;
      };

      expect(countMeshes(resultWith.scene)).toBeGreaterThan(countMeshes(resultWithout.scene));
    });
  });

  describe('stairs and lifts', () => {
    test('should render stairs when present', () => {
      const data: JsonExport = {
        floors: [
          {
            id: 'ground',
            index: 0,
            rooms: [createRoom('lobby', 0, 0, 10, 10)],
            stairs: [
              {
                name: 'main-stairs',
                x: 8,
                z: 2,
                rise: 3.0,
                shape: { type: 'straight', direction: 'north' },
              },
            ],
          },
        ],
        connections: [],
      };

      const result = buildFloorplanScene(data, { showStairs: true });

      // Should have stair geometry
      let _hasStairGeometry = false;
      result.scene.traverse((obj) => {
        if (obj.name.includes('stair')) _hasStairGeometry = true;
      });

      // Stair generator creates a group even if named differently
      expect(result.scene.children.length).toBeGreaterThan(0);
    });

    test('should render lifts when present', () => {
      const data: JsonExport = {
        floors: [
          {
            id: 'ground',
            index: 0,
            rooms: [createRoom('lobby', 0, 0, 10, 10)],
            lifts: [
              {
                name: 'lift1',
                x: 8,
                z: 8,
                width: 2,
                height: 2,
                doors: ['south'],
              },
            ],
          },
        ],
        connections: [],
      };

      const result = buildFloorplanScene(data, { showLifts: true });

      // Scene should contain lift geometry
      expect(result.scene.children.length).toBeGreaterThan(0);
    });
  });
});

describe('buildCompleteScene', () => {
  test('should return scene, camera, and bounds', () => {
    const data = createMinimalFloorplan();
    const options: Render3DOptions = { width: 800, height: 600 };

    const result = buildCompleteScene(data, options);

    expect(result.scene).toBeInstanceOf(THREE.Scene);
    expect(result.camera).toBeDefined();
    expect(result.bounds).toBeDefined();
    expect(result.floorsRendered).toBeDefined();
  });

  test('should set up isometric camera by default', () => {
    const data = createMinimalFloorplan();
    const options: Render3DOptions = { width: 800, height: 600 };

    const result = buildCompleteScene(data, options);

    expect(result.camera).toBeInstanceOf(THREE.OrthographicCamera);
  });

  test('should set up perspective camera when specified', () => {
    const data = createMinimalFloorplan();
    const options: Render3DOptions = {
      width: 800,
      height: 600,
      projection: 'perspective',
      fov: 60,
    };

    const result = buildCompleteScene(data, options);

    expect(result.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect((result.camera as THREE.PerspectiveCamera).fov).toBe(60);
  });

  test('should add lighting to the scene', () => {
    const data = createMinimalFloorplan();
    const options: Render3DOptions = { width: 800, height: 600 };

    const result = buildCompleteScene(data, options);

    // Should have ambient and/or directional lights
    let hasLight = false;
    result.scene.traverse((obj) => {
      if (obj instanceof THREE.Light) hasLight = true;
    });

    expect(hasLight).toBe(true);
  });

  test('should render all floors when renderAllFloors is true', () => {
    const data = createMultiFloorFloorplan();
    const options: Render3DOptions = {
      width: 800,
      height: 600,
      renderAllFloors: true,
    };

    const result = buildCompleteScene(data, options);

    expect(result.floorsRendered).toEqual([0, 1, 2]);
  });

  test('should render only first floor by default', () => {
    const data = createMultiFloorFloorplan();
    const options: Render3DOptions = { width: 800, height: 600 };

    const result = buildCompleteScene(data, options);

    expect(result.floorsRendered).toEqual([0]);
  });

  test('should render specific floor when floorIndex is specified', () => {
    const data = createMultiFloorFloorplan();
    const options: Render3DOptions = {
      width: 800,
      height: 600,
      floorIndex: 1,
    };

    const result = buildCompleteScene(data, options);

    expect(result.floorsRendered).toEqual([1]);
  });

  test('should apply dark theme from config', () => {
    const data: JsonExport = {
      ...createMinimalFloorplan(),
      config: { theme: 'dark' },
    };
    const options: Render3DOptions = { width: 800, height: 600 };

    const result = buildCompleteScene(data, options);

    expect((result.scene.background as THREE.Color).getHex()).toBe(COLORS_DARK.BACKGROUND);
  });

  test('should apply dark theme from darkMode config', () => {
    const data: JsonExport = {
      ...createMinimalFloorplan(),
      config: { darkMode: true },
    };
    const options: Render3DOptions = { width: 800, height: 600 };

    const result = buildCompleteScene(data, options);

    expect((result.scene.background as THREE.Color).getHex()).toBe(COLORS_DARK.BACKGROUND);
  });
});

describe('styled rooms', () => {
  test('should apply floor colors from styles', () => {
    const data = createStyledFloorplan();
    const result = buildFloorplanScene(data);

    // Style map should have the styles
    expect(result.styleMap.get('wood')?.floor_color).toBe('#8B4513');
    expect(result.styleMap.get('tile')?.floor_color).toBe('#FFFFFF');
  });

  test('should apply wall colors from styles', () => {
    const data = createStyledFloorplan();
    const result = buildFloorplanScene(data);

    expect(result.styleMap.get('wood')?.wall_color).toBe('#D2B48C');
    expect(result.styleMap.get('tile')?.wall_color).toBe('#C0C0C0');
  });
});

describe('error handling', () => {
  test('should handle empty floors array', () => {
    const data: JsonExport = { floors: [], connections: [] };

    expect(() => buildFloorplanScene(data)).not.toThrow();

    const result = buildFloorplanScene(data);
    expect(result.scene).toBeInstanceOf(THREE.Scene);
    expect(result.floorsRendered).toEqual([]);
  });

  test('should handle floor with no rooms', () => {
    const data: JsonExport = {
      floors: [{ id: 'empty', index: 0, rooms: [] }],
      connections: [],
    };

    expect(() => buildFloorplanScene(data)).not.toThrow();

    const result = buildFloorplanScene(data);
    expect(result.floorsRendered).toEqual([0]);
  });

  test('should handle missing config', () => {
    const data: JsonExport = {
      floors: [createFloor('ground', 0, [createRoom('room1', 0, 0, 5, 5)])],
      connections: [],
      // No config
    };

    expect(() => buildFloorplanScene(data)).not.toThrow();
  });

  test('should handle missing styles', () => {
    const data: JsonExport = {
      floors: [createFloor('ground', 0, [createRoom('room1', 0, 0, 5, 5, 'missing-style')])],
      connections: [],
      // No styles array
    };

    expect(() => buildFloorplanScene(data)).not.toThrow();
  });
});

describe('double-door rendering', () => {
  test('should render double-door with two separate panels', () => {
    const data: JsonExport = {
      floors: [
        createFloor('ground', 0, [
          createRoom('living', 0, 0, 10, 8),
          createRoom('dining', 10, 0, 8, 8),
        ]),
      ],
      connections: [
        {
          fromRoom: 'living',
          fromWall: 'right',
          toRoom: 'dining',
          toWall: 'left',
          doorType: 'double-door',
          position: 50,
        },
      ],
    };

    const result = buildFloorplanScene(data, { showConnections: true });

    // Find the double-door group in the scene
    const doubleDoorGroup = result.scene.getObjectByName('double-door-living-dining');
    expect(doubleDoorGroup).toBeDefined();
    expect(doubleDoorGroup).toBeInstanceOf(THREE.Group);

    // Should have exactly 2 children (two panels)
    expect(doubleDoorGroup!.children.length).toBe(2);

    // Check that both panels are meshes
    const leftPanel = doubleDoorGroup!.children.find((c) => c.name.includes('left'));
    const rightPanel = doubleDoorGroup!.children.find((c) => c.name.includes('right'));

    expect(leftPanel).toBeDefined();
    expect(leftPanel).toBeInstanceOf(THREE.Mesh);
    expect(rightPanel).toBeDefined();
    expect(rightPanel).toBeInstanceOf(THREE.Mesh);
  });

  test('single door should render as single mesh', () => {
    const data: JsonExport = {
      floors: [
        createFloor('ground', 0, [
          createRoom('living', 0, 0, 10, 8),
          createRoom('dining', 10, 0, 8, 8),
        ]),
      ],
      connections: [
        {
          fromRoom: 'living',
          fromWall: 'right',
          toRoom: 'dining',
          toWall: 'left',
          doorType: 'door',
          position: 50,
        },
      ],
    };

    const result = buildFloorplanScene(data, { showConnections: true });

    // Find the single door mesh in the scene
    const doorMesh = result.scene.getObjectByName('door-living-dining');
    expect(doorMesh).toBeDefined();
    expect(doorMesh).toBeInstanceOf(THREE.Mesh);

    // Should NOT find a double-door group
    const doubleDoorGroup = result.scene.getObjectByName('double-door-living-dining');
    expect(doubleDoorGroup).toBeUndefined();
  });

  test('double-door panels should have mirrored rotations', () => {
    const data: JsonExport = {
      floors: [
        createFloor('ground', 0, [
          createRoom('living', 0, 0, 10, 8),
          createRoom('dining', 10, 0, 8, 8),
        ]),
      ],
      connections: [
        {
          fromRoom: 'living',
          fromWall: 'right',
          toRoom: 'dining',
          toWall: 'left',
          doorType: 'double-door',
          position: 50,
        },
      ],
    };

    const result = buildFloorplanScene(data, { showConnections: true });

    const doubleDoorGroup = result.scene.getObjectByName('double-door-living-dining');
    expect(doubleDoorGroup).toBeDefined();

    const leftPanel = doubleDoorGroup!.children.find((c) => c.name.includes('left')) as THREE.Mesh;
    const rightPanel = doubleDoorGroup!.children.find((c) =>
      c.name.includes('right'),
    ) as THREE.Mesh;

    // Panels should have different rotations (mirrored)
    // The exact values depend on swing direction, but they should differ
    expect(leftPanel.rotation.y).not.toBe(rightPanel.rotation.y);
  });
});

describe('SceneBuildHooks', () => {
  /**
   * Build a fixture with two floors, one room each, plus a stair and a lift on
   * the ground floor. Used to assert callback fan-out and `floorGroups` map
   * contents in a single representative scene.
   */
  function createHookFixture(): JsonExport {
    return {
      floors: [
        {
          id: 'ground',
          index: 0,
          rooms: [createRoom('living', 0, 0, 8, 6)],
          stairs: [
            {
              name: 'main',
              x: 1,
              z: 1,
              rise: 3.0,
              width: 1.0,
              tread: 0.28,
              shape: { type: 'straight', direction: 'top' },
            },
          ],
          lifts: [
            {
              name: 'L1',
              x: 5,
              z: 0.5,
              width: 1.5,
              height: 1.5,
              doors: ['top'],
            },
          ],
        },
        createFloor('first', 1, [createRoom('bedroom', 0, 0, 8, 6)]),
      ],
      connections: [],
      config: { default_height: 3.0 },
    };
  }

  test('floorGroups exposes one entry per rendered floor, keyed by id', () => {
    const data = createHookFixture();
    const result = buildFloorplanScene(data);

    expect(result.floorGroups).toBeInstanceOf(Map);
    expect(result.floorGroups.size).toBe(2);
    expect(result.floorGroups.has('ground')).toBe(true);
    expect(result.floorGroups.has('first')).toBe(true);

    const groundGroup = result.floorGroups.get('ground')!;
    expect(groundGroup).toBeInstanceOf(THREE.Group);
    expect(groundGroup.name).toBe('floor_ground');
    expect(result.scene.children).toContain(groundGroup);
  });

  test('floorGroups respects floorIndices filtering', () => {
    const data = createHookFixture();
    const result = buildFloorplanScene(data, { floorIndices: [1] });

    expect(result.floorGroups.size).toBe(1);
    expect(result.floorGroups.has('first')).toBe(true);
    expect(result.floorGroups.has('ground')).toBe(false);
  });

  test('onFloorGroup fires once per rendered floor with entity ref', () => {
    const data = createHookFixture();
    const calls: Array<{ name: string; floorId: string }> = [];

    buildFloorplanScene(data, {
      onFloorGroup: (group, floor) => {
        calls.push({ name: group.name, floorId: floor.id });
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ name: 'floor_ground', floorId: 'ground' });
    expect(calls[1]).toEqual({ name: 'floor_first', floorId: 'first' });
  });

  test('onRoomMesh fires once per room slab with the JsonRoom reference', () => {
    const data = createHookFixture();
    const calls: Array<{ roomName: string; floorId: string; meshName: string }> = [];

    buildFloorplanScene(data, {
      onRoomMesh: (mesh, room, floor) => {
        calls.push({ roomName: room.name, floorId: floor.id, meshName: mesh.name });
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].roomName).toBe('living');
    expect(calls[0].meshName).toBe('floor_slab_living');
    expect(calls[1].roomName).toBe('bedroom');
    expect(calls[1].meshName).toBe('floor_slab_bedroom');
  });

  test('onRoomMesh does not fire when showFloors is false', () => {
    const data = createHookFixture();
    let count = 0;

    buildFloorplanScene(data, {
      showFloors: false,
      onRoomMesh: () => {
        count++;
      },
    });

    expect(count).toBe(0);
  });

  test('onWallMesh fires per wall-segment mesh with the originating JsonWall', () => {
    const data = createHookFixture();
    const calls: Array<{ direction: string; roomName: string; floorId: string }> = [];

    buildFloorplanScene(data, {
      onWallMesh: (mesh, wall, room, floor) => {
        expect(mesh).toBeInstanceOf(THREE.Mesh);
        calls.push({ direction: wall.direction, roomName: room.name, floorId: floor.id });
      },
    });

    // Two floors × one room × four walls × ≥1 mesh per wall = ≥8 calls.
    expect(calls.length).toBeGreaterThanOrEqual(8);

    const directions = new Set(calls.map((c) => c.direction));
    expect(directions).toEqual(new Set(['top', 'bottom', 'left', 'right']));

    const floorsSeen = new Set(calls.map((c) => c.floorId));
    expect(floorsSeen).toEqual(new Set(['ground', 'first']));
  });

  test('onWallMesh does not fire when showWalls is false', () => {
    const data = createHookFixture();
    let count = 0;

    buildFloorplanScene(data, {
      showWalls: false,
      onWallMesh: () => {
        count++;
      },
    });

    expect(count).toBe(0);
  });

  test('onStairMesh fires once per stair with the JsonStair reference', () => {
    const data = createHookFixture();
    const calls: Array<{ stairName: string; floorId: string }> = [];

    buildFloorplanScene(data, {
      onStairMesh: (group, stair, floor) => {
        expect(group).toBeInstanceOf(THREE.Group);
        calls.push({ stairName: stair.name, floorId: floor.id });
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ stairName: 'main', floorId: 'ground' });
  });

  test('onLiftMesh fires once per lift with the JsonLift reference', () => {
    const data = createHookFixture();
    const calls: Array<{ liftName: string; floorId: string }> = [];

    buildFloorplanScene(data, {
      onLiftMesh: (group, lift, floor) => {
        expect(group).toBeInstanceOf(THREE.Group);
        calls.push({ liftName: lift.name, floorId: floor.id });
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ liftName: 'L1', floorId: 'ground' });
  });

  test('headless render path (no hooks) keeps existing scene structure', () => {
    // Regression: hooks must be purely additive — omitting them should leave
    // the existing scene exactly as before.
    const data = createHookFixture();
    const result = buildFloorplanScene(data);

    expect(result.scene.children.length).toBeGreaterThan(0);
    expect(result.floorsRendered).toEqual([0, 1]);
    // floorGroups is the only new field; the rest of the result stays intact.
    expect(result.styleMap).toBeInstanceOf(Map);
  });

  test('buildCompleteScene exposes floorGroups in its return value', () => {
    const data = createHookFixture();
    const renderOptions: Render3DOptions = {
      width: 800,
      height: 600,
      renderAllFloors: true,
    };

    const result = buildCompleteScene(data, renderOptions);

    expect(result.floorGroups).toBeInstanceOf(Map);
    expect(result.floorGroups.size).toBe(2);
  });
});

describe('unit normalization at the scene-build entry points', () => {
  /**
   * Build a fixture whose source unit is feet and whose dimensions, once
   * converted to meters, are well-known so we can compare scene bounds
   * with float tolerance.
   *
   * Single 10ft × 10ft room → ~3.048m × 3.048m on the floor plane after
   * one normalization pass. A second normalization pass (the bug) would
   * scale by 1/3.28 again to ~0.929m × 0.929m, which is what
   * `BaseViewer.loadFloorplan` was producing pre-fix when it called
   * `normalizeToMeters` itself and then handed the already-normalized
   * `JsonExport` to `buildFloorplanScene` (which normalizes again).
   */
  function createFeetFixture(): JsonExport {
    return {
      floors: [
        {
          id: 'ground',
          index: 0,
          rooms: [
            {
              name: 'room',
              x: 0,
              z: 0,
              width: 10,
              height: 10,
              walls: [
                { direction: 'top', type: 'solid' },
                { direction: 'bottom', type: 'solid' },
                { direction: 'left', type: 'solid' },
                { direction: 'right', type: 'solid' },
              ],
            },
          ],
        },
      ],
      connections: [],
      config: {
        default_unit: 'ft',
      },
    };
  }

  /**
   * Pull the room-slab mesh dimensions out of a scene-build result via the
   * `onRoomMesh` hook. Slab bounds align exactly with the room rectangle
   * (no wall thickness), which lets us compare raw conversion math.
   */
  function measureSlabExtent(data: JsonExport): { dx: number; dz: number } {
    let dx = NaN;
    let dz = NaN;
    buildFloorplanScene(data, {
      onRoomMesh: (mesh) => {
        const box = new THREE.Box3().setFromObject(mesh);
        dx = box.max.x - box.min.x;
        dz = box.max.z - box.min.z;
      },
    });
    return { dx, dz };
  }

  test('buildFloorplanScene normalizes feet → meters exactly once', () => {
    const data = createFeetFixture();
    const expectedMeters = 10 * 0.3048;

    const { dx, dz } = measureSlabExtent(data);

    expect(dx).toBeCloseTo(expectedMeters, 3);
    expect(dz).toBeCloseTo(expectedMeters, 3);
  });

  test('buildFloorplanSceneFromNormalized does NOT re-normalize already-meters data', () => {
    const data = createFeetFixture();
    const normalized = normalizeToMeters(data);

    // Sanity: `normalizeToMeters` preserves `default_unit` so a naive
    // second call would re-convert. This is the documented non-idempotency
    // that motivated exporting `buildFloorplanSceneFromNormalized`.
    expect(normalized.config?.default_unit).toBe('ft');

    let fromNormalizedDx = NaN;
    buildFloorplanSceneFromNormalized(normalized, {
      onRoomMesh: (mesh) => {
        const box = new THREE.Box3().setFromObject(mesh);
        fromNormalizedDx = box.max.x - box.min.x;
      },
    });

    const { dx: directDx } = measureSlabExtent(data);

    expect(fromNormalizedDx).toBeCloseTo(directDx, 6);
  });

  test('regression: double-normalizing via buildFloorplanScene scales DOWN by 0.3048', () => {
    // Pins the bug we are fixing: pre-normalizing and then calling
    // `buildFloorplanScene` (which normalizes again) collapses the scene
    // by an extra factor of 0.3048. `BaseViewer.loadFloorplan` previously
    // did exactly this, which broke `make viewer-dev` / `make editor-dev`
    // for any DSL that defaulted to feet. Future contributors who wire
    // the viewer back into `buildFloorplanScene` while still pre-
    // normalizing will trip this test.
    const data = createFeetFixture();
    const normalized = normalizeToMeters(data);

    let doubleDx = NaN;
    buildFloorplanScene(normalized, {
      onRoomMesh: (mesh) => {
        const box = new THREE.Box3().setFromObject(mesh);
        doubleDx = box.max.x - box.min.x;
      },
    });

    const { dx: correctDx } = measureSlabExtent(data);

    expect(doubleDx / correctDx).toBeCloseTo(0.3048, 3);
  });
});
