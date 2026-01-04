---
name: /speclife-land
id: speclife-land
category: SpecLife
description: Merge an approved PR, clean up, and trigger auto-release.
---
**Guardrails**
- Execute immediately—if PR number provided (#42), use it; if on feature branch, find its PR; if on main, prompt for PR number
- Confirm with user only for major (breaking) version bumps
- STOP after reporting—GitHub Actions handles release

**Steps**
1. Find PR: by branch (`gh pr view`) or by number (`gh pr view <num>`); error if not found.
2. Check readiness: state=open, approved (or no reviews required), CI passing, no conflicts; report issues and stop if not ready.
3. Detect version bump from PR title/commits: `feat:` → minor, `fix:/docs:/chore:` → patch, `feat!:/BREAKING CHANGE` → major.
4. For major bumps: confirm with user; abort if declined (suggest `/speclife release --major` for manual control).
5. Bump version in feature branch: `npm version <bump> --no-git-tag-version`, commit `chore(release): v<version>`, push.
6. Squash merge: `gh pr merge --squash --delete-branch`.
7. Update local: `git checkout main && git pull`.
8. Cleanup: remove worktree if spec branch (`speclife worktree rm <id>`), else delete local branch.
9. Report: version bumped, PR merged, cleanup done, GitHub Actions creating release.

**Reference**
- Version bump happens BEFORE merge so it's included in squash commit
- Release workflow triggered by `chore(release): vX.X.X` commit message
