# Release Checklist

Use this before every new release tag. Work through it top to bottom.

---

## 1. Code & version bump

- [ ] All planned changes for this release are merged to `main`
- [ ] No open issues marked with the `release-blocker` label
- [ ] Update version in **`package.json`** → `"version": "x.y.z"`
- [ ] Update version in **`src-tauri/tauri.conf.json`** → `"version": "x.y.z"`
- [ ] Update version in **`src-tauri/Cargo.toml`** → `version = "x.y.z"`
- [ ] Run `cargo check` to confirm Cargo.lock is updated cleanly
- [ ] Commit: `git commit -m "chore: bump version to vx.y.z"`

## 2. Test locally

- [ ] `npm run tauri dev` — app opens, no console errors
- [ ] Scan projects: all projects load, costs look correct
- [ ] Daily stats chart renders with data
- [ ] Active session view shows the current session (if Claude Code is running)
- [ ] `npm run tauri build` completes without errors
- [ ] Installer runs and app starts correctly

## 3. Tag the release

```bash
git tag v x.y.z
git push origin main --tags
```

This triggers the GitHub Actions workflow (`.github/workflows/release.yml`) which builds:
- Windows: NSIS installer (`.exe`)
- macOS arm64: `.dmg`
- macOS x64: `.dmg`
- Linux: `.AppImage`

## 4. GitHub Release

- [ ] Wait for the Actions workflow to finish (usually ~20 minutes)
- [ ] Open the draft release created by the workflow
- [ ] Write release notes — see template below
- [ ] Attach any extra assets if needed
- [ ] Publish the release (change from Draft → Published)

### Release notes template

```markdown
## What's new in vx.y.z

### New
- ...

### Fixed
- ...

### Changed
- ...

---

**Install:** Download the installer for your platform below.
Windows users looking for a one-click installer: [Gumroad](https://gumroad.com/l/claudecodedashboard)
```

## 5. Update Gumroad

- [ ] Upload the new Windows `.exe` installer to the Gumroad product
- [ ] Update the version number in the Gumroad product description
- [ ] Verify the download link works

## 6. Announce

- [ ] Post to r/ClaudeAI on Reddit (use the announcement template in `docs/reddit-post-template.md`)
- [ ] Post to relevant Discord servers / Hacker News if it's a significant release
- [ ] Update the GitHub repo description / topics if anything changed

---

## Versioning convention

This project follows [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`) — bug fixes, pricing updates, no new features
- **Minor** (`0.x.0`) — new features, backward compatible
- **Major** (`x.0.0`) — breaking changes or major rewrites
