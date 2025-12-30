## 1. Grammar Changes

- [ ] 1.1 Add `LengthUnit` parser rule with supported units (`m`, `ft`, `cm`, `in`, `mm`)
- [ ] 1.2 Add `ValueWithUnit` parser rule combining NUMBER with optional LengthUnit
- [ ] 1.3 Update `Dimension` rule to use `ValueWithUnit` for width and height
- [ ] 1.4 Update `Coordinate` rule to use `ValueWithUnit` for x and y
- [ ] 1.5 Update `RelativePosition` gap to use `ValueWithUnit`
- [ ] 1.6 Update room `height` and `elevation` to use `ValueWithUnit`
- [ ] 1.7 Add `default_unit` to CONFIG_KEY rule
- [ ] 1.8 Regenerate Langium artifacts (`npm run langium:generate`)

## 2. Constants and Defaults

- [ ] 2.1 Add `DEFAULT_UNIT: 'm'` constant to `viewer/src/constants.ts`
- [ ] 2.2 Add unit conversion utility functions (to/from meters)
- [ ] 2.3 Add function to resolve effective unit (explicit > config default > system default)

## 3. AST and Type Updates

- [ ] 3.1 Update AST type definitions for `ValueWithUnit`, `Dimension`, `Coordinate`
- [ ] 3.2 Add type guards and helper functions for unit handling
- [ ] 3.3 Add `LengthUnit` type definition with all supported units

## 4. Validation

- [ ] 4.1 Add validation for mixed units warning (e.g., mixing meters and feet)
- [ ] 4.2 Add validation for invalid `default_unit` value in config
- [ ] 4.3 Ensure backward compatibility (unit-less numbers use default unit)

## 5. Parser Integration

- [ ] 5.1 Update 2D renderer to handle units in all spatial values
- [ ] 5.2 Update 3D viewer parser to handle units in all spatial values
- [ ] 5.3 Add unit normalization before rendering (convert to internal meters)
- [ ] 5.4 Respect `default_unit` config when resolving unit-less values

## 6. Testing

- [ ] 6.1 Add parser tests for dimensions with various units
- [ ] 6.2 Add parser tests for coordinates with units
- [ ] 6.3 Add parser tests for gap with units
- [ ] 6.4 Add parser tests for unit-less values (backward compatibility)
- [ ] 6.5 Add tests for `default_unit` config behavior
- [ ] 6.6 Add validation tests for mixed unit warnings
- [ ] 6.7 Add rendering tests to verify correct scale with different units

