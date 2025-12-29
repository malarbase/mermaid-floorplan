## Why
Currently, dimensions and properties are hardcoded. Changing a standard wall height or door size requires editing every single room. Variables and global configuration would solve this.

## What Changes
- Add `define` keyword for variables
- Add `config` block for global defaults (wall thickness, default door size)
- Update DSL grammar to support identifiers in value positions
- Update AST resolution to substitute variables

## Impact
- Affected specs: `dsl-grammar`
- Affected code: `language/src`, `mcp-server/src` (needs to receive resolved values)

