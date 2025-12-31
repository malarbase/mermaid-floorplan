## Why

Currently all spatial values in the DSL are unit-less numbers (e.g., `size (10 x 12)`, `at (5, 10)`, `gap 2`), which creates ambiguity about physical scale and makes it harder for users to work with real-world measurements. Adding explicit unit support (meters, feet, centimeters, inches, millimeters) will improve clarity and enable automatic unit conversion.

## What Changes

- Add `LengthUnit` parser rule supporting `m`, `ft`, `cm`, `in`, `mm`
- Add `ValueWithUnit` parser rule that pairs a number with an optional unit
- Modify `Dimension` rule to use `ValueWithUnit` instead of plain `NUMBER`
- Modify `Coordinate` rule to use `ValueWithUnit` for x and y
- Modify `RelativePosition` gap to use `ValueWithUnit`
- Modify room `height` and `elevation` to use `ValueWithUnit`
- Add `default_unit` config property to set floorplan-wide default unit
- Add `DEFAULT_UNIT` constant to `viewer/src/constants.ts` as system fallback
- Add unit normalization logic to convert all values to a canonical internal unit (meters)
- Add validation for consistent unit usage within a floorplan
- Backward compatible: unit-less values use `default_unit` (or system default if not configured)

## Impact

- Affected specs: `dsl-grammar`
- Affected code:
  - `language/src/diagrams/floorplans/floorplans.langium` - Grammar definition
  - `language/src/generated/ast.ts` - Regenerated AST types
  - `language/src/diagrams/floorplans/*.ts` - Parser/validator updates
  - `viewer/src/dsl-parser.ts` - 3D viewer parser
  - `viewer/src/constants.ts` - Add DEFAULT_UNIT constant
  - `src/renderer.ts` - 2D renderer

