---
name: /speclife-land
id: speclife-land
category: SpecLife
description: Merge an approved PR, clean up, and trigger auto-release if applicable.
---
# /speclife land

Merge a PR into main. Works with any PR - yours, team members', or external contributors'.

## ⚡ Execution

**When this command is invoked, IMMEDIATELY execute the workflow below.**

- Do NOT skip steps or ask for excessive confirmation
- If PR number is provided (#42), use that PR
- If on a feature branch, find the PR for that branch
- If on main, prompt for PR number
- **STOP after reporting—this is a terminal command in the workflow**

## TL;DR

```
/speclife land        # Land PR for current branch
/speclife land #42    # Land specific PR by number
```

**Quick flow:**
1. Find PR (from branch or number)
2. Verify ready (approved, CI passing)
3. Detect version bump type (feat → minor, fix → patch)
4. If major (breaking) → confirm with user
5. Bump version in feature branch, push
6. Squash merge PR (version included)
7. Cleanup (worktree if spec branch)
8. GitHub Actions auto-creates release

## Mode Detection

```bash
BRANCH=$(git branch --show-current)
```

| Invocation | Mode |
|------------|------|
| `/speclife land` on feature branch | Land PR for current branch |
| `/speclife land #42` | Land specific PR |
| `/speclife land` on main | Prompt for PR number |

## Core Steps

### 1. Find PR
```bash
# By branch
gh pr view --json number,state,reviewDecision

# By number
gh pr view 42 --json number,state,reviewDecision
```

### 2. Check Ready
Required:
- ✓ State: open
- ✓ Reviews: approved (or none required)
- ✓ CI: passing
- ✓ Mergeable: no conflicts

If not ready → report issues and stop.

### 3. Detect Version Bump
Analyze PR title/commits to determine version bump:

| Pattern | Bump | Example |
|---------|------|---------|
| `feat:` | minor | `feat: add OAuth login` |
| `fix:` | patch | `fix: correct redirect URL` |
| `feat!:` or `BREAKING CHANGE` | major | `feat!: redesign auth API` |
| `docs:`, `chore:`, `test:` | patch | `docs: update README` |

### 4. Confirm for Major (Breaking Changes)
If major bump detected:
```
⚠️ Breaking change detected in PR #42.
This will bump version to v2.0.0 (major).

Proceed? (y/n)
```
- If user confirms → continue
- If user declines → abort, suggest `/speclife release --major` for manual control

### 5. Bump Version in Feature Branch
**Do this BEFORE merging, in the feature branch:**
```bash
# Get current version
CURRENT=$(node -p "require('./package.json').version")

# Calculate new version
npm version <patch|minor|major> --no-git-tag-version
npm version <patch|minor|major> --no-git-tag-version --workspaces

# Commit and push to feature branch
git add -A
git commit -m "chore(release): v<new-version>"
git push origin <branch>
```

This ensures the version bump is included in the squash merge.

### 6. Squash Merge PR
```bash
gh pr merge $PR --squash --delete-branch
```

The merged commit includes both the feature AND the version bump.

### 7. Update Local
```bash
git checkout main
git pull origin main
```

### 8. Cleanup

| Type | Action |
|------|--------|
| Spec branch with worktree | `speclife worktree rm <change-id>` |
| Spec branch (no worktree) | `git branch -d spec/<change-id>` |
| Ad-hoc branch | `git branch -d <branch>` (if local exists) |
| External PR | Nothing (no local branch) |

**Detection:**
```bash
CHANGE_ID=${BRANCH#spec/}
WORKTREE_PATH="worktrees/$CHANGE_ID"
if [[ -d "$WORKTREE_PATH" ]]; then
  speclife worktree rm $CHANGE_ID  # removes worktree + branch
else
  git branch -d $BRANCH            # just removes branch
fi
```

### 9. Report and STOP
```
✓ Bumped version to v1.3.0 (minor)
✓ Merged PR #42 (squash)
✓ Cleaned up worktree
ℹ️ GitHub Actions will create release automatically
```

**⛔ STOP HERE.** GitHub Actions will handle tag/release creation.

---

<!-- REFERENCE SECTIONS - Read only when needed -->

## Appendix: Error Handling

**PR not found:**
```
❌ No PR found for branch. Run /speclife ship first.
```

**PR not ready:**
```
❌ PR #42 not ready:
   - Review: changes_requested
   - CI: failing
Address issues and retry.
```

**Merge conflicts:**
```
❌ Merge conflicts detected.
Run /speclife sync, resolve, push, then retry.
```

**On main without PR number:**
```
ℹ️ On main. Which PR to land?
Recent PRs:
  #45 - feat: dark mode (approved ✓)
  #44 - fix: memory leak (needs review)
```

## Appendix: Examples

**Spec branch (minor):**
```
User: /speclife land

Agent:
✓ PR #42 approved, CI passing
ℹ️ Detected: feat: → minor bump
✓ Bumped version to v1.3.0
✓ Pushed version commit to feature branch
✓ Merged PR #42 (squash)
✓ Removed worktree
ℹ️ GitHub Actions will create release v1.3.0
```

**By PR number (external):**
```
User: /speclife land #45

Agent:
ℹ️ PR #45 by @contributor
ℹ️ Detected: fix: → patch bump
✓ Bumped version to v1.2.4
✓ Merged PR #45 (squash)
ℹ️ GitHub Actions will create release v1.2.4
Thanks @contributor!
```

**Major version (confirmation required):**
```
User: /speclife land

Agent:
✓ PR #50 approved, CI passing
⚠️ Breaking change detected (feat!:)
   This will bump to v2.0.0 (major).
   Proceed? (y/n)

User: y

Agent:
✓ Bumped version to v2.0.0
✓ Merged PR #50 (squash)
ℹ️ GitHub Actions will create release v2.0.0
```

**Major version (user declines):**
```
User: /speclife land

Agent:
⚠️ Breaking change detected (feat!:)
   This will bump to v2.0.0 (major).
   Proceed? (y/n)

User: n

Agent:
ℹ️ Aborted. When ready, run:
   /speclife release --major
```
