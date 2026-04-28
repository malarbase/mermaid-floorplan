# mermaid-floorplan evals

This directory contains the eval suite that exercises the four core
workflows of the `mermaid-floorplan` skill, plus the variations and
critic side-channels.

## Layout

```
evals/
  README.md            # this file
  evals.json           # 11 prompts + assertions
  grader.mjs           # deterministic per-assertion grader
  fixtures/            # input artifacts referenced by evals
  runs/
    iteration-N/
      with-skill/
        <eval_id>/
          inputs/      # symlinked / copied fixtures
          outputs/     # files produced by the agent
          metrics.json # wall-clock, tool-call counts, exit-codes
          transcript.md
      baseline/
        <eval_id>/
          ...
      benchmark.json   # aggregated grader output
      benchmark.md     # human-readable summary (analyst pass)
      feedback.json    # human review captured via eval-viewer
```

## Running an iteration

The iteration loop has four phases:

1. **Author runs** — for each eval × arm combination, spawn a subagent
   that consumes the prompt + fixtures and writes its outputs into
   `runs/<iteration>/<arm>/<eval_id>/outputs/`. Each subagent records
   its own `metrics.json` (wall clock, tool-call count, exit code) and
   `transcript.md`.

   - `with-skill` subagents start with the full skill loaded
     (`SKILL.md`, references, scripts).
   - `baseline` subagents only know the DSL exists and have access to
     `mermaid-floorplan/examples/`.

   ### Subagent discipline (lessons from iterations 1 and 2)

   Every subagent prompt must include the following non-negotiable
   instructions verbatim, in this order, before the eval prompt:

   1. **Filenames are exact.** Match every name in `must_produce` byte
      for byte (e.g. `plan.png`, not `plan-Studio.png`). When using the
      skill's `render.mjs`, pass `--out plan.png` explicitly so the
      default per-floor suffix does not kick in.
   2. **`metrics.json` is mandatory and is the last action.** Before
      exiting, write
      `<runDir>/metrics.json = { wall_clock_seconds, tool_calls,
       exit_status, notes }`. `exit_status` is `"ok"` if every
      `must_produce` artefact was written, `"failed"` otherwise.
   3. **Hard exit budget (added iteration-3).** Once you have produced
      all `must_produce` artefacts, you have **at most one** verification
      pass (a single re-validate / re-render / re-critic) before writing
      `metrics.json` and stopping. Do NOT iterate further "in case there
      is something to improve". Iterate before writing the final files,
      not after.
   4. **3-minute attempt budget per blocker.** If a single deliverable
      is not producible after 3 minutes of attempts, write
      `failure.md` next to `metrics.json` (with reason + last error)
      and exit. Do NOT silently fall back to a half-built artefact.
   5. **No exploratory rewrites after success.** If `validate.mjs` says
      `valid: true`, do NOT rewrite the DSL "to be safe". Stop and
      proceed to render → metrics.json → exit.

   The discipline above applies to BOTH arms. Baseline subagents in
   iteration-2 stalled because they kept exploring after producing
   outputs; rule 3 closes that gap.

2. **Grade** — `node grader.mjs --eval-all --iteration iteration-N` runs
   every assertion in `evals.json` against every arm. Result aggregated
   into `runs/iteration-N/benchmark.json`.

3. **Analyst pass** — a separate subagent reads the benchmark JSON,
   pulls the failure transcripts, and writes `benchmark.md` with:
   - per-eval table (with-skill vs baseline pass counts)
   - aggregated failure modes
   - estimated tool-call savings

4. **Human review** — launch the eval viewer:

   ```bash
   python3 ../../../../AutoSkill/SkillBank/Common/anthropics-skill/skill-creator/eval-viewer/generate_review.py \
     evals/runs/iteration-N --skill-name mermaid-floorplan
   ```

   Capture comments to `runs/iteration-N/feedback.json`. Address each
   comment in iteration `N+1`, or mark it as wontfix with rationale.

## Authoring new evals

Each eval entry needs:

- `id`: lowercase snake-case identifier
- `workflow`: A / B / C / D / B+critic
- `prompt`: exactly the natural-language task the agent will see
- `fixture` (optional): relative path to a file the agent should treat
  as input
- `must_produce`: list of file paths (relative to the run's `outputs/`)
  the agent must write
- `assertions`: list of `{ kind, ... }` declarative checks

The supported assertion kinds live at the top of `grader.mjs`. Add new
kinds by registering a handler in the `ASSERTIONS` object.

## Why two arms?

The hypothesis behind this skill is "loading SKILL.md + references +
scripts dramatically reduces the tool-calls needed to produce a valid
`.floorplan`". The baseline arm is the control group — same prompt, no
skill — and lets us measure the actual lift. The grader scores both
arms with the exact same assertions, so the comparison is apples-to-
apples.
