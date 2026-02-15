// Language services and module

// Diagram implementation (rendering, styles, etc.)
// Following Mermaid convention: grammar + rendering in same diagram folder
export * from './diagrams/floorplans/index.js';
export * from './floorplans-module.js';
export * from './floorplans-validator.js';
// Generated AST and grammar
export * from './generated/ast.js';
export * from './generated/grammar.js';
export * from './generated/module.js';

// Monarch syntax highlighting
import monarchConfig from './generated/syntaxes/floorplans.monarch.js';
export { monarchConfig };
