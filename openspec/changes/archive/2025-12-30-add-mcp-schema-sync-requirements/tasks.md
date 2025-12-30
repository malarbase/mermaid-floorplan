## 1. Documentation

- [x] 1.1 Add Schema Synchronization requirement to mcp-server spec
- [x] 1.2 Add Grammar Type Mapping requirement documenting which types need sync
- [x] 1.3 Validate proposal with `openspec validate`

## 2. Verification

- [x] 2.1 Verify current MCP schemas match grammar types (audit existing code)
  - WallType: ✅ `["solid", "door", "window", "open"]`
  - RelativeDirection: ✅ all 8 directions match
  - AlignmentDirection: ✅ `["top", "bottom", "left", "right", "center"]`
- [x] 2.2 Archive change after approval

