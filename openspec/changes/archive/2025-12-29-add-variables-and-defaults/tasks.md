## 1. Grammar Updates
- [x] 1.1 Add `define` rule for dimension variables (e.g., `define standard_bed (12 x 12)`)
- [x] 1.2 Add `config` block rule for global defaults (e.g., `config { wall_thickness: 0.3 }`)
- [x] 1.3 Update size/coordinate to accept variable references (identifiers)

## 2. AST Generation
- [x] 2.1 Run Langium to regenerate AST types

## 3. Variable Resolution
- [x] 3.1 Add variable resolution logic to substitute variables with actual values
- [x] 3.2 Add validation for undefined variables
- [x] 3.3 Export resolution functions from language module

## 4. MCP Server Integration
- [x] 4.1 Update MCP parser/renderer to resolve variables before rendering

## 5. Testing
- [x] 5.1 Add parser tests for define statements
- [x] 5.2 Add parser tests for config blocks
- [x] 5.3 Add resolution tests for variable substitution
- [x] 5.4 Add rendering tests with variables

