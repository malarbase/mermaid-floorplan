## Why
Users encounter confusing parse errors when room attributes (`height`, `elevation`, `label`) are specified in a different order than the strict grammar requirement. This creates a poor UX and makes the DSL feel unnecessarily rigid.

## What Changes
- Modify Langium grammar to accept room attributes in any order (after `size`, before `walls`)
- Maintain `size` and `walls` as anchor points with fixed positions
- Support flexible ordering of: `at`, `height`, `elevation`, `label`, relative positioning

## Impact
- Affected specs: `dsl-grammar`
- Affected code: `language/src/diagrams/floorplans/floorplans.langium`
- **Breaking**: None (backward compatible - existing order still works)

