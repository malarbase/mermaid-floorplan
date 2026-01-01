## Why

As the floorplan DSL evolves, breaking changes become necessary (e.g., removing deprecated syntax, changing semantics). Without versioning:
- Users cannot pin to a specific grammar version
- Breaking changes affect all existing floorplans silently  
- No migration path or deprecation warnings
- Difficult to maintain backward compatibility

A grammar versioning system enables:
- Explicit version declaration per floorplan file
- Deprecation warnings before breaking changes
- Automated migration tooling
- Clear communication about compatibility

## What Changes

### 1. Version Declaration Syntax

Support version declaration via YAML frontmatter (aligned with `align-config-with-mermaid` proposal):

```floorplan
---
version: "1.0"
title: My Villa
---
floorplan
  floor Ground { ... }
```

Or inline directive for simpler files:

```floorplan
%%{version: 1.0}%%
floorplan
  floor Ground { ... }
```

### 2. Semantic Versioning

The grammar follows semantic versioning (MAJOR.MINOR.PATCH):

| Version Bump | Meaning | Example |
|--------------|---------|---------|
| MAJOR | Breaking changes | Removing `door_width` in favor of `door_size` |
| MINOR | New features (backward compatible) | Adding `size` to connections |
| PATCH | Bug fixes | Fixing parser edge cases |

### 3. Version Compatibility Rules

- Files **without** version declaration: Assume latest version (with deprecation warning)
- Files with **older MAJOR version**: Parse with that version's grammar rules
- Files with **older MINOR version**: Parse with current grammar (fully compatible)
- Files with **unsupported version**: Error with migration guidance

### 4. Deprecation Lifecycle

```
v1.0: Feature X introduced
v1.1: Feature X deprecated (warning emitted)
v2.0: Feature X removed (error if used)
```

### 5. Migration Support

- `floorplan migrate <file> --to <version>` CLI command
- Automated AST transformation for common migrations
- Detailed migration guides in documentation

## Impact

- **Affected specs:** `dsl-grammar`
- **Affected code:**
  - `language/src/diagrams/floorplans/floorplans.langium` - Add version parsing
  - `language/src/floorplans-module.ts` - Version-aware service configuration
  - `language/src/floorplans-validator.ts` - Deprecation warnings
  - New: `language/src/diagrams/floorplans/version-resolver.ts`
  - New: `language/src/diagrams/floorplans/migrator.ts`
- **Breaking changes:** None initially (versioning itself is additive)

## Design Considerations

### Why YAML Frontmatter?

1. **Mermaid alignment** - Consistent with existing `align-config-with-mermaid` proposal
2. **Standard format** - YAML is widely understood
3. **Extensible** - Can include other metadata (title, description, author)
4. **Tooling support** - Many editors recognize YAML frontmatter

### Why Not Langium Grammar Inheritance?

Langium supports grammar inheritance, but:
- Increases maintenance burden (multiple grammar files)
- Harder to deprecate features gracefully
- Doesn't provide migration tooling

### Current Version

Initial grammar version: **1.0.0**

All existing features are part of v1.0. Future changes will follow semver.

## Examples

### File with version
```floorplan
---
version: "1.0"
---
floorplan
  floor Ground {
    config { door_width: 3, default_unit: ft }
    room Kitchen size (10 x 12) at (0, 0)
  }
```

### Future v2.0 with breaking change
```floorplan
---
version: "2.0"
---
floorplan
  floor Ground {
    config { door_size: (3 x 7), default_unit: ft }  # door_width removed in v2.0
    room Kitchen size (10 x 12) at (0, 0)
  }
```

### Migration warning (v1.0 file using deprecated feature)
```
⚠ Deprecation warning: 'door_width' and 'door_height' are deprecated.
  Use 'door_size: (width x height)' instead.
  This will become an error in version 2.0.
  Run 'floorplan migrate file.floorplan --to 2.0' to auto-fix.
```

