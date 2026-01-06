# Proposal: Add LSP Integration to Interactive Editor

## Why

The interactive editor currently uses a basic Monaco editor without Language Server Protocol (LSP) features. Users cannot get:
- Code completion for keywords, room names, style references
- Go-to-definition (click style reference → jump to definition)
- Hover information (room dimensions, computed area)
- Semantic highlighting (distinct colors for room names, styles, numbers)

This limits productivity and makes the editor feel like a plain text editor rather than an IDE-quality tool.

## What Changes

### Core Features

1. **Language Server Web Worker**
   - Create `language-server-worker.ts` to run Langium services in browser
   - Use `BrowserMessageReader/Writer` for LSP communication
   - Configure Langium's EmptyFileSystem for browser compatibility

2. **Monaco-Languageclient Setup**
   - Add dependencies: `monaco-languageclient`, `vscode-languageclient`, `vscode-languageserver-protocol`
   - Create `LspEditor` class that extends the basic Monaco editor
   - Configure document selector for 'floorplans' language

3. **LSP Feature Integration**
   - Completion: Keywords, room names in connect statements, style names
   - Go-to-definition: Style references → style definition blocks
   - Hover: Room metadata (position, size, computed area)
   - Semantic tokens: Distinct highlighting for entity types

### Non-Goals (This Phase)

- Find all references
- Rename refactoring
- Code actions/quick fixes
- Workspace-wide operations

## Impact

### Affected Specs

| Spec | Impact |
|------|--------|
| `interactive-editor` | Implements LSP requirements from existing spec |

### Affected Code

| Package | Changes |
|---------|---------|
| `interactive-editor/` | New: `language-server-worker.ts`, `lsp-editor.ts` |
| `language/` | May need LSP customization in `floorplans-module.ts` |

### Dependencies

New dependencies for `interactive-editor`:
```json
{
  "monaco-languageclient": "^10.0.0",
  "vscode-languageclient": "^9.0.1",
  "vscode-languageserver-protocol": "^3.17.5"
}
```

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Web Worker complexity | High | Medium | Start with minimal features, iterate |
| Bundle size increase | Medium | Low | Lazy-load LSP worker on demand |
| Langium browser compatibility | Low | High | Use existing EmptyFileSystem pattern |
| Monaco version conflicts | Medium | Medium | Pin compatible versions |

## Timeline Estimate

- **Worker Setup**: 1 week
- **LSP Features**: 1-2 weeks
- **Testing & Polish**: 0.5 weeks
- **Total**: 2.5-3.5 weeks

## Related Work

- [TypeFox: Boost your AI apps with DSLs](https://www.typefox.io/blog/boost-your-ai-apps-with-dsls/)
- [langium-ai examples](https://github.com/eclipse-langium/langium-ai)
- Current editor: `interactive-editor/src/dsl-editor.ts`
- Existing language module: `language/src/floorplans-module.ts`

