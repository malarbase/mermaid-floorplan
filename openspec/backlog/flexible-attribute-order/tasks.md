## 1. Grammar Analysis and Design
- [ ] 1.1 Research Langium grammar patterns for flexible attribute ordering
- [ ] 1.2 Identify parsing ambiguities that must be avoided
- [ ] 1.3 Design grammar structure that allows flexible ordering without conflicts
- [ ] 1.4 Document the chosen approach and alternatives considered

## 2. Grammar Implementation
- [ ] 2.1 Modify Room rule in `floorplans.langium` to support flexible ordering
- [ ] 2.2 Ensure `size` and `walls` maintain their anchor positions
- [ ] 2.3 Make optional attributes (`height`, `elevation`, `label`, relative position) order-independent
- [ ] 2.4 Handle duplicate attribute detection gracefully

## 3. Generator and Build
- [ ] 3.1 Run `langium generate` and resolve any schema validation issues
- [ ] 3.2 Fix TypeScript compilation errors in generated code
- [ ] 3.3 Verify AST structure remains consistent with existing code

## 4. Testing
- [ ] 4.1 Add parser tests for various attribute orderings
- [ ] 4.2 Test all permutations of 2-3 optional attributes
- [ ] 4.3 Verify existing floorplan files still parse correctly
- [ ] 4.4 Test error messages for missing required attributes
- [ ] 4.5 Test duplicate attribute handling

## 5. Documentation
- [ ] 5.1 Update grammar documentation/examples
- [ ] 5.2 Update `src/floorplans.mdc` with flexible ordering examples
- [ ] 5.3 Add migration guide (even though backward compatible)

