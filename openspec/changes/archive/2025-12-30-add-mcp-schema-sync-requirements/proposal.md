## Why

The MCP server has hardcoded Zod schemas that duplicate type definitions from the DSL grammar. When new capabilities are added via OpenSpec changes to the grammar (e.g., new wall types, new positioning directions), the MCP server schemas must be manually updated but there's no formal requirement ensuring this happens. This can lead to:
- MCP tools rejecting valid DSL constructs
- Schema drift between grammar and MCP server
- Silent failures when LLMs try to use new DSL features

## What Changes

- Add new requirements to `mcp-server` spec documenting:
  - Schema synchronization obligation when grammar changes
  - List of grammar types that MCP server schemas must mirror
  - Validation scenarios for schema consistency
- Establish OpenSpec convention that grammar changes affecting MCP tools MUST include MCP server delta specs

## Impact

- Affected specs: `mcp-server`
- Affected code: `mcp-server/src/tools/modify.ts` (documents existing Zod schemas that need sync)
- Process impact: Future grammar changes must consider MCP server schema updates

