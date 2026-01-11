/**
 * DSL Editor - Monaco-based editor for floorplan DSL.
 * 
 * Shared between viewer and interactive-editor packages.
 * 
 * Provides:
 * - Syntax highlighting via Monarch tokenizer
 * - Basic language configuration (brackets, comments)
 * - Error markers and decorations
 * - Navigation methods (goToLine, setSelection)
 */
import * as monaco from 'monaco-editor';
import { monarchConfig } from 'floorplans-language';

/**
 * Configuration for the DSL editor
 */
export interface DslEditorConfig {
  /** Container element ID */
  containerId: string;
  /** Initial DSL content */
  initialContent?: string;
  /** Theme ('vs-dark' | 'vs' | 'hc-black') */
  theme?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Enable minimap */
  minimap?: boolean;
  /** Callback when content changes */
  onChange?: (content: string) => void;
}

/**
 * Editor instance with exposed methods
 */
export interface DslEditorInstance {
  /** The underlying Monaco editor */
  editor: monaco.editor.IStandaloneCodeEditor;
  /** Get the current content */
  getValue(): string;
  /** Set the content */
  setValue(value: string): void;
  /** Subscribe to content changes */
  onDidChangeModelContent(callback: () => void): monaco.IDisposable;
  /** Set selection (for bidirectional sync) */
  setSelection(range: monaco.IRange): void;
  /** Reveal a line in the center of the viewport */
  revealLineInCenter(lineNumber: number): void;
  /** Go to a specific line and column, setting cursor position and revealing the line */
  goToLine(lineNumber: number, column?: number): void;
  /** Add decorations */
  createDecorationsCollection(decorations: monaco.editor.IModelDeltaDecoration[]): monaco.editor.IEditorDecorationsCollection;
  /** Show error markers */
  setErrorMarkers(errors: Array<{ line: number; column: number; message: string }>): void;
  /** Clear error markers */
  clearErrorMarkers(): void;
  /** Dispose the editor */
  dispose(): void;
}

// Track if language has been registered
let languageRegistered = false;

/**
 * Register the floorplans language with Monaco.
 * Safe to call multiple times.
 */
function registerFloorplansLanguage(): void {
  if (languageRegistered) return;
  
  // Register the language
  monaco.languages.register({ id: 'floorplans' });
  
  // Language configuration (brackets, comments, etc.)
  monaco.languages.setLanguageConfiguration('floorplans', {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    comments: {
      lineComment: '#',
    },
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });
  
  // Monarch tokenizer for syntax highlighting
  monaco.languages.setMonarchTokensProvider('floorplans', monarchConfig);
  
  languageRegistered = true;
}

/**
 * Create a Monaco editor for floorplan DSL.
 */
export function createDslEditor(config: DslEditorConfig): DslEditorInstance {
  // Register language if needed
  registerFloorplansLanguage();
  
  // Get container
  const container = document.getElementById(config.containerId);
  if (!container) {
    throw new Error(`Container element '${config.containerId}' not found`);
  }
  
  // Create editor
  const editor = monaco.editor.create(container, {
    value: config.initialContent ?? '',
    language: 'floorplans',
    automaticLayout: true,
    minimap: { enabled: config.minimap ?? false },
    scrollBeyondLastLine: false,
    theme: config.theme ?? 'vs-dark',
    fontSize: config.fontSize ?? 13,
    lineNumbers: 'on',
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'selection',
    folding: true,
    foldingStrategy: 'indentation',
    glyphMargin: true, // For error markers
    lineDecorationsWidth: 8,
  });
  
  // Setup change callback
  if (config.onChange) {
    editor.onDidChangeModelContent(() => {
      config.onChange!(editor.getValue());
    });
  }
  
  return {
    editor,
    
    getValue(): string {
      return editor.getValue();
    },
    
    setValue(value: string): void {
      editor.setValue(value);
    },
    
    onDidChangeModelContent(callback: () => void): monaco.IDisposable {
      return editor.onDidChangeModelContent(callback);
    },
    
    setSelection(range: monaco.IRange): void {
      editor.setSelection(range);
    },
    
    revealLineInCenter(lineNumber: number): void {
      editor.revealLineInCenter(lineNumber);
    },
    
    goToLine(lineNumber: number, column: number = 1): void {
      editor.setPosition({ lineNumber, column });
      editor.revealLineInCenter(lineNumber);
      editor.focus();
    },
    
    createDecorationsCollection(decorations: monaco.editor.IModelDeltaDecoration[]): monaco.editor.IEditorDecorationsCollection {
      return editor.createDecorationsCollection(decorations);
    },
    
    setErrorMarkers(errors: Array<{ line: number; column: number; message: string }>): void {
      const model = editor.getModel();
      if (!model) return;
      
      const markers: monaco.editor.IMarkerData[] = errors.map(err => ({
        severity: monaco.MarkerSeverity.Error,
        message: err.message,
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.line,
        endColumn: err.column + 1,
      }));
      
      monaco.editor.setModelMarkers(model, 'floorplans', markers);
    },
    
    clearErrorMarkers(): void {
      const model = editor.getModel();
      if (!model) return;
      
      monaco.editor.setModelMarkers(model, 'floorplans', []);
    },
    
    dispose(): void {
      editor.dispose();
    },
  };
}

// Export monaco for use in EditorViewerSync
export { monaco };

