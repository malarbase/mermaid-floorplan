/**
 * CSG (Constructive Solid Geometry) utilities for material preservation
 *
 * After CSG operations, Three.js geometry material groups are destroyed.
 * These utilities help reassign materials based on face normals.
 *
 * Note: CSG operations require the optional `three-bvh-csg` dependency.
 * These utilities work with any BufferGeometry regardless of how it was created.
 */

import type * as THREE from 'three';

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
  materialCount: number = 6,
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
  materialCount: number,
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
        const groupVertexCount = face * 3 - currentGroupStart;
        geometry.addGroup(currentGroupStart, groupVertexCount, currentGroupMaterial);
      }
      // Start new group
      currentGroupStart = face * 3;
      currentGroupMaterial = materialIndex;
    }
  }

  // Close the final group
  if (currentGroupMaterial !== -1) {
    const groupVertexCount = faceCount * 3 - currentGroupStart;
    geometry.addGroup(currentGroupStart, groupVertexCount, currentGroupMaterial);
  }
}

/**
 * Material indices used by `reassignNormalsToEdgeMaterials` and
 * `MaterialFactory.createPerEdgeWallMaterials` — see `materials.ts` for the
 * canonical definition of the 4-slot layout.
 */
export const EDGE_MATERIAL_INDICES = {
  TOP: 0,
  BOTTOM: 1,
  SIDE_LEFT: 2,
  SIDE_RIGHT: 3,
} as const;

/**
 * Per-edge wall normal classifier used by the wall-network mesh builder.
 *
 * Unlike `reassignMaterialsByNormal` (which assumes axis-aligned BoxGeometry
 * faces), an edge mesh can be at any rotation around world Y because edges
 * follow the canonical `nodeA → nodeB` direction in world XZ. The classifier
 * maps each face normal `n` into one of four material slots:
 *
 *   - top    (0): `n.y > 0` and `|n.y|` is the dominant component
 *   - bottom (1): `n.y < 0` and `|n.y|` is the dominant component
 *   - left   (2): horizontal normal whose XZ component points to the LEFT of
 *                 the canonical edge direction (positive dot with
 *                 `perpEdge = (-edgeDirXZ.z, 0, edgeDirXZ.x)`)
 *   - right  (3): horizontal normal pointing to the RIGHT (negative dot)
 *
 * The classifier consumes the geometry's normals AS-IS — it does not transform
 * them. Caller responsibility:
 *
 *   - For a post-CSG geometry (whose vertices live in WORLD space because
 *     `three-bvh-csg`'s `Evaluator.evaluate` returns world-space output), pass
 *     `edgeDirXZ` as the world-space canonical edge direction.
 *   - For a no-hole pass-through geometry (still in MESH-LOCAL space, with the
 *     canonical edge along local +X by construction in `emitEdgeMesh`), pass
 *     `edgeDirXZ = (1, 0, 0)`.
 *
 * Tie-breaking: the dead-zone where `n · perpEdge ≈ 0` (the tiny short faces
 * at each mitred edge end) is assigned to `SIDE_LEFT` so the result is
 * deterministic and so a single-style edge looks uniform.
 *
 * Mirrors the structure of `reassignMaterialsByNormal` (consecutive-face
 * group merging) so the resulting `BufferGeometry.groups` array is minimal.
 */
export function reassignNormalsToEdgeMaterials(
  geometry: THREE.BufferGeometry,
  edgeDirXZ: THREE.Vector3,
): void {
  const normals = geometry.attributes.normal;
  const index = geometry.index;
  if (!normals) return;

  // perpEdge = 90° CCW rotation of edgeDirXZ in the XZ plane (Y-up).
  // Pre-normalize to avoid sensitivity to caller-supplied magnitudes.
  const dx = edgeDirXZ.x;
  const dz = edgeDirXZ.z;
  const dlen = Math.hypot(dx, dz) || 1;
  const ndx = dx / dlen;
  const ndz = dz / dlen;
  const perpX = -ndz;
  const perpZ = ndx;

  geometry.clearGroups();

  const vertexCount = index ? index.count : normals.count;
  const faceCount = Math.floor(vertexCount / 3);
  if (faceCount === 0) return;

  let currentGroupStart = 0;
  let currentGroupMaterial = -1;

  for (let face = 0; face < faceCount; face++) {
    const vertexIndex = index ? index.getX(face * 3) : face * 3;
    const nx = normals.getX(vertexIndex);
    const ny = normals.getY(vertexIndex);
    const nz = normals.getZ(vertexIndex);

    let materialIndex: number;
    if (Math.abs(ny) > 0.5) {
      materialIndex = ny > 0 ? EDGE_MATERIAL_INDICES.TOP : EDGE_MATERIAL_INDICES.BOTTOM;
    } else {
      const perpDot = nx * perpX + nz * perpZ;
      // Ties (perpDot === 0) deterministically resolve to SIDE_LEFT.
      materialIndex =
        perpDot >= 0 ? EDGE_MATERIAL_INDICES.SIDE_LEFT : EDGE_MATERIAL_INDICES.SIDE_RIGHT;
    }

    if (materialIndex !== currentGroupMaterial) {
      if (currentGroupMaterial !== -1) {
        const groupVertexCount = face * 3 - currentGroupStart;
        geometry.addGroup(currentGroupStart, groupVertexCount, currentGroupMaterial);
      }
      currentGroupStart = face * 3;
      currentGroupMaterial = materialIndex;
    }
  }

  if (currentGroupMaterial !== -1) {
    const groupVertexCount = faceCount * 3 - currentGroupStart;
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
  isInterior: boolean,
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
