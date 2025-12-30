## Why
Currently, floors are independent. Explicitly linking rooms vertically ensures structural columns align and makes 3D generation smarter for multi-story buildings.

## What Changes
- Add `stacks-above` property to room definition
- Validate that stacked rooms have compatible dimensions (optional)
- Use stacking info to auto-calculate elevation and X/Z offsets if not provided

## Impact
- Affected specs: `dsl-grammar`, `rendering`
- Affected code: `language/src`, `scripts/export-json.ts`

