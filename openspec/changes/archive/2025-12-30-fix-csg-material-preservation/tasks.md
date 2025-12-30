## 1. Research & Analysis

- [x] 1.1 Analyze CSG output geometry structure to understand how faces are reorganized
- [x] 1.2 Research `three-bvh-csg` capabilities for material preservation
- [x] 1.3 Evaluate alternative CSG libraries that may preserve material groups
- [x] 1.4 Prototype post-CSG face normal analysis for material reassignment

**Research Summary:**
- GitHub Issue #48 discusses need for utilities to handle separated geometry
- CSGManager.js from PhysicsWorkshop shows manifold-3d as alternative (but doesn't preserve materials)
- three-bvh-csg destroys material groups during SUBTRACTION operations
- Post-CSG normal-based reassignment selected as best solution (minimal code, good performance)

## 2. Implementation (Option A - Post-CSG Reassignment Selected)

- [x] 2.1 Add `normalToMaterialIndex()` helper method
  - Maps face normals to BoxGeometry material indices (0-5)
  - Handles ±X, ±Y, ±Z axis detection

- [x] 2.2 Add `reassignMaterialsByNormal()` method
  - Clears existing geometry groups
  - Iterates through faces and assigns material based on normal
  - Optimizes by merging consecutive faces with same material

- [x] 2.3 Update `performCSGWithMaterialArray()` to call reassignment
  - Called after CSG SUBTRACTION operations
  - Preserves per-face materials for shared wall segments

## 3. Testing

- [x] 3.1 Unit tests for `normalToMaterialIndex()` (axis-dominant normal mapping)
- [x] 3.2 Unit tests for `reassignMaterialsByNormal()` (geometry group reassignment)
- [x] 3.3 Unit tests for `getWallFaceMaterialIndex()` (wall direction mapping)
- [x] 3.4 Integration tests for CSG-like material reassignment
- [x] 3.5 Visual testing with door connections (manual) ✓
- [x] 3.6 Visual testing with window holes (manual) ✓
- [x] 3.7 Performance acceptable - single O(n) pass through faces

## 4. Documentation

- [x] 4.1 Update design.md with chosen approach
- [x] 4.2 Add inline code comments explaining the solution
- [x] 4.3 Spec delta already in place (`specs/3d-viewer/spec.md`)

