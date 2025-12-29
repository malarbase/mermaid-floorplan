/**
 * Floorplan Diagram for Mermaid
 * 
 * This module provides the complete floorplan diagram implementation
 * following Mermaid's diagram architecture conventions.
 * 
 * Structure follows: https://mermaid.js.org/community/new-diagram.html
 * - floorplans.langium: Grammar definition (Langium)
 * - renderer.ts: SVG rendering logic
 * - styles.ts: Theming support
 * - floor.ts, room.ts, wall.ts, door.ts, window.ts, connection.ts: Component renderers
 * - position-resolver.ts: Relative positioning resolution
 */

// Main renderer
export {
  render,
  renderFloor,
  renderToFile,
  type RenderOptions,
} from "./renderer.js";

// Component renderers
export { calculateFloorBounds, generateFloorRectangle, type FloorBounds } from "./floor.js";
export { generateRoomSvg, generateRoomText } from "./room.js";
export { wallRectangle } from "./wall.js";
export { generateDoor } from "./door.js";
export { generateWindow } from "./window.js";
export { generateConnection, generateConnections } from "./connection.js";

// Position resolution (relative positioning)
export {
  resolveFloorPositions,
  resolveAllPositions,
  getResolvedPosition,
  type ResolvedPosition,
  type PositionResolutionResult,
  type PositionResolutionError,
  type OverlapWarning,
} from "./position-resolver.js";

// Theming
export {
  getStyles,
  defaultThemeOptions,
  darkTheme,
  blueprintTheme,
  type FloorplanThemeOptions,
} from "./styles.js";
