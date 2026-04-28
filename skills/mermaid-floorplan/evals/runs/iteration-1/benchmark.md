# Iteration 1 — Benchmark

Generated: 2026-04-24T23:11Z.

## Scope of this iteration

Only 1 of 11 evals (`create_studio`) was run in this iteration as a smoke test of the runner + grader pipeline, per the "start with the minimal subset" strategy. Both arms (`with-skill` and `baseline`) were exercised.

The remaining 10 evals (`create_2br_with_wet_walls`, `create_3br_house`, `modify_*`, `reverse_*`, `interactive_three_turns`, `generate_variations`, `fix_rough_studio`) are pending; see Analyst notes below before kicking them off.

## Scoreboard

| Eval | Arm | Passed | Total | Failing assertions |
| --- | --- | --- | --- | --- |
| create_studio | with-skill | 6 | 6 | — |
| create_studio | baseline | 5 | 6 | `render_exists` (wrong filename) |
| create_2br_with_wet_walls | both | — | — | not run |
| create_3br_house | both | — | — | not run |
| modify_rename_resize | both | — | — | not run |
| modify_add_closet | both | — | — | not run |
| modify_convert_to_relative | both | — | — | not run |
| reverse_engineer_from_image | both | — | — | not run |
| reverse_engineer_low_confidence | both | — | — | not run |
| interactive_three_turns | both | — | — | not run |
| generate_variations | both | — | — | not run |
| fix_rough_studio | both | — | — | not run |

## Timing / work volume

| Arm | Wall clock (s) | Tool calls | Exit status |
| --- | --- | --- | --- |
| with-skill | 226.8 | 20 | ok |
| baseline | 116 (file-mtime derived) | unknown | stalled_after_outputs |

## Qualitative comparison for `create_studio`

Both arms produced a valid 480 sqft studio with Kitchen, Bath, Entry, and Sleeping / Living. Differences:

- **Wet-wall stacking.** The with-skill plan stacks Kitchen → Bath → Entry in a single left-hand column, so plumbing shares a continuous wet wall (Kitchen.bottom↔Bath.top, Bath.bottom↔Entry.top). The baseline plan does the same stacking order but places **Entry on top** and pushes Kitchen to the bottom; plumbing still shares a wall, but the kitchen/bath pair is split by the bathroom rather than being the anchor of the wet stack.
- **Entry door location.** with-skill opens the front door to the outside through `Entry.bottom` (the short corridor-side wall below the stack). Baseline opens the front door through `Entry.top`, which in its layout is the outward-facing wall. Both make sense given their anchoring; neither is flagged by the critic.
- **Pass-through to the living volume.** with-skill uses a 6 ft-wide `opening` from Kitchen and a 4 ft opening from Entry, with a swing door only into the bath — an explicitly "studio open-plan" treatment. Baseline uses a `door` from Entry, `door` from Bath, and `double-door` from Kitchen — a more apartment-style treatment.
- **Windows.** Both give the Sleeping / Living volume multiple exterior windows (with-skill: top+right+bottom, baseline: top+bottom). Neither bedroom/living space is windowless.
- **DSL craft.** with-skill uses `right-of Kitchen align top` and `below` for relative positioning, with a single anchored room (`Kitchen at (0,0)`). Baseline uses `below Entry` / `below Bathroom` / `at (0,0)` + `at (4,0)` — two absolute anchors, so the relative graph is less cohesive.
- **Artefacts.** with-skill emits `plan.floorplan`, `plan.png`, `plan.svg`. Baseline emits `plan.floorplan` and `plan-Studio.png` (floor-name-suffixed), which is why `render_exists` fails even though a PNG does exist.

## Failing assertion details

### baseline → render_exists
- Expected: `plan.png` (≥ 5000 bytes).
- Actual: no `plan.png`, but `plan-Studio.png` (32 619 bytes) exists.
- Root cause: the default render script suffixes filenames per floor (`<stem>-<FloorId>.png`). The baseline subagent did not rename / pass an explicit `--out` for the aggregate PNG.
- Signal: the skill's `render.mjs` wrapping around resvg defaults to a single combined PNG named exactly as the `--out` argument; a baseline agent without the skill doesn't know this convention.

## Analyst notes — what iteration-1 taught us

1. **Grader had a latent bug.** `area_within`, `room_size`, and `room_size_grew` read `r.width` / `r.height`, but `analyze.mjs` returns `r.dimensions.width/height` plus `summary.grossFloorArea`. Fixed in this iteration (`evals/grader.mjs`) — both affected arms went from 4–5/6 → 5–6/6. Lesson: next iterations should include a dry-run of the grader against the skill's own templates (not just the subagent outputs) as a pre-flight sanity check.
2. **Subagent lifecycle is fragile.** The baseline subagent produced its deliverables in ~2 minutes and then stopped writing files for 14+ minutes while still reporting "running". The runner had to synthesize `metrics.json` post-hoc. Two runner improvements for iteration-2:
   - The run prompt must explicitly instruct every subagent to write `metrics.json` as the last action and then exit.
   - The runner should hard-timeout subagents that have been silent for > N minutes and synthesize a minimal `metrics.json` with `exit_status: "stalled_after_outputs"`.
3. **`must_produce` naming must be tighter.** Baselines are more likely to use "natural" filenames (`plan-Studio.png`) that break strict grader checks. Either tighten the prompt ("save the render as `plan.png` verbatim") or relax the assertion (accept any `plan*.png` ≥ minBytes). The eval spec is the right place to make this decision — leaving it as-is makes the assertion a **filename-discipline** signal, which is legitimate.
4. **with-skill wins on DSL craft, not correctness.** Both arms produce critic-clean 480 sqft studios; the skill-run plan is more idiomatic (single anchor + relative chain, openings vs doors tuned for a studio), but the baseline is not a failure mode — it's a working, valid studio. This matches the hypothesis: the skill differentiates on *polish* and *convention*, not on whether the agent can hit basic correctness.
5. **Pipeline is ready to scale.** Now that the grader is fixed and the metrics-synthesis fallback is proven, iteration-1 is complete from a *plumbing* standpoint. The next iteration can run all 11 evals × 2 arms.

## Suggested scope for iteration-2

- Before running: patch the runner prompt to require `metrics.json` as the last tool call, with a timeout-and-synthesize fallback.
- Run all 11 evals for both arms.
- Rerun the grader, emit `benchmark.json` + `benchmark.md`.
- Kick off `eval-viewer/generate_review.py` to produce the human-review HTML (the point of the `with-skill` vs `baseline` side-by-side is only useful once we have several evals to browse).
