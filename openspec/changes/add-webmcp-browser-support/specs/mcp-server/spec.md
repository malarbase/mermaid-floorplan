## ADDED Requirements

### Requirement: WebMCP Browser Transport

The MCP server SHALL support browser environments via the W3C Web Model Context API, enabling AI agents to invoke floorplan tools directly from web pages without requiring a Node.js server.

#### Scenario: Browser tool registration with WebMCP

- **GIVEN** a web application importing the browser entry point
- **WHEN** the application calls `createFloorplanTools()` and registers with `window.navigator.modelContext.provideContext()`
- **THEN** the AI agent SHALL be able to invoke `render_floorplan`, `validate_floorplan`, `modify_floorplan`, and `analyze_floorplan` tools
- **AND** tool invocations SHALL return the same response schema as the Node.js MCP server

#### Scenario: Dynamic tool registration after page load

- **GIVEN** a WebMCP-enabled browser environment
- **WHEN** floorplan tools are registered after the initial page load
- **THEN** the tools SHALL be immediately available to AI agents
- **AND** no server restart or reconnection SHALL be required

#### Scenario: Browser entry point isolation

- **GIVEN** a web application bundling the browser entry point
- **WHEN** the bundle is created
- **THEN** Node.js-only dependencies (`puppeteer`, `@resvg/resvg-js`, `node:fs`) SHALL NOT be included
- **AND** the bundle SHALL be loadable in standard web browsers without errors

---

### Requirement: Browser-Compatible 2D Rendering

The browser MCP server SHALL render floorplan DSL to PNG images using browser-native APIs instead of Node.js dependencies.

#### Scenario: SVG to PNG conversion in browser

- **GIVEN** a valid floorplan DSL string
- **WHEN** the `render_floorplan` tool is invoked with `format: "png"` in a browser environment
- **THEN** the tool SHALL generate a PNG image using HTML5 Canvas
- **AND** the output SHALL be base64-encoded and viewable by multimodal LLMs

#### Scenario: SVG output in browser

- **GIVEN** a valid floorplan DSL string
- **WHEN** the `render_floorplan` tool is invoked with `format: "svg"` in a browser environment
- **THEN** the tool SHALL return SVG markup identical to the Node.js implementation
- **AND** no canvas conversion SHALL be performed

#### Scenario: Annotation rendering in browser

- **GIVEN** a valid floorplan DSL and annotation options (`showArea`, `showDimensions`, `showFloorSummary`)
- **WHEN** the `render_floorplan` tool is invoked in a browser environment
- **THEN** annotations SHALL be rendered identically to the Node.js implementation

---

### Requirement: Browser-Compatible 3D Rendering

The browser MCP server SHALL render floorplan DSL to 3D PNG images using WebGL in the browser instead of Puppeteer.

#### Scenario: 3D PNG rendering in browser

- **GIVEN** a valid floorplan DSL string
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"` in a browser environment
- **THEN** the tool SHALL render a 3D scene using Three.js WebGL
- **AND** the output SHALL be captured from canvas using `toDataURL("image/png")`
- **AND** the PNG SHALL be base64-encoded in the response

#### Scenario: 3D rendering with camera options in browser

- **GIVEN** a valid floorplan DSL and camera options (`projection`, `cameraPosition`, `cameraTarget`, `fov`)
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"` in a browser
- **THEN** the camera configuration SHALL be applied identically to the Node.js implementation

#### Scenario: WebGL not available fallback

- **GIVEN** a browser environment without WebGL support
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the response SHALL contain `success: false`
- **AND** the error message SHALL indicate WebGL is required for 3D rendering
- **AND** the error SHALL suggest using `format: "png"` or `format: "svg"` as alternatives

---

### Requirement: Browser Package Exports

The `floorplan-mcp-server` package SHALL provide separate entry points for Node.js and browser environments.

#### Scenario: Node.js import unchanged

- **WHEN** a Node.js application imports `floorplan-mcp-server`
- **THEN** the stdio transport server SHALL be exported as before
- **AND** existing integrations SHALL continue to work without modification

#### Scenario: Browser import available

- **WHEN** a web application imports `floorplan-mcp-server/browser`
- **THEN** browser-compatible tool factories SHALL be exported
- **AND** no Node.js-specific APIs SHALL be referenced

#### Scenario: Bundler resolution

- **WHEN** a bundler (Vite, webpack, esbuild) processes the browser import
- **THEN** the `package.json` `exports` field SHALL direct to the browser entry point
- **AND** tree-shaking SHALL exclude unused Node.js code

---

### Requirement: WebMCP Tool Factory

The browser entry point SHALL export a factory function for creating WebMCP-compatible tool definitions.

#### Scenario: Create floorplan tools

- **GIVEN** a web application using the browser entry point
- **WHEN** `createFloorplanTools()` is called
- **THEN** an array of tool definitions SHALL be returned
- **AND** each tool SHALL have `name`, `description`, `inputSchema`, and `handler` properties
- **AND** the tools SHALL be compatible with `window.navigator.modelContext.provideContext()`

#### Scenario: Tool factory with options

- **GIVEN** a web application needing custom configuration
- **WHEN** `createFloorplanTools({ maxWidth: 1920, maxHeight: 1080 })` is called
- **THEN** the returned tools SHALL respect the configuration limits
- **AND** renders exceeding limits SHALL be constrained

#### Scenario: Tool handler returns MCP-compatible response

- **WHEN** a tool handler is invoked with valid arguments
- **THEN** the response SHALL conform to the MCP tool response schema
- **AND** image content SHALL use `type: "image"`, `mimeType: "image/png"`, and base64 `data`
- **AND** text content SHALL use `type: "text"` with JSON-stringified metadata

---

### Requirement: Browser Texture Handling

The browser MCP server SHALL handle style textures using URL-based loading instead of file system access.

#### Scenario: URL-based texture in browser

- **GIVEN** a floorplan DSL with a style defining `floor_texture: "https://example.com/textures/wood.jpg"`
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"` in a browser
- **THEN** the texture SHALL be loaded via fetch/Image from the URL
- **AND** the rendered 3D image SHALL apply the texture to the floor surface

#### Scenario: Relative texture path warning in browser

- **GIVEN** a floorplan DSL with a style defining `floor_texture: "textures/wood.jpg"` (relative path)
- **WHEN** the `render_floorplan` tool is invoked in a browser environment
- **THEN** a warning SHALL be included in the response indicating relative paths are not supported in browser
- **AND** the render SHALL proceed without the texture (fallback to solid color)
