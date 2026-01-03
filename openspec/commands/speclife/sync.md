---
name: /speclife-sync
id: speclife-sync
category: SpecLife
description: Update current branch with latest changes from main.
---
# /speclife sync

Update your branch with latest main. Handles conflicts with guidance.

## ⚡ Execution

**When this command is invoked, IMMEDIATELY execute the workflow below.**

- Check prerequisites first (not on main, clean working directory)
- Default to rebase unless `--merge` is specified
- If conflicts occur, guide the user through resolution
- Push after successful sync

## TL;DR

```
/speclife sync          # Rebase onto main (default)
/speclife sync --merge  # Merge main into branch
```

**Quick flow:**
1. Check prerequisites (not on main, clean working dir)
2. Fetch latest
3. Rebase or merge
4. Handle conflicts if any
5. Force push (if rebased)

## Prerequisites

- Not on main branch
- Working directory clean (commit or stash first)

## Core Steps

### 1. Check State
```bash
BRANCH=$(git branch --show-current)
[[ "$BRANCH" == "main" ]] && echo "Already on main" && exit

# Check for uncommitted changes
[[ -n $(git status --porcelain) ]] && echo "Commit or stash changes first"
```

### 2. Fetch & Check
```bash
git fetch origin main
BEHIND=$(git rev-list --count HEAD..origin/main)
[[ "$BEHIND" == "0" ]] && echo "Already up to date" && exit
```

### 3. Rebase (default) or Merge
```bash
# Rebase (cleaner history)
git rebase origin/main

# Or merge (preserves history)
git merge origin/main
```

### 4. Handle Conflicts
If conflicts:
```bash
# List conflicts
git diff --name-only --diff-filter=U
```

Tell user:
```
⚠️ Conflicts in 3 files:
   - src/auth/login.ts
   - package.json
   
To resolve:
1. Edit files, remove <<<<<<< ======= >>>>>>> markers
2. git add <resolved-files>
3. git rebase --continue

Or abort: git rebase --abort
```

### 5. Push
```bash
# After rebase (force required)
git push --force-with-lease origin <branch>

# After merge (normal push)
git push origin <branch>
```

### 6. Report
```
✓ Rebased onto main (5 commits)
✓ No conflicts
✓ Pushed
```

---

<!-- REFERENCE SECTIONS - Read only when needed -->

## Appendix: Conflict Resolution

**Conflict markers:**
```
<<<<<<< HEAD (yours)
const timeout = 5000;
=======
const timeout = 10000;
>>>>>>> origin/main (theirs)
```

**Resolution strategies:**
- Keep yours: delete their section + markers
- Keep theirs: delete your section + markers
- Combine: merge logic, delete markers

**Common conflicts:**
- `package.json` version → keep higher (main)
- Import conflicts → combine imports

## Appendix: Error Handling

**On main:**
```
ℹ️ Already on main - nothing to sync.
```

**Uncommitted changes:**
```
⚠️ Uncommitted changes detected.
Commit or stash, then retry.
```

**Rebase in progress:**
```
⚠️ Rebase already in progress.
Continue: git rebase --continue
Abort: git rebase --abort
```

## Appendix: Examples

**Clean sync:**
```
User: /speclife sync

Agent:
✓ Fetched latest
ℹ️ 3 commits behind main
✓ Rebased - no conflicts
✓ Force pushed
```

**With conflicts:**
```
User: /speclife sync

Agent:
⚠️ Conflicts in 2 files:
   - src/auth.ts
   - package.json

[Offers to help resolve]
```
