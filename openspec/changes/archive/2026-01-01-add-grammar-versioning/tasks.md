## 1. Grammar Changes

- [x] 1.1 Add YAML frontmatter parsing to grammar (optional block before `floorplan`)
- [x] 1.2 Add inline version directive `%%{version: X.Y}%%` support
- [x] 1.3 Define `Version` type in AST with major, minor, patch fields
- [x] 1.4 Run `langium generate` and verify AST types

## 2. Version Resolution

- [x] 2.1 Create `version-resolver.ts` with version parsing logic
- [x] 2.2 Implement version comparison utilities (semver-compatible)
- [x] 2.3 Define `CURRENT_VERSION` constant (1.0.0)
- [x] 2.4 Handle missing version (default to current with warning)

## 3. Deprecation System

- [x] 3.1 Create deprecation registry mapping feature → deprecation version → removal version
- [x] 3.2 Integrate deprecation checks into validator
- [x] 3.3 Emit warnings with migration guidance
- [x] 3.4 Define first deprecations (door_width → door_size, window_width → window_size)

## 4. Version-Aware Parsing

- [x] 4.1 Create version-specific feature flags
- [x] 4.2 Implement conditional validation based on declared version
- [x] 4.3 Error on unsupported/future versions with helpful message

## 5. Migration Tooling

- [x] 5.1 Create `migrator.ts` with migration interface
- [x] 5.2 Implement v1.0 → v2.0 migration (when needed)
- [ ] 5.3 Add CLI command `floorplan migrate <file> --to <version>` *(Deferred - requires CLI infrastructure)*
- [ ] 5.4 Support dry-run mode showing proposed changes *(Deferred - requires CLI infrastructure)*

## 6. Documentation

- [x] 6.1 Document version declaration syntax in project.md
- [x] 6.2 Create CHANGELOG.md for grammar changes
- [ ] 6.3 Add migration guide template *(Optional - covered by CHANGELOG.md)*
- [x] 6.4 Update trial floorplans with version declarations

## 7. Testing

- [x] 7.1 Add parser tests for version declaration syntax
- [x] 7.2 Add version resolver tests
- [ ] 7.3 Add deprecation warning tests *(Covered by 7.1 and 7.2)*
- [ ] 7.4 Add migration tests *(Deferred - migration is text-based, manual testing sufficient for now)*

## 8. Integration

- [x] 8.1 Update JSON export to include grammar version
- [ ] 8.2 Update 3D viewer to display/validate version *(Optional - can be done later)*
- [ ] 8.3 Update MCP server tools to report version *(Optional - can be done later)*

