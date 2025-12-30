# Tasks: Add Complex Room Shapes

## 1. DSL Grammar Extension

- [ ] 1.1 Add `polygon` keyword and vertex list syntax to grammar
- [ ] 1.2 Add `shape` keyword with `union`/`difference` operators
- [ ] 1.3 Add `rect(WxH)` and `rect(WxH) at (X,Y)` syntax for composite shapes
- [ ] 1.4 Update AST types for polygon and composite shape nodes

## 2. Language Processing

- [ ] 2.1 Implement polygon vertex parsing and validation
- [ ] 2.2 Implement composite shape parsing and validation
- [ ] 2.3 Add validation for closed polygons (first/last vertex match)
- [ ] 2.4 Add validation for non-self-intersecting polygons

## 3. JSON Export

- [ ] 3.1 Extend `JsonRoom` type to support polygon vertices
- [ ] 3.2 Extend `JsonRoom` type to support composite shape definitions
- [ ] 3.3 Update `json-converter.ts` to export complex shapes

## 4. SVG Rendering

- [ ] 4.1 Update floor mesh rendering to handle polygon rooms
- [ ] 4.2 Update floor mesh rendering to handle composite shapes
- [ ] 4.3 Update room label positioning for non-rectangular shapes

## 5. 3D Viewer Rendering

- [ ] 5.1 Update floor geometry generation for polygon rooms
- [ ] 5.2 Update floor geometry generation for composite shapes (CSG union/difference)
- [ ] 5.3 Update wall generation for polygon edges
- [ ] 5.4 Update wall generation for composite shape boundaries

## 6. Door Connections on Complex Shapes

- [ ] 6.1 Update wall overlap detection for polygon edges
- [ ] 6.2 Update door positioning logic for non-axis-aligned walls
- [ ] 6.3 Ensure door connections work on L-shaped room wrap-arounds

## 7. Testing

- [ ] 7.1 Add parser tests for polygon syntax
- [ ] 7.2 Add parser tests for composite shape syntax
- [ ] 7.3 Add rendering tests for complex shapes
- [ ] 7.4 Manual testing with L-shaped and polygonal rooms

