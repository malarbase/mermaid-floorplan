---
name: /speclife-start
id: speclife-start
category: SpecLife
description: Create a new branch for a change, optionally in a worktree for parallel work.
---
# /speclife start

Create a new branch for a change, optionally in a worktree for parallel work.

## ⚡ Execution

**When this command is invoked, IMMEDIATELY execute the workflow below.**

- Do NOT skip steps or jump straight to implementation
- If mid-conversation, treat the invocation as "start fresh with this workflow"
- If required inputs are missing (description), prompt the user
- If user says "based on context", derive the description from recent discussion
- **STOP after scaffolding proposal—do NOT auto-invoke `/openspec-apply`**

## Usage

```
/speclife start <description>               # New proposal, worktree (default)
/speclife start <description> in a branch   # New proposal, branch-only
/speclife start "resume <change-id>"        # Resume existing proposal, worktree
/speclife start "implement <change-id>"     # Resume if exists, create if not
/speclife start                             # Interactive
```

## Goal

Set up a workspace for a new change with proper git branch.

## Mode Detection

Parse the input for workflow hints in this order:

### 1. Resume Intent Detection

| Phrase in input | Meaning |
|-----------------|---------|
| "resume <change-id>", "continue <change-id>", "pick up <change-id>" | **Resume existing proposal** (error if not found) |
| "implement <change-id>" | **Resume if exists**, create new if not |

Examples:
- `"resume fix-release-and-init"` → resume mode, change-id = `fix-release-and-init`
- `"continue working on add-oauth-login"` → resume mode, change-id = `add-oauth-login`
- `"implement fix-email-validation"` → try resume, fallback to new

### 2. Worktree Mode Detection

| Phrase in input | Mode |
|-----------------|------|
| "in a branch", "branch only", "no worktree", "simple" | **Branch-only** |
| "in a worktree", "with worktree", "parallel" | **Worktree** |
| Neither | **Worktree** (default) |

### 3. Parsing Order

1. Check for resume keywords → extract change-id
2. Check for mode keywords → determine worktree/branch
3. Strip workflow hints → derive description (new proposals only)

Examples:
- `"resume fix-bug in a branch"` → resume mode, branch-only
- `"implement oauth with worktree"` → resume/new mode, worktree

## Steps

### 1. Check for Resume Intent

Parse input for resume keywords (`resume`, `continue`, `pick up`, `implement`):

**If resume intent detected:**
```bash
CHANGE_ID=<extracted-from-input>  # e.g., "fix-release-and-init"
PROPOSAL_DIR="openspec/changes/${CHANGE_ID}"

if [[ ! -d "$PROPOSAL_DIR" ]]; then
  echo "❌ Proposal '${CHANGE_ID}' not found"
  echo ""
  echo "Available proposals:"
  ls -1 openspec/changes/ | grep -v archive
  exit 1
fi

echo "✓ Found existing proposal at ${PROPOSAL_DIR}/"
# Skip to step 3 (create branch/worktree)
```

**If "implement" keyword and proposal doesn't exist:**
- Continue as new proposal (steps 2-5)

**If no resume intent:**
- Continue to step 2

### 2. Derive change-id (New Proposals Only)

Convert description to kebab-case:
- "Add user authentication" → `add-user-auth`
- Prefix with verb: add-, fix-, update-, remove-, refactor-
- Keep it short (3-5 words max)

### 3. Create branch/worktree

**Branch-only mode:**
```bash
git checkout -b spec/<change-id>
```
- Works in current directory
- One change at a time (switch branches to context-switch)

**Worktree mode (default):**
```bash
speclife worktree create <change-id>
```
- Creates `worktrees/<change-id>/`
- Creates branch `spec/<change-id>`
- Parallel changes possible

### 4. Scaffold proposal (New Proposals Only)

**Skip this step if resuming an existing proposal.**

Invoke `/openspec-proposal` with the description (minus workflow hints)
- Creates `openspec/changes/<change-id>/proposal.md`
- Creates `openspec/changes/<change-id>/tasks.md`

### 5. Report and STOP

**New Proposal - Branch-only:**
```
✓ Derived change-id: add-oauth-login
✓ Created branch spec/add-oauth-login
✓ Scaffolded proposal at openspec/changes/add-oauth-login/

Next: Review the proposal, then run `/openspec-apply` to implement.
```

