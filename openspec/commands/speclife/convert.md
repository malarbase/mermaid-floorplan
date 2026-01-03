---
name: /speclife-convert
id: speclife-convert
category: SpecLife
description: Switch between branch-only and worktree modes for current change.
---
# /speclife convert

Switch between branch-only and worktree modes for current change.

## ⚡ Execution

**When this command is invoked, IMMEDIATELY execute the workflow below.**

- Parse "to worktree" or "to branch" from the invocation
- Check prerequisites before proceeding
- Handle uncommitted changes (prompt to commit/stash)
- Complete the conversion and report next steps

## Usage

```
/speclife convert to worktree   # Branch → Worktree
/speclife convert to branch     # Worktree → Branch
```

## When to use

**To worktree:** You started simple but now need to work on something else in parallel.

**To branch:** Your IDE struggles with worktrees, or you want simpler setup.

## Steps

### Convert to Worktree

Prerequisites:
- Must be on a `spec/*` branch in main repo
- Cannot already be in a worktree

```bash
# 1. Check we're on a spec branch
BRANCH=$(git branch --show-current)
[[ ! "$BRANCH" =~ ^spec/ ]] && error "Not on a spec branch"

# 2. Extract change-id
CHANGE_ID=${BRANCH#spec/}

# 3. Check worktree doesn't already exist
[[ -d "worktrees/$CHANGE_ID" ]] && error "Worktree already exists"
```

Steps:
1. **Commit changes** if any uncommitted work exists (or ask user to stash)
2. **Create worktree** from current branch:
   ```bash
   git worktree add worktrees/$CHANGE_ID $BRANCH
   ```
3. **Return to main** in original repo:
   ```bash
   git checkout main
   ```
4. **Bootstrap environment** in worktree (symlink node_modules, etc.)
5. **Report:**
   ```
   ✓ Created worktree at worktrees/<change-id>/
   ✓ Main repo now on main branch
   
   Next: cd worktrees/<change-id>/ to continue work
   ```

### Convert to Branch

Prerequisites:
- Must be in a worktree (not main repo)
- Must be on a `spec/*` branch

```bash
# Detect if we're in a worktree
WORKTREE_ROOT=$(git rev-parse --path-format=relative --git-common-dir)
[[ "$WORKTREE_ROOT" == ".git" ]] && error "Not in a worktree"
```

Steps:
1. **Commit changes** if any uncommitted work exists (or ask user to stash)
2. **Note current branch and worktree path**
3. **Go to main repo:**
   ```bash
   cd $(git worktree list | grep -v '^\[' | head -1 | awk '{print $1}')
   ```
4. **Checkout the branch:**
   ```bash
   git checkout $BRANCH
   ```
5. **Remove worktree** (keeps branch):
   ```bash
   git worktree remove worktrees/$CHANGE_ID
   ```
6. **Report:**
   ```
   ✓ Removed worktree
   ✓ Now on <branch> in main repo
   
   Next: Continue work here. Use /speclife convert to worktree if you need parallel work later.
   ```

## Examples

**Branch → Worktree:**
```
User: /speclife convert to worktree

Agent:
ℹ️ Current: spec/add-oauth on main repo
✓ Committed pending changes
✓ Created worktree at worktrees/add-oauth/
✓ Switched main repo to main branch

Next: cd worktrees/add-oauth/
```

**Worktree → Branch:**
```
User: /speclife convert to branch

Agent:
ℹ️ Current: worktrees/add-oauth/ on spec/add-oauth
✓ Committed pending changes
✓ Checked out spec/add-oauth in main repo
✓ Removed worktree

Next: Continue in main repo
```

## Error Handling

**Not on a spec branch:**
```
❌ Not on a spec/* branch. This command only works with spec branches.
```

**Already in target mode:**
```
ℹ️ Already in worktree mode. Nothing to convert.
```

**Uncommitted changes:**
```
⚠️ You have uncommitted changes:
   - src/auth.ts (modified)
   - package.json (modified)

Options:
1. Commit now (recommended)
2. Stash and continue
3. Abort
```

## Notes

- Converting preserves all commits and history
- Branch name stays the same (`spec/<change-id>`)
- Spec files in `openspec/changes/<change-id>/` work in both modes
- You can convert back and forth as needed

