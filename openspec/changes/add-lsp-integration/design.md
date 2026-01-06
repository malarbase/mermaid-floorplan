# LSP Integration - Design Decisions

## Context

The interactive editor needs IDE-quality editing features. Monaco editor supports LSP, and Langium already provides language server capabilities. The challenge is running Langium's language server in the browser via Web Workers.

## Goals / Non-Goals

**Goals:**
- Full LSP feature set for floorplans language (completion, go-to-def, hover, semantic tokens)
- Browser-only solution (no server backend required)
- Minimal impact on bundle size (lazy-load LSP)

**Non-Goals:**
- Multi-file workspace support
- Rename refactoring
- Find all references (can add later)

## Architecture Decision: Web Worker Approach

### Options Considered

1. **Server-side LSP** - Run Langium on a backend server
   - ❌ Adds deployment complexity
   - ❌ Requires network roundtrips
   - ❌ Breaks offline usage

2. **Main thread Langium** - Run language server in main thread
   - ❌ Blocks UI during heavy parsing
   - ❌ Competes with Three.js for CPU time

3. **Web Worker Langium** ✓ - Run language server in dedicated worker
   - ✅ Offloads parsing to separate thread
   - ✅ Browser-only, works offline
   - ✅ Same Langium code as Node.js version

**Decision:** Use Web Worker approach.

## Worker-Client Communication

```
┌─────────────────┐     LSP Messages      ┌─────────────────┐
│  Monaco Editor  │ ◄─────────────────────► │  Langium Worker │
│  (main thread)  │  BrowserMessage        │  (web worker)   │
│                 │  Reader/Writer         │                 │
│  monaco-       │                        │  floorplans-    │
│  languageclient │                        │  language       │
└─────────────────┘                        └─────────────────┘
```

### Message Flow

1. **Document Open**: Monaco sends `textDocument/didOpen`
2. **Document Change**: Monaco sends `textDocument/didChange` 
3. **Completion Request**: Monaco sends `textDocument/completion`
4. **Worker Response**: Langium worker sends completion items

## Langium Browser Configuration

```typescript
// language-server-worker.ts
import { EmptyFileSystem } from 'langium';
import { createFloorplansServices } from 'floorplans-language';
import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';

// Use EmptyFileSystem since we have single-file editing
const services = createFloorplansServices({ fileSystem: EmptyFileSystem });

const reader = new BrowserMessageReader(self);
const writer = new BrowserMessageWriter(self);

// Start language server with reader/writer
startLanguageServer(services, { reader, writer });
```

## Monaco-Languageclient Setup

```typescript
// lsp-editor.ts
import { MonacoLanguageClient } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

export class LspEditor {
  private worker: Worker;
  private client: MonacoLanguageClient;

  async initialize() {
    // Create worker
    this.worker = new Worker(
      new URL('./language-server-worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Create language client
    this.client = new MonacoLanguageClient({
      name: 'Floorplans Language Client',
      clientOptions: {
        documentSelector: [{ language: 'floorplans' }],
      },
      connectionProvider: {
        get: () => ({
          reader: new BrowserMessageReader(this.worker),
          writer: new BrowserMessageWriter(this.worker),
        }),
      },
    });

    await this.client.start();
  }
}
```

## Custom Hover Provider

Langium's default hover shows AST node names. For rooms, we want computed info:

```typescript
// language/src/hover-provider.ts
export class FloorplanHoverProvider implements HoverProvider {
  getHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
    if (isRoom(node)) {
      const area = node.size.width * node.size.height;
      return {
        contents: {
          kind: 'markdown',
          value: [
            `**Room**: ${node.name}`,
            `**Position**: (${node.position.x}, ${node.position.y})`,
            `**Size**: ${node.size.width} × ${node.size.height}`,
            `**Area**: ${area} sq units`,
          ].join('\n'),
        },
      };
    }
    return undefined;
  }
}
```

## Semantic Token Types

| Token Type | Example | Color Intent |
|------------|---------|--------------|
| `keyword` | `room`, `floor`, `connect` | Purple/blue |
| `type` | Room name | Cyan |
| `function` | Style name | Yellow |
| `number` | `10`, `(0,0)` | Green |
| `string` | `"Kitchen"` | Orange |
| `comment` | `// comment` | Gray |

## Bundle Optimization

To minimize bundle impact, LSP components are code-split:

```typescript
// Lazy load LSP when user starts editing
const { LspEditor } = await import('./lsp-editor.js');
```

Worker is loaded on demand, not at initial page load.

## Error Handling

### Worker Crash Recovery
- Detect worker termination
- Show degraded mode notice
- Allow editing without LSP features
- Offer restart button

### Parse Error Handling
- LSP continues working during parse errors
- Completion uses last valid AST
- Diagnostics highlight parse errors inline

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Completion popup | < 100ms | After keystroke |
| Go-to-definition | < 50ms | After Ctrl-click |
| Hover tooltip | < 50ms | After hover delay |
| Document sync | < 200ms | After typing pause |

## Migration Path

1. **Phase 1**: Keep basic editor as fallback
2. **Phase 2**: Add LspEditor as opt-in
3. **Phase 3**: Make LspEditor default, basic as fallback
4. **Phase 4**: Remove basic editor (if stable)

## Open Questions

1. ~~Should we bundle Langium in worker or load from CDN?~~ **Decision: Bundle in worker for offline support**
2. ~~How to handle large floorplans (100+ rooms)?~~ **Decision: Use incremental parsing if needed**
3. Should completion include snippets for common patterns? **To decide during implementation**

