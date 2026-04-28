# Scripts contract

All scripts in this folder share one contract so the agent can call them
uniformly without reading each source file.

## Languages

- `.mjs` scripts are Node ESM. Run with `node <script>.mjs`.
- `.py` scripts are Python 3. Run with `python3 <script>.py`.

## Input

Every script that consumes DSL accepts it the same three ways, tried in
order:

1. `--dsl '<literal>'` — DSL text inline on the command line.
2. `--file <path>` or the first positional argument — path to a
   `.floorplan` (or any readable text file).
3. stdin — if neither of the above is set and stdin is not a TTY.

Scripts that consume other kinds of input (JSON briefs, PDFs, images) use
explicit named flags and document them in their `--help` and in SKILL.md.

## Output

Every script emits **exactly one line of JSON** to stdout and exits. The
envelope:

```
{
  "success": true | false,
  "data": { ... script-specific payload ... } | null,
  "warnings": [{ "message": "...", "line": 42, ...optional fields... }],
  "errors":   [{ "message": "...", "line": 42, ...optional fields... }]
}
```

Binary artifacts (PNG/SVG files, rasterized frames, variation directories)
are written to disk; their absolute paths are returned inside `data`.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. `success: true` in the envelope. |
| `1` | Validation or user-input error (bad DSL, missing file, unknown operation, low-confidence brief rejected). `success: false`. |
| `2` | Runtime or unexpected error (missing optional dependency, I/O failure, thrown exception). `success: false`. |

## Common flags

- `--strict` — promote warnings to errors. Supported by `validate.mjs`,
  `design_critic.mjs`, and `mcp_parity_check.mjs`.
- `--dpi <int>` — output DPI for ingest / rasterization. Supported by
  `ingest_source.py` (default 200, max recommended 600).
- `--out <path>` — destination file or directory. Every script that writes
  artifacts supports this; the default is always shown in the script's
  header comment.
- `--width <int>` — output width in pixels for rendering (default 900).
- `--quiet` — suppress non-essential warnings in the envelope (errors are
  never suppressed).

## Example

Render a template to PNG with dimensions and areas:

```bash
node render.mjs ../assets/templates/two-br.floorplan \
    --out /tmp/two-br.png \
    --show-area --show-dimensions \
    --area-unit sqft --length-unit ft
```

Validate and chain into design critic:

```bash
node validate.mjs --file plan.floorplan \
  && node design_critic.mjs --file plan.floorplan --strict
```

Modify a plan with a JSON ops file:

```bash
node modify.mjs --file plan.floorplan --ops ops.json --out plan.v2.floorplan
```

Where `ops.json` is a JSON array of operations matching the schema in
`modify.mjs` (same shape as the MCP `modify_floorplan` tool).

## Shared libraries

- [`_lib.mjs`](_lib.mjs) — Node helpers: argv parsing, DSL input resolution,
  Langium parse/validate, JSON envelope emitters, runtime wrapper.
- [`_lib.py`](_lib.py) — Python helpers: argv parsing, JSON envelope
  emitters, dependency preflight (`pdf2image`, `PIL`).
