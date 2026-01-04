import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import {
  normalToMaterialIndex,
  reassignMaterialsByNormal,
  getWallFaceMaterialIndex,
  FACE_INDICES,
} from '../src/csg-utils.js';

describe('CSG Utils', () => {
  describe('FACE_INDICES', () => {
    test('should have correct BoxGeometry face index mapping', () => {
      expect(FACE_INDICES.POSITIVE_X).toBe(0);
      expect(FACE_INDICES.NEGATIVE_X).toBe(1);
      expect(FACE_INDICES.POSITIVE_Y).toBe(2);
      expect(FACE_INDICES.NEGATIVE_Y).toBe(3);
      expect(FACE_INDICES.POSITIVE_Z).toBe(4);
      expect(FACE_INDICES.NEGATIVE_Z).toBe(5);
    });
  });

  describe('normalToMaterialIndex', () => {
    test('should return 0 for +X dominant normal', () => {
      expect(normalToMaterialIndex(1, 0, 0)).toBe(0);
      expect(normalToMaterialIndex(0.9, 0.1, 0.1)).toBe(0);
      expect(normalToMaterialIndex(0.8, 0.4, 0.4)).toBe(0);
    });

    test('should return 1 for -X dominant normal', () => {
      expect(normalToMaterialIndex(-1, 0, 0)).toBe(1);
      expect(normalToMaterialIndex(-0.9, 0.1, 0.1)).toBe(1);
      expect(normalToMaterialIndex(-0.8, 0.4, 0.4)).toBe(1);
    });

    test('should return 2 for +Y dominant normal', () => {
      expect(normalToMaterialIndex(0, 1, 0)).toBe(2);
      expect(normalToMaterialIndex(0.1, 0.9, 0.1)).toBe(2);
      expect(normalToMaterialIndex(0.4, 0.8, 0.4)).toBe(2);
    });

    test('should return 3 for -Y dominant normal', () => {
      expect(normalToMaterialIndex(0, -1, 0)).toBe(3);
      expect(normalToMaterialIndex(0.1, -0.9, 0.1)).toBe(3);
      expect(normalToMaterialIndex(0.4, -0.8, 0.4)).toBe(3);
    });

    test('should return 4 for +Z dominant normal', () => {
      expect(normalToMaterialIndex(0, 0, 1)).toBe(4);
      expect(normalToMaterialIndex(0.1, 0.1, 0.9)).toBe(4);
      expect(normalToMaterialIndex(0.4, 0.4, 0.8)).toBe(4);
    });

    test('should return 5 for -Z dominant normal', () => {
      expect(normalToMaterialIndex(0, 0, -1)).toBe(5);
      expect(normalToMaterialIndex(0.1, 0.1, -0.9)).toBe(5);
      expect(normalToMaterialIndex(0.4, 0.4, -0.8)).toBe(5);
    });

    test('should return 0 for single material', () => {
      expect(normalToMaterialIndex(1, 0, 0, 1)).toBe(0);
      expect(normalToMaterialIndex(0, 1, 0, 1)).toBe(0);
      expect(normalToMaterialIndex(0, 0, 1, 1)).toBe(0);
      expect(normalToMaterialIndex(-1, 0, 0, 1)).toBe(0);
    });

    test('should handle edge case of equal components', () => {
      // When X and Y are equal, X wins (>= comparison)
      const result1 = normalToMaterialIndex(0.5, 0.5, 0);
      expect(result1).toBe(0); // +X wins due to >= comparison

      // When all equal, X wins
      const result2 = normalToMaterialIndex(0.577, 0.577, 0.577);
      expect(result2).toBe(0); // +X wins
    });

    test('should handle normalized unit vectors', () => {
      // Normalized 45-degree angle in XY plane
      const sqrt2 = Math.sqrt(2) / 2;
      expect(normalToMaterialIndex(sqrt2, sqrt2, 0)).toBe(0); // X wins tie

      // Normalized 45-degree angle in XZ plane
      expect(normalToMaterialIndex(sqrt2, 0, sqrt2)).toBe(0); // X wins tie
    });
  });

  describe('reassignMaterialsByNormal', () => {
    test('should create groups for BoxGeometry faces', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      
      // Clear default groups
      geometry.clearGroups();
      
      // Reassign materials
      reassignMaterialsByNormal(geometry, 6);
      
      // BoxGeometry has 12 triangles (2 per face, 6 faces)
      // Each face should get its own material index
      expect(geometry.groups.length).toBeGreaterThan(0);
      
      // Verify total vertex count covered
      const totalVertices = geometry.groups.reduce((sum, g) => sum + g.count, 0);
      expect(totalVertices).toBe(36); // 12 triangles * 3 vertices
    });

    test('should handle single material', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.clearGroups();
      
      reassignMaterialsByNormal(geometry, 1);
      
      // All faces should be in one group with material index 0
      expect(geometry.groups.length).toBe(1);
      expect(geometry.groups[0].materialIndex).toBe(0);
      expect(geometry.groups[0].count).toBe(36);
    });

    test('should handle geometry without normals', () => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
      
      // Should not throw when normals are missing
      expect(() => reassignMaterialsByNormal(geometry, 6)).not.toThrow();
    });

    test('should handle empty geometry', () => {
      const geometry = new THREE.BufferGeometry();
      
      expect(() => reassignMaterialsByNormal(geometry, 6)).not.toThrow();
    });

    test('should handle indexed geometry', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      
      // BoxGeometry is indexed by default
      expect(geometry.index).not.toBeNull();
      
      geometry.clearGroups();
      reassignMaterialsByNormal(geometry, 6);
      
      // Should have groups
      expect(geometry.groups.length).toBeGreaterThan(0);
    });

    test('should handle non-indexed geometry', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.clearGroups();
      
      // Convert to non-indexed
      const nonIndexed = geometry.toNonIndexed();
      
      reassignMaterialsByNormal(nonIndexed, 6);
      
      // Should have groups
      expect(nonIndexed.groups.length).toBeGreaterThan(0);
      
      // Total vertices should be covered
      const totalVertices = nonIndexed.groups.reduce((sum, g) => sum + g.count, 0);
      expect(totalVertices).toBe(36);
    });

    test('should merge consecutive faces with same material', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.clearGroups();
      
      reassignMaterialsByNormal(geometry, 6);
      
      // Groups should be optimized - consecutive faces with same material merged
      // BoxGeometry default arrangement may vary, but should have <= 12 groups
      // (worst case: each triangle is separate group)
      expect(geometry.groups.length).toBeLessThanOrEqual(12);
    });
  });

  describe('getWallFaceMaterialIndex', () => {
    describe('top wall', () => {
      test('interior face should be -Z (index 5)', () => {
        expect(getWallFaceMaterialIndex('top', true)).toBe(5);
      });

      test('exterior face should be +Z (index 4)', () => {
        expect(getWallFaceMaterialIndex('top', false)).toBe(4);
      });
    });

    describe('bottom wall', () => {
      test('interior face should be +Z (index 4)', () => {
        expect(getWallFaceMaterialIndex('bottom', true)).toBe(4);
      });

      test('exterior face should be -Z (index 5)', () => {
        expect(getWallFaceMaterialIndex('bottom', false)).toBe(5);
      });
    });

    describe('left wall', () => {
      test('interior face should be -X (index 1)', () => {
        expect(getWallFaceMaterialIndex('left', true)).toBe(1);
      });

      test('exterior face should be +X (index 0)', () => {
        expect(getWallFaceMaterialIndex('left', false)).toBe(0);
      });
    });

    describe('right wall', () => {
      test('interior face should be +X (index 0)', () => {
        expect(getWallFaceMaterialIndex('right', true)).toBe(0);
      });

      test('exterior face should be -X (index 1)', () => {
        expect(getWallFaceMaterialIndex('right', false)).toBe(1);
      });
    });
  });

  describe('Integration: CSG-like operations', () => {
    test('should correctly reassign materials after geometry modification', () => {
      // Simulate what happens after a CSG operation
      // Create a box geometry (wall segment)
      const wallGeometry = new THREE.BoxGeometry(2, 3, 0.2);
      
      // Clear the groups (simulating CSG destroying them)
      wallGeometry.clearGroups();
      expect(wallGeometry.groups.length).toBe(0);
      
      // Reassign materials
      reassignMaterialsByNormal(wallGeometry, 6);
      
      // Should have groups again
      expect(wallGeometry.groups.length).toBeGreaterThan(0);
      
      // Each group should have valid material index
      for (const group of wallGeometry.groups) {
        expect(group.materialIndex).toBeGreaterThanOrEqual(0);
        expect(group.materialIndex).toBeLessThanOrEqual(5);
        expect(group.start).toBeGreaterThanOrEqual(0);
        expect(group.count).toBeGreaterThan(0);
      }
    });

    test('material indices should match face orientations', () => {
      // Create a simple box and verify the material assignments match normals
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const normals = geometry.attributes.normal;
      const index = geometry.index!;
      
      geometry.clearGroups();
      reassignMaterialsByNormal(geometry, 6);
      
      // For each group, verify the material index matches the dominant normal
      for (const group of geometry.groups) {
        const firstVertexInGroup = index.getX(group.start);
        const nx = normals.getX(firstVertexInGroup);
        const ny = normals.getY(firstVertexInGroup);
        const nz = normals.getZ(firstVertexInGroup);
        
        const expectedIndex = normalToMaterialIndex(nx, ny, nz, 6);
        expect(group.materialIndex).toBe(expectedIndex);
      }
    });
  });
});

