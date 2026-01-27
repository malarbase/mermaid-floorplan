## Context

The floorplan MCP server currently uses Node.js-specific APIs and the official `@modelcontextprotocol/sdk` with stdio transport. WebMCP is an emerging W3C proposal that allows web pages to expose tools to AI agents via `window.navigator.modelContext.provideContext()`. The `@mcp-b/webmcp-ts-sdk` package adapts the official MCP SDK for browser environments by enabling dynamic tool registration after transport connection.

### Key Technical Challenge

The official MCP SDK enforces that server capabilities (tools) must be registered **before** connecting to a transport. However, WebMCP requires dynamic registration because:
1. Tools arrive dynamically via `window.navigator.modelContext.provideContext({ tools: [...] })`
2. The MCP transport must be ready when the page loads
3. Tools are registered as page JavaScript executes, potentially after initialization

The `@mcp-b/webmcp-ts-sdk` solves this by pre-registering tool capabilities before transport connection.

## Goals / Non-Goals

### Goals
- Enable floorplan tools (render, validate, modify, analyze) to run in web browsers
- Maintain feature parity where browser APIs permit
- Provide simple integration for web developers (script tag, React hooks, vanilla JS)
- Share tool logic between Node.js and browser builds

### Non-Goals
- Full headless Chrome rendering in browser (not possible)
- File system access for textures (use URLs instead)
- Running the stdio transport in browser
- Supporting Node.js-only consumers from the browser entry point

## Decisions

### Decision 1: Dual Entry Points (Node + Browser)

**Choice**: Create separate entry points for Node.js and browser environments in the same package.

```
floorplan-mcp-server/
├── src/
│   ├── index.ts           # Node.js entry (stdio transport)
│   ├── browser.ts         # Browser entry (WebMCP)
│   ├── core/              # Shared tool logic
│   │   ├── tools.ts       # Tool definitions and handlers
│   │   └── schemas.ts     # Zod schemas (shared)
│   ├── node/              # Node.js-specific
│   │   └── renderer.ts    # resvg, puppeteer
│   └── browser/           # Browser-specific
│       └── renderer.ts    # canvas, WebGL
└── package.json           # exports: { ".", "./browser" }
```

**Alternatives Considered**:
- Separate `floorplan-webmcp` package: Would duplicate tool definitions
- Conditional imports: Complex bundler configuration, harder to tree-shake

**Rationale**: Package.json `exports` field cleanly separates entry points. Bundlers (Vite, webpack, esbuild) automatically use the correct entry based on target environment.

### Decision 2: Browser Rendering Strategy

**Choice**: Use native browser APIs for rendering:
- **2D SVG→PNG**: Use HTML5 Canvas with SVG image loading or canvg library
- **3D PNG**: Direct Three.js WebGL rendering to canvas, then `toDataURL()`

**Alternatives Considered**:
- WASM-based resvg: Heavy bundle size (~2MB), complex initialization
- Server-side proxy: Defeats purpose of browser-only operation
- SVG-only output: Loses PNG support for AI vision models

**Rationale**: Browser-native rendering keeps bundle size small and leverages existing Three.js code from `floorplan-3d-core` which already has a browser bundle.

### Decision 3: SDK Choice

**Choice**: Use `@mcp-b/webmcp-ts-sdk` for browser MCP server.

**Rationale**:
- Only ~50 lines of custom code on top of official SDK
- Maintains compatibility with official SDK types and utilities
- Already tested with Claude, ChatGPT, Gemini, Cursor
- MIT licensed, actively maintained
- Re-exports everything from official SDK for compatibility

### Decision 4: Tool Registration Pattern

**Choice**: Export factory functions that create pre-configured tools for WebMCP.

```typescript
// Browser usage
import { createFloorplanTools } from 'floorplan-mcp-server/browser';

// Register with WebMCP
window.navigator.modelContext.provideContext({
  name: 'floorplan-tools',
  tools: createFloorplanTools()
});
```

**Alternatives Considered**:
- Auto-register on import: Less control for consumers
- Server instance export: WebMCP doesn't need full server abstraction

**Rationale**: Factory pattern gives consumers control over when/how tools are registered and allows configuration options.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    floorplan-mcp-server                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐           ┌─────────────────┐         │
│  │   src/core/     │           │   src/core/     │         │
│  │   schemas.ts    │◄─────────►│   tools.ts      │         │
│  │   (Zod schemas) │           │   (Tool logic)  │         │
│  └────────┬────────┘           └────────┬────────┘         │
│           │                             │                   │
│           └──────────┬──────────────────┘                   │
│                      │                                      │
│    ┌─────────────────┼─────────────────┐                   │
│    │                 │                 │                   │
│    ▼                 ▼                 ▼                   │
│  ┌───────────┐  ┌───────────┐   ┌───────────────┐         │
│  │  Node.js  │  │  Browser  │   │    Shared     │         │
│  │  Entry    │  │  Entry    │   │  floorplan-   │         │
│  │           │  │           │   │  language     │         │
│  │ index.ts  │  │browser.ts │   │  (parser)     │         │
│  └─────┬─────┘  └─────┬─────┘   └───────────────┘         │
│        │              │                                    │
│        ▼              ▼                                    │
│  ┌───────────┐  ┌───────────┐                             │
│  │node/      │  │browser/   │                             │
│  │renderer.ts│  │renderer.ts│                             │
│  │(resvg,    │  │(canvas,   │                             │
│  │puppeteer) │  │WebGL)     │                             │
│  └───────────┘  └───────────┘                             │
│                                                            │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ Browser builds
                      ▼
    ┌─────────────────────────────────────┐
    │         Web Application             │
    │  ┌─────────────────────────────┐    │
    │  │ window.navigator            │    │
    │  │   .modelContext             │    │
    │  │   .provideContext({         │    │
    │  │     tools: floorplanTools   │    │
    │  │   })                        │    │
    │  └─────────────────────────────┘    │
    └─────────────────────────────────────┘
                      │
                      │ W3C WebMCP API
                      ▼
    ┌─────────────────────────────────────┐
    │    AI Agent (Claude, ChatGPT,       │
    │    Gemini, Browser Assistant)       │
    └─────────────────────────────────────┘
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size increase | Larger web apps | Tree-shaking, dynamic imports |
| 3D rendering quality differs | Visual inconsistency | Document browser vs Node differences |
| WebMCP API not finalized | Breaking changes | Pin to specific @mcp-b/webmcp-ts-sdk version |
| Browser canvas limitations | Lower resolution output | Allow configurable output quality |
| No file system access | Can't load local textures | Use URL-based textures, document limitation |