**New Proposal - Worktree:**
```
✓ Derived change-id: add-oauth-login
✓ Created worktree at worktrees/add-oauth-login/
✓ Created branch spec/add-oauth-login
✓ Scaffolded proposal at openspec/changes/add-oauth-login/

⚠️  IMPORTANT: You must work from the worktree directory!

Next steps:
1. Switch to worktree: cd worktrees/add-oauth-login/
2. Invoke /openspec-apply from there

🚨 CRITICAL: All file edits MUST happen in:
   worktrees/add-oauth-login/openspec/...
   worktrees/add-oauth-login/packages/...
   
   NOT in the main repo paths!
```

**Resume Proposal - Branch-only:**
```
✓ Found existing proposal at openspec/changes/fix-release-and-init/
✓ Created branch spec/fix-release-and-init
ℹ️ Proposal already defined - ready to implement

Next: Run `/openspec-apply` to implement tasks.
```

**Resume Proposal - Worktree:**
```
✓ Found existing proposal at openspec/changes/fix-release-and-init/
✓ Created worktree at worktrees/fix-release-and-init/
✓ Created branch spec/fix-release-and-init
ℹ️ Proposal already defined - ready to implement

Next: cd worktrees/fix-release-and-init/ then run `/openspec-apply`.
```

**⛔ STOP HERE.** Do NOT proceed to implementation. Wait for user to:
1. Review the proposal (if new)
2. Switch to worktree directory (if worktree mode)
3. Invoke `/openspec-apply` or `/speclife implement`

## Examples

**New proposals:**
```
User: /speclife start "Add OAuth login support"
→ Creates worktree (default), scaffolds new proposal

User: /speclife start "Add OAuth login" in a branch
→ Creates branch only, scaffolds new proposal

User: /speclife start "fix login bug" branch only
→ Creates branch only, scaffolds new proposal
```

**Resume existing proposals:**
```
User: /speclife start "resume fix-release-and-init"
→ Creates worktree, uses existing proposal

User: /speclife start "continue working on add-oauth-login"
→ Creates worktree, uses existing proposal

User: /speclife start "pick up fix-email-validation in a branch"
→ Creates branch only, uses existing proposal

User: /speclife start "implement add-user-auth"
→ If proposal exists: resumes it
→ If not: creates new proposal
```

**Error case:**
```
User: /speclife start "resume nonexistent-change"

Agent:
❌ Proposal 'nonexistent-change' not found

Available proposals:
  fix-release-and-init
  add-oauth-login
  fix-email-validation
```

**Interactive:**
```
User: /speclife start
→ Prompts: "Describe your change" then "Worktree (default) or branch-only?"
```

## Tradeoffs

| Aspect | Worktree | Branch-only |
|--------|----------|-------------|
| Parallel changes | ✓ Multiple worktrees | One at a time |
| IDE support | May need reload | Seamless |
| Setup complexity | More dirs | Simpler |
| Context switching | cd to worktree | git checkout |

## Naming Conventions

- Use kebab-case for change-id
- Prefix with action verb: `add-`, `fix-`, `update-`, `remove-`, `refactor-`
- Keep it descriptive but concise
- Examples:
  - `add-user-auth`
  - `fix-login-redirect`
  - `update-api-docs`
  - `remove-deprecated-endpoint`
  - `refactor-database-layer`

## Notes

### General
- Branch name is always `spec/<change-id>` regardless of mode
- If branch exists, error and suggest using existing
- Branch-only: uncommitted changes carry over (stash if needed)
- Worktree: clean checkout from main
- To switch modes later, use `/speclife convert`

### Resume Behavior
- Resume keywords: `resume`, `continue`, `pick up`, `implement`
- Proposals must exist in `openspec/changes/<change-id>/`
- Archived proposals are not searched (move from archive first if needed)
- Resume skips `/openspec-proposal` scaffolding
- "implement" keyword tries resume first, creates new if not found
- Combine with mode: "resume X in a branch" or "resume X with worktree"

### Next Steps
- After creating new proposal: Review, refine, then `/openspec-apply`
- After resuming proposal: Directly run `/openspec-apply` to implement tasks
- Both workflows converge at implementation phase
