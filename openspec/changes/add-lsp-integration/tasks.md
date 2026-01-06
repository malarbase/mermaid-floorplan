# LSP Integration - Implementation Tasks

## Overview

This document tracks implementation tasks for adding LSP features to the interactive editor.

---

## Phase 1: Language Server Web Worker

### 1.1 Worker Setup
- [ ] 1.1.1 Create `interactive-editor/src/language-server-worker.ts`
- [ ] 1.1.2 Import Langium services with worker-compatible configuration
- [ ] 1.1.3 Set up BrowserMessageReader/Writer for LSP communication
- [ ] 1.1.4 Initialize language server with EmptyFileSystem
- [ ] 1.1.5 Test: Worker loads without errors in browser console

### 1.2 Vite Configuration
- [ ] 1.2.1 Configure Vite to bundle worker as separate chunk
- [ ] 1.2.2 Add worker to build output
- [ ] 1.2.3 Test: Worker file accessible at runtime

### 1.3 Deliverables
- [ ] Language server worker loads successfully
- [ ] Worker responds to initialization request

---

## Phase 2: Monaco-Languageclient Setup

### 2.1 Dependencies
- [ ] 2.1.1 Add `monaco-languageclient` to package.json
- [ ] 2.1.2 Add `vscode-languageclient` to package.json
- [ ] 2.1.3 Add `vscode-languageserver-protocol` to package.json
- [ ] 2.1.4 Verify version compatibility with Monaco editor

### 2.2 LSP Editor Class
- [ ] 2.2.1 Create `interactive-editor/src/lsp-editor.ts`
- [ ] 2.2.2 Implement MonacoLanguageClient setup
- [ ] 2.2.3 Configure document selector for 'floorplans' language ID
- [ ] 2.2.4 Wire up worker as language server backend
- [ ] 2.2.5 Test: LSP initialization handshake completes

### 2.3 Integration with InteractiveEditor
- [ ] 2.3.1 Update `index.html` to use LspEditor instead of basic editor
- [ ] 2.3.2 Ensure existing EditorViewerSync works with LspEditor
- [ ] 2.3.3 Test: Bidirectional sync still works

### 2.4 Deliverables
- [ ] LSP client connects to worker successfully
- [ ] Document sync works (textDocument/didOpen, didChange)

---

## Phase 3: Completion Provider

### 3.1 Keyword Completion
- [ ] 3.1.1 Verify Langium's built-in completion works
- [ ] 3.1.2 Test: `room`, `floor`, `connect`, `style`, `config` keywords appear
- [ ] 3.1.3 Test: Completions are context-aware

### 3.2 Room Name Completion
- [ ] 3.2.1 Test: Room name completions appear in `connect` statement
- [ ] 3.2.2 Test: Only defined room names appear (not arbitrary text)
- [ ] 3.2.3 Test: Room names update after adding new room

### 3.3 Style Name Completion
- [ ] 3.3.1 Test: Style name completions appear after `style` keyword
- [ ] 3.3.2 Test: Only defined styles appear
- [ ] 3.3.3 Test: Style names update after adding new style

### 3.4 Deliverables
- [ ] All completion types working
- [ ] Completions context-aware and accurate

---

## Phase 4: Definition Provider

### 4.1 Go-to-Definition
- [ ] 4.1.1 Verify Langium's built-in definition provider works
- [ ] 4.1.2 Test: Ctrl-click style reference → jumps to style definition
- [ ] 4.1.3 Test: Ctrl-click room reference in connect → jumps to room definition

### 4.2 Deliverables
- [ ] Go-to-definition works for style references
- [ ] Go-to-definition works for room references in connections

---

## Phase 5: Hover Provider

### 5.1 Custom Hover Implementation
- [ ] 5.1.1 Research Langium's HoverProvider customization API
- [ ] 5.1.2 Implement HoverProvider for Room nodes in `language/src/`
- [ ] 5.1.3 Display: Room name, position (x, y), size (width × height)
- [ ] 5.1.4 Display: Computed area in square units

### 5.2 Hover for Other Entities
- [ ] 5.2.1 Implement hover for Connection nodes (type, rooms connected)
- [ ] 5.2.2 Implement hover for Style definitions (applied to N rooms)

### 5.3 Deliverables
- [ ] Room hover shows position, size, area
- [ ] Connection hover shows type and connected rooms
- [ ] Style hover shows usage count

---

## Phase 6: Semantic Tokens

### 6.1 Semantic Token Provider
- [ ] 6.1.1 Verify Langium's semantic token support configuration
- [ ] 6.1.2 Configure token types for floorplans language

### 6.2 Visual Verification
- [ ] 6.2.1 Test: Room names have distinct color from keywords
- [ ] 6.2.2 Test: Style names have distinct color
- [ ] 6.2.3 Test: Numbers have distinct color
- [ ] 6.2.4 Test: Comments have distinct color

### 6.3 Deliverables
- [ ] Semantic highlighting working
- [ ] Visual distinction between entity types

---

## Phase 7: Testing & Documentation

### 7.1 Integration Testing
- [ ] 7.1.1 Test: LSP features work with EditorViewerSync (no conflicts)
- [ ] 7.1.2 Test: LSP survives DSL parse errors gracefully
- [ ] 7.1.3 Test: Performance acceptable (completion < 100ms)

### 7.2 Documentation
- [ ] 7.2.1 Update help overlay with LSP shortcuts (Ctrl-Space, Ctrl-Click, etc.)
- [ ] 7.2.2 Document LSP feature availability in README

### 7.3 Deliverables
- [ ] All LSP features working end-to-end
- [ ] No regression in existing editor functionality
- [ ] Documentation complete

---

## Implementation Checkpoints

### Checkpoint A: Worker Running
- [ ] Language server worker loads in browser
- [ ] Worker responds to initialization

### Checkpoint B: Client Connected
- [ ] Monaco-languageclient connects to worker
- [ ] Document sync working

### Checkpoint C: Features Complete
- [ ] Completion working (keywords, room names, style names)
- [ ] Go-to-definition working
- [ ] Hover information working
- [ ] Semantic tokens working

### Checkpoint D: Ready for Release
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Documentation complete

