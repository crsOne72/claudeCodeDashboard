# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Dashboard is a Tauri v2 desktop app (Rust backend + React/TypeScript frontend) that reads Claude Code's local JSONL session logs from `~/.claude/projects/` and displays cost/token analytics in a dashboard UI.

## Build & Dev Commands

```bash
npm run tauri dev          # Start dev mode (Vite dev server + Tauri window)
npm run tauri build        # Production build (creates NSIS installer)
npm run dev                # Vite dev server only (no Tauri window)
npm run build              # TypeScript check + Vite production build (frontend only)
```

Rust backend compiles automatically via Tauri CLI. Manual cargo commands if needed:
```bash
cd src-tauri && cargo build    # Build Rust backend
cd src-tauri && cargo check    # Type-check without building
```

## Architecture

### Data Flow
```
~/.claude/projects/{encoded-path}/{session-uuid}.jsonl
    → Rust parser (commands/parser.rs) extracts token usage from assistant message.usage fields
    → Cost calculation (models.rs) using per-model pricing with prefix matching
    → SQLite storage (db/mod.rs) at %LOCALAPPDATA%/claude-code-dashboard/dashboard.db (WAL mode)
    → Tauri IPC commands (commands/mod.rs) expose data to frontend
    → React frontend (Zustand store → React components)
```

### Backend (src-tauri/src/)
- **lib.rs** — App setup, AppState (holds `Mutex<Database>`), plugin/command registration
- **models.rs** — Data structs (`TokenUsage`, `CostBreakdown`, `Project`, `Session`, `JournalEntry`, `DailyStat`), pricing table, `calculate_cost()`
- **commands/mod.rs** — 6 Tauri IPC commands: `scan_projects`, `get_all_projects`, `get_project_sessions`, `get_session_entries`, `get_daily_stats`, `get_active_session`
- **commands/parser.rs** — JSONL parsing, project directory scanning, subagent detection, CWD extraction
- **db/mod.rs** — SQLite schema (projects/sessions/daily_stats tables), CRUD with upserts

### Frontend (src/)
- **Zustand** for state management, **React Router** (HashRouter) for navigation, **Recharts** for charts, **Tailwind CSS** for styling, **Lucide** for icons

### Key IPC Commands (invoke from frontend)
```typescript
invoke('scan_projects')                              // Full rescan of ~/.claude/projects/
invoke('get_all_projects')                           // Cached from SQLite
invoke('get_project_sessions', { projectId })        // Sessions for one project
invoke('get_session_entries', { sessionId, projectId }) // Raw journal entries
invoke('get_daily_stats', { days: 30 })              // Aggregated daily costs
invoke('get_active_session')                         // Most recent session
```

## JSONL Format Details

Claude Code logs are at `~/.claude/projects/{encoded-path}/{session-uuid}.jsonl`. Key fields:
- **Entry types:** `user`, `assistant`, `system`, `summary`, `progress`, `file-history-snapshot`
- **Token usage** is nested at `entry.message.usage` (only on `assistant` entries): `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`
- **Model** is at `entry.message.model` (e.g., `claude-opus-4-5-20251101`)
- **Tool calls** are in `entry.message.content[]` items with `type: "tool_use"` and a `name` field
- **Project path encoding:** `C:\Users\cever\Projekte\foo` → directory name `C--Users-cever-Projekte-foo`
- **Subagents** live at `{session-uuid}/subagents/agent-{id}.jsonl`
- **Ground truth for project path:** read `cwd` field from JSONL entries (don't reconstruct from dir name)

## Model Pricing (per million tokens)

| Prefix | Input | Output | Cache Write | Cache Read |
|--------|-------|--------|-------------|------------|
| claude-opus-4 | $15 | $75 | $18.75 | $1.50 |
| claude-sonnet-4 | $3 | $15 | $3.75 | $0.30 |
| claude-haiku-4 | $0.80 | $4 | $1.00 | $0.08 |

Models are matched by prefix (e.g., `claude-opus-4` matches `claude-opus-4-6`). Fallback is sonnet pricing.

## Important Constraints

- Tauri FS plugin scope is restricted to `$HOME/.claude/**` — all file access must go through Rust commands
- SQLite uses WAL mode for concurrent read/write (watcher writes, UI reads)
- JSONL files may be locked by running Claude Code on Windows — open read-only with share mode
- Use `serde(rename_all = "camelCase")` on all Rust structs for consistent JSON serialization to frontend
- Frontend must use `HashRouter` (not `BrowserRouter`) since Tauri serves from file://
