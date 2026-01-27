## 1. Refactor: Extract Shared Tool Logic

- [ ] 1.1 Create `src/core/schemas.ts` with all Zod schemas from render.ts, modify.ts, validate.ts, analyze.ts
- [ ] 1.2 Create `src/core/tools.ts` with tool handler logic that accepts renderer functions as dependencies
- [ ] 1.3 Update existing Node.js tools to use shared core logic
- [ ] 1.4 Verify existing Node.js MCP server still works after refactor

## 2. Implement Browser Renderers

- [ ] 2.1 Create `src/browser/renderer.ts` with canvas-based SVG→PNG conversion
- [ ] 2.2 Create `src/browser/renderer3d.ts` with direct WebGL→canvas rendering using floorplan-3d-core browser bundle
- [ ] 2.3 Add fallback for environments without WebGL support
- [ ] 2.4 Write unit tests for browser renderers (using jsdom/happy-dom)

## 3. Create Browser Entry Point

- [ ] 3.1 Add `@mcp-b/webmcp-ts-sdk` as a dependency
- [ ] 3.2 Create `src/browser.ts` entry point exporting `createFloorplanTools()` factory
- [ ] 3.3 Create `BrowserMcpServer` integration in browser entry
- [ ] 3.4 Update `package.json` with browser export: `"./browser": "./out/browser.js"`
- [ ] 3.5 Add browser-specific TypeScript config or conditional compilation

## 4. Update Build Configuration

- [ ] 4.1 Configure TypeScript to output both Node and browser builds
- [ ] 4.2 Add bundler-friendly exports in package.json (`browser`, `module` fields)
- [ ] 4.3 Ensure tree-shaking works (no side effects in browser entry)
- [ ] 4.4 Test with Vite, webpack, and esbuild to verify bundle correctness

## 5. Integration Examples

- [ ] 5.1 Create vanilla JS example in `examples/webmcp-vanilla/`
- [ ] 5.2 Create React example in `examples/webmcp-react/`
- [ ] 5.3 Create script tag example showing CDN usage
- [ ] 5.4 Document WebMCP integration in README.md

## 6. Documentation & Testing

- [ ] 6.1 Update `floorplan-mcp-server/README.md` with WebMCP usage section
- [ ] 6.2 Add browser-specific limitations section (textures, resolution, etc.)
- [ ] 6.3 Write integration tests mocking `window.navigator.modelContext`
- [ ] 6.4 Test with Chrome/Firefox DevTools to verify tool registration

## 7. Validation & Review

- [ ] 7.1 Run `npm run build` to verify both entry points compile
- [ ] 7.2 Run `npm test` to verify all tests pass
- [ ] 7.3 Manually test with WebMCP-enabled browser extension (if available)
- [ ] 7.4 Verify bundle size is acceptable (<100KB gzipped for browser entry)
