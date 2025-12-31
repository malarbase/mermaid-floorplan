## 1. Grammar Changes

- [ ] 1.1 Add YAML frontmatter parsing to grammar (optional block before `floorplan`)
- [ ] 1.2 Add inline version directive `%%{version: X.Y}%%` support
- [ ] 1.3 Define `Version` type in AST with major, minor, patch fields
- [ ] 1.4 Run `langium generate` and verify AST types

## 2. Version Resolution

- [ ] 2.1 Create `version-resolver.ts` with version parsing logic
- [ ] 2.2 Implement version comparison utilities (semver-compatible)
- [ ] 2.3 Define `CURRENT_VERSION` constant (1.0.0)
- [ ] 2.4 Handle missing version (default to current with warning)

## 3. Deprecation System

- [ ] 3.1 Create deprecation registry mapping feature → deprecation version → removal version
- [ ] 3.2 Integrate deprecation checks into validator
- [ ] 3.3 Emit warnings with migration guidance
- [ ] 3.4 Define first deprecations (door_width → door_size, window_width → window_size)

## 4. Version-Aware Parsing

- [ ] 4.1 Create version-specific feature flags
- [ ] 4.2 Implement conditional validation based on declared version
- [ ] 4.3 Error on unsupported/future versions with helpful message

## 5. Migration Tooling

- [ ] 5.1 Create `migrator.ts` with migration interface
- [ ] 5.2 Implement v1.0 → v2.0 migration (when needed)
- [ ] 5.3 Add CLI command `floorplan migrate <file> --to <version>`
- [ ] 5.4 Support dry-run mode showing proposed changes

## 6. Documentation

- [ ] 6.1 Document version declaration syntax in project.md
- [ ] 6.2 Create CHANGELOG.md for grammar changes
- [ ] 6.3 Add migration guide template
- [ ] 6.4 Update trial floorplans with version declarations

## 7. Testing

- [ ] 7.1 Add parser tests for version declaration syntax
- [ ] 7.2 Add version resolver tests
- [ ] 7.3 Add deprecation warning tests
- [ ] 7.4 Add migration tests

## 8. Integration

- [ ] 8.1 Update JSON export to include grammar version
- [ ] 8.2 Update 3D viewer to display/validate version
- [ ] 8.3 Update MCP server tools to report version

