---
name: /speclife-release
id: speclife-release
category: SpecLife
description: Create a release with version bump for manual releases (major versions).
---
# /speclife release

Create a release with version bump. Used for manual releases (typically major versions).

## ⚡ Execution

**When this command is invoked, IMMEDIATELY execute the workflow below.**

- Check that we're on the main branch
- Analyze commits to determine version bump (or use explicit flag)
- Update version files and changelog
- Commit and push to trigger release workflow

## Usage

```
/speclife release              # Auto-detect version bump
/speclife release --major      # Force major version bump
/speclife release --minor      # Force minor version bump  
/speclife release --patch      # Force patch version bump
```

## When to Use

- **Major releases**: Breaking changes that require manual review
- **Forced releases**: When auto-release is disabled or skipped
- **Independent releases**: Creating a release without going through `/speclife land`

## Preconditions

- On `main` branch
- Working directory clean
- Changes merged since last release (for auto-detect)

## Steps

1. **Check branch**: Ensure on `main` branch
   - If not, suggest switching or report error

2. **Analyze commits**: Determine suggested version bump
   - Get commits since last tag
   - `feat:` commits → minor
   - `fix:` commits → patch
   - `BREAKING CHANGE` or `!` → major
   - Use explicit flag if provided (--major, --minor, --patch)

3. **Get current version**: Read from package.json (or equivalent)

4. **Calculate new version**: Apply bump to current version
   - Major: 1.2.3 → 2.0.0
   - Minor: 1.2.3 → 1.3.0
   - Patch: 1.2.3 → 1.2.4

5. **Update version file**: Write new version to package.json

6. **Update CHANGELOG**: Add release notes
   - Group commits by type (Features, Fixes, etc.)
   - Include commit messages and PR references

7. **Commit**: `git commit -am "chore(release): vX.X.X"`
   - This commit message triggers the release workflow

8. **Push**: `git push origin main`

9. **Create release PR** (optional, for review):
   - If major release, create PR for review
   - If patch/minor with auto-merge, push directly

10. **Report**: Show next steps

## Example

```
User: /speclife release --major

Agent:
Analyzing commits since v1.2.3...
  - feat: add OAuth login (breaking: changes auth API)
  - fix: correct redirect URL
  - docs: update API documentation

Current version: 1.2.3
New version: 2.0.0 (major bump)

✓ Updated package.json to 2.0.0
✓ Updated CHANGELOG.md
✓ Committed: "chore(release): v2.0.0"
✓ Pushed to origin/main

Release workflow triggered. GitHub Actions will:
  1. Create tag v2.0.0
  2. Create GitHub Release with notes
  3. Publish to npm (if configured)

Done! Release v2.0.0 is being created.
```

## Release Workflow

When the `chore(release): vX.X.X` commit is pushed, the GitHub Actions workflow (`.github/workflows/speclife-release.yml`) automatically:

1. Extracts version from commit message
2. Creates git tag
3. Creates GitHub Release with auto-generated notes
4. Optionally publishes to package registry

## Notes

- For patch/minor releases, prefer using `/speclife land` which handles auto-release
- Major releases should go through this command for explicit control
- The release commit message format `chore(release): vX.X.X` is required for the workflow


