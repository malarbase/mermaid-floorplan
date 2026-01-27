## Why

The mermaid-floorplan project has grown to include a custom DSL (Langium), multi-format rendering (SVG/PNG/3D), an MCP server, and a spec-driven development workflow (OpenSpec). Currently, AI assistants interacting with the project must understand all these systems holistically, leading to suboptimal suggestions and missed context. A structured agent framework would decompose this complexity into focused, composable skills that can be combined for specific tasks.

## What Changes

- **NEW**: `ai-agents` capability spec defining agent behaviors and interfaces
- **NEW**: Agent system prompts for specialized domains (Grammar, OpenSpec, Rendering, etc.)
- **NEW**: Agent composition patterns for multi-step workflows
- **NEW**: Design Review Agent as the first fully-specified agent with validation criteria
- Integration with existing MCP server for tool invocation

## Impact

- Affected specs: Creates new `ai-agents` capability
- Affected code: `floorplan-mcp-server/` (optional agent orchestration), documentation
- External artifacts: System prompts for Claude Projects, Cursor rules, or custom GPTs
