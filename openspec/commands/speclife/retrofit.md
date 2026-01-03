---
name: /speclife-retrofit
id: speclife-retrofit
category: SpecLife
description: Formalize ad-hoc changes on main into a proper spec-tracked change for review.
---
# /speclife retrofit

Formalize ad-hoc changes made on main into a spec-tracked change with PR for review and release.

## ⚡ Execution

**When this command is invoked, IMMEDIATELY execute the workflow below.**

- Do NOT skip steps or ask for confirmation before starting
- If description is missing, prompt the user
- If no changes detected on main, error and explain
- Create spec, validate, branch, commit, archive, and create PR
- **STOP after PR created—do NOT auto-invoke `/speclife land`**

## Usage

```
/speclife retrofit "<description>"     # Formalize changes with spec
/speclife retrofit                     # Interactive (prompt for description)
```

## Goal

Convert ad-hoc changes on main into a proper spec-tracked workflow:
1. Document the change with a spec (proposal + tasks)
2. Move changes to a spec branch for review
3. Archive the spec
4. Create PR for approval before merging back

This bridges quick ad-hoc work with the spec-driven process.

## When to Use

- Made changes on main without going through `/speclife start`
- Want to properly document and review ad-hoc changes
- Need to create a release-worthy PR from untracked work

## Prerequisites

Must be on `main` branch with one of:
- Uncommitted changes (modified/staged files)
- Recent commits not yet pushed

```bash
# Validation
BRANCH=$(git branch --show-current)
[[ "$BRANCH" != "main" ]] && error "Must be on main branch"

# Check for changes
UNCOMMITTED=$(git status --porcelain)
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null)

[[ -z "$UNCOMMITTED" && -z "$UNPUSHED" ]] && error "No changes to retrofit"
```

## Core Steps

### 1. Detect Changes

```bash
# Show what will be retrofitted
echo "Changes to retrofit:"
git status --short              # Uncommitted changes
git log origin/main..HEAD --oneline  # Unpushed commits (if any)
```

### 2. Derive change-id

Convert description to kebab-case:
- "Update ship command to use two commits" → `update-ship-two-commits`
- Prefix with verb: add-, fix-, update-, remove-, refactor-
- Keep it short (3-5 words max)

```bash
CHANGE_ID=<derived-from-description>
SPEC_DIR="openspec/changes/${CHANGE_ID}"
```

### 3. Create Spec

Invoke `/openspec-proposal` with the description:
- Creates `openspec/changes/<change-id>/proposal.md`
- Creates `openspec/changes/<change-id>/tasks.md`
- Tasks should reflect what was ALREADY DONE (mark completed)

**Important:** The proposal documents what was implemented, not what needs to be done.

### 4. Validate Spec

```bash
openspec validate <change-id>
```

Fix any validation errors before proceeding.

### 5. Create Spec Branch

```bash
# Create and switch to spec branch (carries uncommitted changes)
git checkout -b spec/<change-id>
```

Note: Uncommitted changes automatically move to the new branch.

### 6. Commit Implementation + Spec

Read proposal.md for commit message, then:

```bash
git add -A
git commit -m "<type>: <description>"
```

This commit includes:
- The ad-hoc implementation changes
- The spec files (proposal.md, tasks.md)

### 7. Archive Spec

Run `/openspec-archive`:
- Moves spec to `openspec/changes/archive/<date>-<change-id>/`
- May require updating `project.md` (follow archive prompts)

### 8. Commit Archive

```bash
git add -A
git commit -m "chore: archive <change-id> spec"
```

### 9. Push and Create PR

```bash
git push -u origin spec/<change-id>
gh pr create --fill --base main
```

### 10. Reset Main (Safety)

After successful PR creation, main should be clean:

```bash
# Main is already clean because:
# - Uncommitted changes moved to spec branch
# - We're now on spec branch, not main
```

### 11. Report and STOP

