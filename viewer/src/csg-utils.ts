/**
 * CSG (Constructive Solid Geometry) utilities for material preservation
 * 
 * After CSG operations, Three.js geometry material groups are destroyed.
 * These utilities help reassign materials based on face normals.
 */

import * as THREE from 'three';

/**
 * BoxGeometry face indices following Three.js conventions:
 *   0: +X (right face)
 *   1: -X (left face)
 *   2: +Y (top face)
 *   3: -Y (bottom face)
 *   4: +Z (front face)
 *   5: -Z (back face)
 */
export const FACE_INDICES = {
  POSITIVE_X: 0,
  NEGATIVE_X: 1,
  POSITIVE_Y: 2,
  NEGATIVE_Y: 3,
  POSITIVE_Z: 4,
  NEGATIVE_Z: 5,
} as const;

/**
 * Map a face normal to a material index following BoxGeometry conventions.
 * 
 * Determines the dominant axis of the normal vector and returns the
 * corresponding material index (0-5).
 * 
 * @param nx Normal X component
 * @param ny Normal Y component  
 * @param nz Normal Z component
 * @param materialCount Number of materials in the array (returns 0 if <= 1)
 * @returns Material index (0-5 for 6-material array, 0 for single material)
 */
export function normalToMaterialIndex(
  nx: number, 
  ny: number, 
  nz: number, 
  materialCount: number = 6
): number {
  // For single material, always return 0
  if (materialCount <= 1) return 0;
  
  const absX = Math.abs(nx);
  const absY = Math.abs(ny);
  const absZ = Math.abs(nz);
  
  // Determine dominant axis and direction
  if (absX >= absY && absX >= absZ) {
    // X-dominant: right (+X) or left (-X)
    return nx > 0 ? FACE_INDICES.POSITIVE_X : FACE_INDICES.NEGATIVE_X;
  } else if (absY >= absZ) {
    // Y-dominant: top (+Y) or bottom (-Y)
    return ny > 0 ? FACE_INDICES.POSITIVE_Y : FACE_INDICES.NEGATIVE_Y;
  } else {
    // Z-dominant: front (+Z) or back (-Z)
    return nz > 0 ? FACE_INDICES.POSITIVE_Z : FACE_INDICES.NEGATIVE_Z;
  }
}

/**
 * Reassign material groups based on face normals after CSG operations.
 * 
 * CSG operations destroy the original material group assignments.
 * This function analyzes each face's normal and assigns it to the
 * appropriate material index following BoxGeometry conventions.
 * 
 * Consecutive faces with the same material are merged into single groups
 * to optimize rendering.
 * 
 * @param geometry The BufferGeometry to reassign materials for
 * @param materialCount Number of materials in the material array
 */
export function reassignMaterialsByNormal(
  geometry: THREE.BufferGeometry,
  materialCount: number
): void {
  const normals = geometry.attributes.normal;
  const index = geometry.index;
  
  if (!normals) return;
  
  // Clear existing groups
  geometry.clearGroups();
  
  // Determine face count based on indexed vs non-indexed geometry
  const vertexCount = index ? index.count : normals.count;
  const faceCount = Math.floor(vertexCount / 3);
  
  if (faceCount === 0) return;
  
  // Track current group for optimization (merge consecutive faces with same material)
  let currentGroupStart = 0;
  let currentGroupMaterial = -1;
  
  for (let face = 0; face < faceCount; face++) {
    // Get the first vertex index of this face
    const vertexIndex = index ? index.getX(face * 3) : face * 3;
    
    // Get normal components
    const nx = normals.getX(vertexIndex);
    const ny = normals.getY(vertexIndex);
    const nz = normals.getZ(vertexIndex);
    
    // Map normal to material index
    const materialIndex = normalToMaterialIndex(nx, ny, nz, materialCount);
    
    // Optimize by merging consecutive faces with same material
    if (materialIndex !== currentGroupMaterial) {
      // Close previous group if it exists
      if (currentGroupMaterial !== -1) {
        const groupVertexCount = (face * 3) - currentGroupStart;
        geometry.addGroup(currentGroupStart, groupVertexCount, currentGroupMaterial);
      }
      // Start new group
      currentGroupStart = face * 3;
      currentGroupMaterial = materialIndex;
    }
  }
  
  // Close the final group
  if (currentGroupMaterial !== -1) {
    const groupVertexCount = (faceCount * 3) - currentGroupStart;
    geometry.addGroup(currentGroupStart, groupVertexCount, currentGroupMaterial);
  }
}

/**
 * Get the expected material index for a wall face based on wall direction.
 * 
 * @param wallDirection The direction of the wall ('top', 'bottom', 'left', 'right')
 * @param isInterior Whether this is the interior face (facing adjacent room)
 * @returns The material index for this face
 */
export function getWallFaceMaterialIndex(
  wallDirection: 'top' | 'bottom' | 'left' | 'right',
  isInterior: boolean
): number {
  // For walls, the interior face is the one facing the adjacent room
  // The exterior face uses the owner's material
  switch (wallDirection) {
    case 'top':
      // Top wall: -Z face is interior (toward adjacent), +Z is exterior
      return isInterior ? FACE_INDICES.NEGATIVE_Z : FACE_INDICES.POSITIVE_Z;
    case 'bottom':
      // Bottom wall: +Z face is interior, -Z is exterior
      return isInterior ? FACE_INDICES.POSITIVE_Z : FACE_INDICES.NEGATIVE_Z;
    case 'left':
      // Left wall: -X face is interior, +X is exterior
      return isInterior ? FACE_INDICES.NEGATIVE_X : FACE_INDICES.POSITIVE_X;
    case 'right':
      // Right wall: +X face is interior, -X is exterior
      return isInterior ? FACE_INDICES.POSITIVE_X : FACE_INDICES.NEGATIVE_X;
  }
}

