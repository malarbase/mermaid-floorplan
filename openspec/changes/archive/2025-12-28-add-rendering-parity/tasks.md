## 1. Connection Rendering

- [x] 1.1 Create `connection.ts` module in `language/src/diagrams/floorplans/`
- [x] 1.2 Implement `generateConnection()` function
  - [x] 1.2.1 Calculate wall intersection point between two rooms
  - [x] 1.2.2 Render door symbol at connection point
  - [x] 1.2.3 Support `at X%` position along wall
- [x] 1.3 Update `renderer.ts` to call `generateConnection()` for each connection
- [x] 1.4 Export connection utilities from `index.ts`
- [x] 1.5 Add tests for connection rendering

## 2. Double-Door Support

- [x] 2.1 Modify `door.ts` to accept door type parameter (`door` | `double-door`)
- [x] 2.2 Implement double-door SVG (two swing arcs, mirrored)
- [x] 2.3 Update `wall.ts` to pass door type when rendering door walls
- [x] 2.4 Add tests for double-door rendering

## 3. Swing Direction Support

- [x] 3.1 Modify `generateDoor()` to accept swing direction parameter
- [x] 3.2 Adjust arc direction based on `swing: left|right`
- [x] 3.3 Support `opens into` room indicator (arc direction toward that room)
- [x] 3.4 Add tests for swing direction variants

## 4. Multi-Floor Rendering

- [x] 4.1 Modify `render()` to accept floor index or render all floors
- [x] 4.2 Add `RenderOptions.floorIndex` option (default: 0 for backward compatibility)
- [x] 4.3 Add `RenderOptions.renderAllFloors` option for stacked/side-by-side view
- [x] 4.4 Update `renderFloor()` to add floor ID label
- [x] 4.5 Update MCP server `render_floorplan` tool to accept floor parameter
- [x] 4.6 Add tests for multi-floor scenarios

## 5. Integration

- [x] 5.1 Update MCP server schema documentation with new options
- [x] 5.2 Add example floorplans demonstrating new features
- [x] 5.3 Update README with connection syntax examples
