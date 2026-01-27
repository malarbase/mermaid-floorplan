## Why

The current floorplan-mcp-server only runs in Node.js via stdio transport, limiting its use to local AI assistants (Cursor, Claude Desktop). WebMCP ([webmachinelearning/webmcp](https://github.com/webmachinelearning/webmcp)) is an emerging W3C proposal that enables web pages to expose JavaScript-based tools to AI agents directly in the browser, creating collaborative human-in-the-loop workflows. By adding WebMCP support, the floorplan DSL tools can run directly in web applications, enabling AI agents like Claude, ChatGPT, Gemini, and browser-based assistants to render, validate, and modify floorplans without requiring a separate Node.js server.

## What Changes

- Add a new `floorplan-webmcp` package (or entry point) that adapts the MCP server for browser environments
- Use `@mcp-b/webmcp-ts-sdk` which provides `BrowserMcpServer` supporting dynamic tool registration required by WebMCP
- Replace Node.js-only dependencies with browser-compatible alternatives:
  - `@resvg/resvg-js` → browser-native canvas or WASM-based alternative
  - `puppeteer` → direct Three.js WebGL rendering in browser
  - `node:fs`, `node:path` → browser APIs or bundled assets
- Export browser-compatible tool handlers that integrate with the W3C Web Model Context API
- Provide integration examples for vanilla JS, React, and script tag usage
- **BREAKING**: Some features may have reduced capability in browser (e.g., 3D PNG export may use browser canvas instead of headless Chrome)

## Impact

- **Affected specs**: `mcp-server` (new requirements for browser transport and tool registration)
- **Affected code**:
  - `floorplan-mcp-server/src/index.ts` - Extract tool logic from Node.js transport
  - `floorplan-mcp-server/src/utils/renderer.ts` - Replace resvg with browser canvas
  - `floorplan-mcp-server/src/utils/puppeteer-renderer.ts` - Replace with in-browser Three.js rendering
  - New entry point: `floorplan-mcp-server/src/browser.ts` or new package `floorplan-webmcp/`
- **New dependencies**: `@mcp-b/webmcp-ts-sdk` (~50 lines wrapper around official MCP SDK)
- **Consumers**: Web applications wanting AI agent integration for floorplan editing

## References

- [WebMCP W3C Proposal](https://github.com/webmachinelearning/webmcp)
- [WebMCP TypeScript SDK](https://www.npmjs.com/package/@mcp-b/webmcp-ts-sdk)
- [WebMCP Documentation](https://docs.mcp-b.ai/)
- [WebMCP Quick Start](https://docs.mcp-b.ai/quickstart)
