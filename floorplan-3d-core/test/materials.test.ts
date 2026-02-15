/**
 * Tests for materials module
 */

import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { COLORS, COLORS_DARK, MATERIAL_PROPERTIES } from '../src/constants';
import { MaterialFactory, type MaterialStyle, parseHexColor } from '../src/materials';

describe('parseHexColor', () => {
  test('should parse hex color without hash', () => {
    expect(parseHexColor('ff0000')).toBe(0xff0000);
    expect(parseHexColor('00ff00')).toBe(0x00ff00);
    expect(parseHexColor('0000ff')).toBe(0x0000ff);
  });

  test('should parse hex color with hash', () => {
    expect(parseHexColor('#ff0000')).toBe(0xff0000);
    expect(parseHexColor('#ffffff')).toBe(0xffffff);
    expect(parseHexColor('#000000')).toBe(0x000000);
  });

  test('should handle lowercase and uppercase', () => {
    expect(parseHexColor('AABBCC')).toBe(0xaabbcc);
    expect(parseHexColor('#AABBCC')).toBe(0xaabbcc);
  });
});

describe('MaterialFactory', () => {
  describe('createFloorMaterial', () => {
    test('should create floor material with default colors', () => {
      const material = MaterialFactory.createFloorMaterial();

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(COLORS.FLOOR);
      expect(material.roughness).toBe(MATERIAL_PROPERTIES.FLOOR.roughness);
      expect(material.metalness).toBe(MATERIAL_PROPERTIES.FLOOR.metalness);
    });

    test('should use style color when provided', () => {
      const style: MaterialStyle = { floor_color: '#ff0000' };
      const material = MaterialFactory.createFloorMaterial(style);

      expect(material.color.getHex()).toBe(0xff0000);
    });

    test('should use dark theme colors', () => {
      const material = MaterialFactory.createFloorMaterial(undefined, 'dark');

      expect(material.color.getHex()).toBe(COLORS_DARK.FLOOR);
    });

    test('should apply custom roughness and metalness', () => {
      const style: MaterialStyle = { roughness: 0.3, metalness: 0.7 };
      const material = MaterialFactory.createFloorMaterial(style);

      expect(material.roughness).toBe(0.3);
      expect(material.metalness).toBe(0.7);
    });
  });

  describe('createWallMaterial', () => {
    test('should create wall material with default colors', () => {
      const material = MaterialFactory.createWallMaterial();

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(COLORS.WALL);
    });

    test('should use style wall_color when provided', () => {
      const style: MaterialStyle = { wall_color: '#00ff00' };
      const material = MaterialFactory.createWallMaterial(style);

      expect(material.color.getHex()).toBe(0x00ff00);
    });

    test('should use dark theme for wall', () => {
      const material = MaterialFactory.createWallMaterial(undefined, 'dark');

      expect(material.color.getHex()).toBe(COLORS_DARK.WALL);
    });
  });

  describe('createWindowMaterial', () => {
    test('should create transparent window material', () => {
      const material = MaterialFactory.createWindowMaterial();

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBe(MATERIAL_PROPERTIES.WINDOW.opacity);
      expect(material.color.getHex()).toBe(COLORS.WINDOW);
    });

    test('should use dark theme window color', () => {
      const material = MaterialFactory.createWindowMaterial('dark');

      expect(material.color.getHex()).toBe(COLORS_DARK.WINDOW);
    });
  });

  describe('createDoorMaterial', () => {
    test('should create door material with wood-like properties', () => {
      const material = MaterialFactory.createDoorMaterial();

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(COLORS.DOOR);
      expect(material.roughness).toBe(MATERIAL_PROPERTIES.DOOR.roughness);
    });
  });

  describe('createStairMaterial', () => {
    test('should create stair material with concrete properties', () => {
      const material = MaterialFactory.createStairMaterial();

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(MATERIAL_PROPERTIES.STAIR.color);
      expect(material.roughness).toBe(MATERIAL_PROPERTIES.STAIR.roughness);
    });
  });

  describe('createLiftMaterial', () => {
    test('should create semi-transparent lift material', () => {
      const material = MaterialFactory.createLiftMaterial();

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBe(MATERIAL_PROPERTIES.LIFT.opacity);
    });
  });

  describe('createMaterialSet', () => {
    test('should create complete material set', () => {
      const set = MaterialFactory.createMaterialSet();

      expect(set.floor).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(set.wall).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(set.window).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(set.door).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(set.stair).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(set.lift).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    test('should apply style to floor and wall', () => {
      const style: MaterialStyle = {
        floor_color: '#aabbcc',
        wall_color: '#112233',
      };
      const set = MaterialFactory.createMaterialSet(style);

      expect(set.floor.color.getHex()).toBe(0xaabbcc);
      expect(set.wall.color.getHex()).toBe(0x112233);
    });

    test('should apply theme to all materials', () => {
      const set = MaterialFactory.createMaterialSet(undefined, 'dark');

      expect(set.floor.color.getHex()).toBe(COLORS_DARK.FLOOR);
      expect(set.wall.color.getHex()).toBe(COLORS_DARK.WALL);
      expect(set.window.color.getHex()).toBe(COLORS_DARK.WINDOW);
      expect(set.door.color.getHex()).toBe(COLORS_DARK.DOOR);
    });
  });

  describe('jsonStyleToMaterialStyle', () => {
    test('should convert JsonStyle to MaterialStyle', () => {
      const jsonStyle = {
        name: 'my-style',
        floor_color: '#ff0000',
        wall_color: '#00ff00',
        floor_texture: '/textures/floor.png',
        wall_texture: '/textures/wall.png',
        roughness: 0.5,
        metalness: 0.2,
      };

      const materialStyle = MaterialFactory.jsonStyleToMaterialStyle(jsonStyle);

      expect(materialStyle.floor_color).toBe('#ff0000');
      expect(materialStyle.wall_color).toBe('#00ff00');
      expect(materialStyle.floor_texture).toBe('/textures/floor.png');
      expect(materialStyle.wall_texture).toBe('/textures/wall.png');
      expect(materialStyle.roughness).toBe(0.5);
      expect(materialStyle.metalness).toBe(0.2);
    });

    test('should handle partial JsonStyle', () => {
      const jsonStyle = {
        name: 'minimal-style',
        floor_color: '#aabbcc',
      };

      const materialStyle = MaterialFactory.jsonStyleToMaterialStyle(jsonStyle);

      expect(materialStyle.floor_color).toBe('#aabbcc');
      expect(materialStyle.wall_color).toBeUndefined();
      expect(materialStyle.roughness).toBeUndefined();
    });
  });

  describe('createPerFaceWallMaterials', () => {
    test('should create 6 materials for box geometry', () => {
      const materials = MaterialFactory.createPerFaceWallMaterials(undefined, undefined, 'top');

      expect(materials).toHaveLength(6);
      materials.forEach((mat) => {
        expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
      });
    });

    test('should apply adjacent style to correct face for top wall', () => {
      const ownerStyle: MaterialStyle = { wall_color: '#ff0000' };
      const adjStyle: MaterialStyle = { wall_color: '#00ff00' };

      const materials = MaterialFactory.createPerFaceWallMaterials(ownerStyle, adjStyle, 'top');

      // Top wall: -Z face (index 5) should have adjacent color
      expect(materials[5].color.getHex()).toBe(0x00ff00);
      // Other faces should have owner color
      expect(materials[0].color.getHex()).toBe(0xff0000);
    });

    test('should apply adjacent style to correct face for bottom wall', () => {
      const ownerStyle: MaterialStyle = { wall_color: '#ff0000' };
      const adjStyle: MaterialStyle = { wall_color: '#0000ff' };

      const materials = MaterialFactory.createPerFaceWallMaterials(ownerStyle, adjStyle, 'bottom');

      // Bottom wall: +Z face (index 4) should have adjacent color
      expect(materials[4].color.getHex()).toBe(0x0000ff);
    });

    test('should apply adjacent style to correct face for left wall', () => {
      const ownerStyle: MaterialStyle = { wall_color: '#ff0000' };
      const adjStyle: MaterialStyle = { wall_color: '#ffff00' };

      const materials = MaterialFactory.createPerFaceWallMaterials(ownerStyle, adjStyle, 'left');

      // Left wall: -X face (index 1) should have adjacent color
      expect(materials[1].color.getHex()).toBe(0xffff00);
    });

    test('should apply adjacent style to correct face for right wall', () => {
      const ownerStyle: MaterialStyle = { wall_color: '#ff0000' };
      const adjStyle: MaterialStyle = { wall_color: '#ff00ff' };

      const materials = MaterialFactory.createPerFaceWallMaterials(ownerStyle, adjStyle, 'right');

      // Right wall: +X face (index 0) should have adjacent color
      expect(materials[0].color.getHex()).toBe(0xff00ff);
    });

    test('should use owner material when adjacent style is undefined', () => {
      const ownerStyle: MaterialStyle = { wall_color: '#aabbcc' };

      const materials = MaterialFactory.createPerFaceWallMaterials(ownerStyle, undefined, 'top');

      // All faces should have owner color (no different adjacent)
      materials.forEach((mat) => {
        expect(mat.color.getHex()).toBe(0xaabbcc);
      });
    });
  });
});