## Migration Plan

1. **Phase 1**: Refactor existing code to extract shared tool logic
2. **Phase 2**: Implement browser-specific renderers
3. **Phase 3**: Create browser entry point with WebMCP integration
4. **Phase 4**: Add integration examples and documentation
5. **Rollback**: Changes are additive; existing Node.js entry remains unchanged

## Open Questions (Resolved)

### 1. Canvas vs WebGL for 2D: Should 2D SVG→PNG use canvas or a lightweight SVG rasterizer?

**Decision: Use HTML5 Canvas + Image element**

The floorplan SVGs contain:
- Simple geometry (rectangles, lines, arcs for door swings)
- Text labels (room names, dimension annotations)
- No complex filters, gradients, or embedded images

**Implementation approach:**
- Use Canvas 2D context with `drawImage()` for SVG rasterization
- Text rendering (dimension annotations, room labels) is handled within the SVG before rasterization
- Zero external dependencies keeps bundle small (~0KB overhead)
- If edge cases arise with complex fonts or text rendering differences across browsers, can add `canvg` (~50KB) as optional fallback

**Note:** Dimension annotations are rendered as `<text>` elements in the SVG by `floorplan-language`'s renderer before canvas conversion, so they will be rasterized correctly.

---

### 2. React hooks package: Should we provide `@floorplan/react-webmcp` with `useFloorplanTools()` hook?

**Decision: Export lightweight hook from browser entry (defer separate package)**

Add a simple `useFloorplanTools()` hook to `floorplan-mcp-server/browser`:
- ~10 lines of code, not worth a separate package
- React as peerDependency (no bundle impact if not using React)
- Users wanting more control can use `createFloorplanTools()` directly
- Can extract to separate package later if the hook grows complex

```typescript
export function useFloorplanTools(options?: FloorplanToolOptions) {
  const tools = useMemo(() => createFloorplanTools(options), [options]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator.modelContext) {
      window.navigator.modelContext.provideContext({
        name: 'floorplan-tools',
        tools
      });
    }
  }, [tools]);
  
  return tools;
}
```

---

### 3. Texture loading: How to handle style textures in browser?

**Decision: Support multiple URL schemes with configurable base URL**

**Supported texture URL formats:**

| Format | Example | Use Case |
|--------|---------|----------|
| **Absolute URLs** | `https://cdn.example.com/wood.jpg` | CDN-hosted assets |
| **Data URLs** | `data:image/png;base64,iVBOR...` | Embedded textures (small files) |
| **Blob URLs** | `blob:https://example.com/uuid` | User-uploaded textures |
| **Relative paths** | `textures/wood.jpg` | Resolved via `textureBaseUrl` option |

**Configuration:**
```typescript
interface FloorplanToolOptions {
  /** Base URL for resolving relative texture paths */
  textureBaseUrl?: string;
  /** Maximum render dimensions */
  maxWidth?: number;
  maxHeight?: number;
}
```

**Resolution logic:**
1. `data:` or `blob:` URLs → use as-is (already browser-compatible)
2. `http://` or `https://` URLs → use as-is (subject to CORS)
3. Relative paths + `textureBaseUrl` configured → prepend base URL
4. Relative paths without `textureBaseUrl` → emit warning, use solid color fallback

**DSL examples:**
```
# Absolute URL (works everywhere with CORS)
style CDN { floor_texture: "https://cdn.example.com/textures/oak.jpg" }

# Data URL (embedded, no network request)
style Embedded { floor_texture: "data:image/png;base64,iVBORw0KGgo..." }

# Blob URL (from user upload via URL.createObjectURL)
style Uploaded { floor_texture: "blob:https://app.example.com/abc-123" }

# Relative path (requires textureBaseUrl option)
style Relative { floor_texture: "textures/wood.jpg" }
```

---

### 4. Test strategy: How to test WebMCP integration without actual AI agents?

**Decision: Multi-layer testing approach**

| Layer | Scope | Method | Automation |
|-------|-------|--------|------------|
| **Unit** | Renderers, tool handlers | Vitest + jsdom/happy-dom | ✅ CI |
| **Integration** | WebMCP registration, tool invocation | Mock `window.navigator.modelContext` | ✅ CI |
| **Browser** | Real DOM/Canvas behavior | HTML test harness | ⚡ Manual |
| **E2E** | Full AI agent workflow | WebMCP extension + Claude/ChatGPT | 🔧 Manual |

**Test infrastructure:**
- Unit/integration tests run in CI via Vitest with browser-like environment
- Browser test harness (`test/browser/manual-test.html`) for visual validation
- E2E documented with manual testing steps using WebMCP browser extension