```
✓ Detected changes in: <list of changed files>
✓ Created spec at openspec/changes/<change-id>/
✓ Validated spec
✓ Created branch spec/<change-id>
✓ Committed: "<type>: <description>"
✓ Archived spec
✓ Committed: "chore: archive <change-id> spec"
✓ Pushed to origin/spec/<change-id>
✓ Created PR #XX: <url>

Your changes are now on spec/<change-id> (main is unchanged).

Next: After approval, run /speclife land
```

**⛔ STOP HERE.** Do NOT proceed to merge. Wait for:
1. PR review and approval
2. User to invoke `/speclife land`

---

<!-- REFERENCE SECTIONS - Read only when needed -->

## Appendix: Examples

**Basic retrofit:**
```
User: /speclife retrofit "update ship command workflow"

Agent:
ℹ️ On main branch
✓ Detected changes:
   - openspec/commands/speclife/ship.md (modified)
✓ Derived change-id: update-ship-workflow
✓ Created spec at openspec/changes/update-ship-workflow/
✓ Validated spec
✓ Created branch spec/update-ship-workflow
✓ Committed: "docs: update ship command workflow"
✓ Archived spec
✓ Committed: "chore: archive update-ship-workflow spec"
✓ Pushed to origin/spec/update-ship-workflow
✓ Created PR #47

Next: After approval, run /speclife land
```

**With unpushed commits:**
```
User: /speclife retrofit "add retrofit command"

Agent:
ℹ️ On main branch
✓ Detected changes:
   - 2 unpushed commits
   - openspec/commands/speclife/retrofit.md (new file)
✓ Derived change-id: add-retrofit-command
✓ Created spec at openspec/changes/add-retrofit-command/
...
```

**Interactive:**
```
User: /speclife retrofit

Agent:
ℹ️ Detected uncommitted changes:
   - src/api.ts (modified)
   - src/utils.ts (modified)

What do these changes do? (describe for the spec)

User: Add rate limiting to API endpoints

Agent:
✓ Derived change-id: add-rate-limiting
...
```

## Appendix: Error Handling

**Not on main:**
```
❌ Must be on main branch to retrofit.
   Current branch: feature/something
   
   Either:
   1. Switch to main: git checkout main
   2. Use /speclife ship for non-main branches
```

**No changes to retrofit:**
```
❌ No changes to retrofit.
   
   Working directory is clean and no unpushed commits.
   
   Make some changes first, then run /speclife retrofit
```

**Spec already exists:**
```
❌ Spec 'update-ship-workflow' already exists.
   
   Either:
   1. Choose a different description
   2. Remove existing: rm -rf openspec/changes/update-ship-workflow/
   3. Use /speclife start "resume update-ship-workflow" to continue existing
```

**Validation failed:**
```
❌ Spec validation failed:
   - proposal.md: Missing "What" section
   
Fix issues and retry.
```

## Appendix: Comparison with Other Commands

| Command | Starting Point | Creates Spec? | Flow |
|---------|---------------|---------------|------|
| `/speclife start` | Clean main | Yes (before implementation) | Spec → Implement → Ship |
| `/speclife retrofit` | Main with changes | Yes (after implementation) | Implement → Spec → Ship |
| `/speclife ship` | Spec branch | No (uses existing) | Ship existing work |

## Appendix: What Gets Committed

**First commit** (implementation + spec):
```
<type>: <description>

- Implementation changes (the ad-hoc work)
- openspec/changes/<change-id>/proposal.md
- openspec/changes/<change-id>/tasks.md
```

**Second commit** (archive):
```
chore: archive <change-id> spec

- Move spec to archive/
- Update project.md (if applicable)
```

## Notes

- Retrofit is for MAIN branch only (ad-hoc changes)
- For changes on feature branches, use `/speclife ship` instead
- The spec documents what WAS done, not what NEEDS to be done
- Tasks in tasks.md should be marked as completed
- Main branch stays clean (changes move to spec branch)

