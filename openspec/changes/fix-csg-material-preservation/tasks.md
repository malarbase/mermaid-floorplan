## 1. Research & Analysis

- [ ] 1.1 Analyze CSG output geometry structure to understand how faces are reorganized
- [ ] 1.2 Research `three-bvh-csg` capabilities for material preservation
- [ ] 1.3 Evaluate alternative CSG libraries that may preserve material groups
- [ ] 1.4 Prototype post-CSG face normal analysis for material reassignment

## 2. Implementation Options

- [ ] 2.1 **Option A - Post-CSG Reassignment**: Implement face normal detection to reassign materials after CSG
  - Detect face orientation using normals
  - Assign materials based on which direction the face points (+X, -X, +Z, -Z, etc.)
  - Handle edge cases for angled faces around holes

- [ ] 2.2 **Option B - Multi-Mesh Approach**: Replace single BoxGeometry with separate face meshes
  - Create thin plane geometries for each wall face
  - Apply per-face materials directly
  - Use CSG only on the necessary faces
  - Assemble final wall from multiple meshes

- [ ] 2.3 **Option C - Pre-Split Geometry**: Split wall geometry before CSG
  - Identify where holes will be cut
  - Create separate geometry sections that preserve material boundaries
  - Apply CSG to each section independently

## 3. Testing

- [ ] 3.1 Test with single door connections
- [ ] 3.2 Test with multiple door connections on same wall segment
- [ ] 3.3 Test with window holes
- [ ] 3.4 Test with mixed door and window holes
- [ ] 3.5 Verify performance impact of chosen solution

## 4. Documentation

- [ ] 4.1 Update design.md with chosen approach
- [ ] 4.2 Add inline code comments explaining the solution
- [ ] 4.3 Update any affected spec files

