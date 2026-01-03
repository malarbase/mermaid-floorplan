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
/speclife start <description>               # Worktree (default)
/speclife start <description> in a branch   # Branch-only
/speclife start                             # Interactive
```

## Goal

Set up a workspace for a new change with proper git branch.

## Mode Detection

Parse the input for workflow hints:

| Phrase in input | Mode |
|-----------------|------|
| "in a branch", "branch only", "no worktree", "simple" | **Branch-only** |
| "in a worktree", "with worktree", "parallel" | **Worktree** |
| Neither | **Worktree** (default) |

Strip workflow hints from the description before deriving change-id.

## Steps

### 1. Derive change-id

Convert description to kebab-case:
- "Add user authentication" → `add-user-auth`
- Prefix with verb: add-, fix-, update-, remove-, refactor-
- Keep it short (3-5 words max)

### 2. Create branch/worktree

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

### 3. Scaffold proposal

Invoke `/openspec-proposal` with the description (minus workflow hints)
- Creates `openspec/changes/<change-id>/proposal.md`
- Creates `openspec/changes/<change-id>/tasks.md`

### 4. Report and STOP

**Branch-only:**
```
✓ Derived change-id: add-oauth-login
✓ Created branch spec/add-oauth-login
✓ Scaffolded proposal at openspec/changes/add-oauth-login/

Next: Review the proposal, then run `/openspec-apply` to implement.
```

**Worktree:**
```
✓ Derived change-id: add-oauth-login
✓ Created worktree at worktrees/add-oauth-login/
✓ Created branch spec/add-oauth-login
✓ Scaffolded proposal at openspec/changes/add-oauth-login/

Next: cd worktrees/add-oauth-login/ then run `/openspec-apply`.
```

**⛔ STOP HERE.** Do NOT proceed to implementation. Wait for user to:
1. Review the proposal
2. Invoke `/openspec-apply` or `/speclife implement`

## Examples

```
User: /speclife start "Add OAuth login support"
→ Creates worktree (default)

User: /speclife start "Add OAuth login" in a branch
→ Creates branch only, no worktree

User: /speclife start "fix login bug" branch only
→ Creates branch only

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

- Branch name is always `spec/<change-id>` regardless of mode
- If branch exists, error and suggest using existing
- Branch-only: uncommitted changes carry over (stash if needed)
- Worktree: clean checkout from main
- To switch modes later, use `/speclife convert`
