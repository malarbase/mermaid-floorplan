// Language services and module
export * from "./floorplans-module.js";
export * from "./floorplans-validator.js";

// Generated AST and grammar
export * from "./generated/ast.js";
export * from "./generated/grammar.js";
export * from "./generated/module.js";

// Diagram implementation (rendering, styles, etc.)
// Following Mermaid convention: grammar + rendering in same diagram folder
export * from "./diagrams/floorplans/index.js";

// Monarch syntax highlighting
import monarchConfig from "./generated/syntaxes/floorplans.monarch.js";
export { monarchConfig };
