## 1. Grammar Updates

- [ ] 1.1 Add optional YAML frontmatter rule to grammar (before `floorplan` keyword)
- [ ] 1.2 Add camelCase alternatives to CONFIG_KEY terminal rule
- [ ] 1.3 Add new config properties: `theme`, `fontFamily`, `fontSize`, `showLabels`, `showDimensions`, `dimensionUnit`
- [ ] 1.4 Update ConfigProperty to support nested floorplan config object
- [ ] 1.5 Add directive rule for `%%{init: {...}}%%` syntax (optional)

## 2. Config Schema Definition

- [ ] 2.1 Create TypeScript interface for FloorplanConfig with all properties
- [ ] 2.2 Create defaultConfig constant with all default values
- [ ] 2.3 Implement config normalization (snake_case → camelCase)
- [ ] 2.4 Implement config merge logic (default → site → diagram)

## 3. Parser Updates

- [ ] 3.1 Add YAML frontmatter parsing (use js-yaml or simple parser)
- [ ] 3.2 Extract frontmatter config before Langium parsing
- [ ] 3.3 Merge frontmatter config with inline config block

## 4. Renderer Integration

- [ ] 4.1 Update render() to accept resolved config object
- [ ] 4.2 Apply theme config to style resolution
- [ ] 4.3 Apply font config to SVG text elements
- [ ] 4.4 Add showLabels/showDimensions toggle support

## 5. Validation

- [ ] 5.1 Add validation for unknown config keys (warning)
- [ ] 5.2 Add validation for config value types and ranges
- [ ] 5.3 Validate theme name exists in theme registry

## 6. 3D Viewer Updates

- [ ] 6.1 Update viewer config parsing to handle new structure
- [ ] 6.2 Ensure camelCase property access works

## 7. Documentation

- [ ] 7.1 Update DSL reference in project.md
- [ ] 7.2 Add frontmatter examples to trial/ folder
- [ ] 7.3 Document migration from snake_case to camelCase

## 8. Testing

- [ ] 8.1 Add parser tests for frontmatter syntax
- [ ] 8.2 Add parser tests for camelCase config keys
- [ ] 8.3 Add config merge tests
- [ ] 8.4 Add backward compatibility tests (snake_case still works)

