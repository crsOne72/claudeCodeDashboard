# Contributing to Claude Code Dashboard

Thanks for taking the time to contribute! Here's everything you need to know.

---

## Ways to contribute

- **Bug reports** — found something broken? Open a [bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- **Feature requests** — missing something useful? Open a [feature request](.github/ISSUE_TEMPLATE/feature_request.md)
- **Code contributions** — fork, branch, pull request (see below)
- **Pricing updates** — Anthropic pricing changes periodically; PRs that update `src-tauri/src/models.rs` are very welcome

---

## Before you open a PR

1. Check the [open issues](../../issues) — someone may already be working on it
2. For larger changes, open an issue first to discuss the approach
3. Keep PRs focused — one feature or fix per PR

---

## Development setup

See the [README](README.md#development) for prerequisites and setup instructions.

### Useful commands

```bash
npm run tauri dev        # dev mode with hot reload
npm run build            # TypeScript check + Vite build (frontend only)
cd src-tauri && cargo check   # type-check Rust without full build
cd src-tauri && cargo clippy  # Rust linter
```

---

## Code style

**Rust (backend)**
- Run `cargo fmt` before committing
- No `unwrap()` in production paths — use `?` or explicit error handling
- All structs passed to the frontend need `#[serde(rename_all = "camelCase")]`

**TypeScript / React (frontend)**
- Use functional components and hooks only
- State management goes through the Zustand store — avoid local state for shared data
- Tailwind utility classes for styling; avoid inline styles

---

## Architecture notes

The most important constraint: **the Tauri FS plugin scope is locked to `$HOME/.claude/**`**. Any file reading must go through the Rust commands — the frontend cannot access the filesystem directly.

Adding a new data source? You'll need:
1. A Rust command in `src-tauri/src/commands/mod.rs`
2. A corresponding DB table or query in `src-tauri/src/db/mod.rs`
3. A Zustand action and selector in the frontend store
4. A React component or extension to an existing one

---

## Submitting a pull request

1. Fork the repository
2. Create a branch: `git checkout -b fix/your-description` or `feat/your-description`
3. Make your changes and commit with a clear message
4. Push and open a PR against `main`
5. Describe what changed and why in the PR body

---

## Reporting a security issue

Please **do not** open a public issue for security vulnerabilities. Instead, email the maintainer directly (see GitHub profile). Security issues will be addressed promptly and credited in the release notes.
