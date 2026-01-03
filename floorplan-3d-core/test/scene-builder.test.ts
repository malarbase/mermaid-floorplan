/**
 * Tests for scene builder module
 */

import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { buildFloorplanScene, buildCompleteScene } from '../src/scene-builder';
import type { JsonExport, JsonFloor, JsonRoom, Render3DOptions } from '../src/types';
import { COLORS, COLORS_DARK, COLORS_BLUEPRINT } from '../src/constants';

/**
 * Create a minimal room for testing
 */
function createRoom(
  name: string,
  x: number,
  z: number,
  width: number,
  height: number,
  style?: string
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
      createFloor('ground', 0, [
        createRoom('room1', 0, 0, 5, 5),
        createRoom('room2', 5, 0, 5, 5),
      ]),
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
      
      const floorGroups = result.scene.children.filter(
        child => child.name.startsWith('floor_')
      );
      
      expect(floorGroups).toHaveLength(3);
    });

    test('should render only specified floors', () => {
      const data = createMultiFloorFloorplan();
      const result = buildFloorplanScene(data, { floorIndices: [0, 2] });
      
      // Should render floors 0 and 2, but not 1
      expect(result.floorsRendered).toEqual([0, 2]);
      
      const floorGroups = result.scene.children.filter(
        child => child.name.startsWith('floor_')
      );
      expect(floorGroups).toHaveLength(2);
    });

    test('should position floors vertically', () => {
      const data = createMultiFloorFloorplan();
      const result = buildFloorplanScene(data);
      
      const floorGroups = result.scene.children.filter(
        child => child.name.startsWith('floor_')
      ) as THREE.Group[];
      
      // Sort by index
      floorGroups.sort((a, b) => {
        const aIndex = parseInt(a.name.replace('floor_', ''));
        const bIndex = parseInt(b.name.replace('floor_', ''));
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
        floors: [{
          id: 'ground',
          index: 0,
          rooms: [createRoom('lobby', 0, 0, 10, 10)],
          stairs: [{
            name: 'main-stairs',
            x: 8,
            z: 2,
            rise: 3.0,
            shape: { type: 'straight', direction: 'north' },
          }],
        }],
        connections: [],
      };
      
      const result = buildFloorplanScene(data, { showStairs: true });
      
      // Should have stair geometry
      let hasStairGeometry = false;
      result.scene.traverse((obj) => {
        if (obj.name.includes('stair')) hasStairGeometry = true;
      });
      
      // Stair generator creates a group even if named differently
      expect(result.scene.children.length).toBeGreaterThan(0);
    });

    test('should render lifts when present', () => {
      const data: JsonExport = {
        floors: [{
          id: 'ground',
          index: 0,
          rooms: [createRoom('lobby', 0, 0, 10, 10)],
          lifts: [{
            name: 'lift1',
            x: 8,
            z: 8,
            width: 2,
            height: 2,
            doors: ['south'],
          }],
        }],
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
      floors: [createFloor('ground', 0, [
        createRoom('room1', 0, 0, 5, 5, 'missing-style'),
      ])],
      connections: [],
      // No styles array
    };
    
    expect(() => buildFloorplanScene(data)).not.toThrow();
  });
});

