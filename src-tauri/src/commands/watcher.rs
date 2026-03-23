use anyhow::Result;
use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::parser::get_claude_projects_dir;

pub fn start_watcher(app: AppHandle) -> Result<()> {
    let projects_dir = get_claude_projects_dir()?;
    if !projects_dir.exists() {
        eprintln!("Claude projects directory not found: {:?}", projects_dir);
        return Ok(());
    }

    let (tx, rx) = mpsc::channel();

    let mut watcher = RecommendedWatcher::new(tx, Config::default())?;
    watcher.watch(&projects_dir, RecursiveMode::Recursive)?;

    let _watcher = watcher; // prevent drop
    let mut last_emit = std::time::Instant::now();
    let debounce = Duration::from_secs(2);

    loop {
        match rx.recv_timeout(Duration::from_secs(5)) {
            Ok(Ok(event)) => {
                let is_jsonl = event
                    .paths
                    .iter()
                    .any(|p| p.extension().map(|e| e == "jsonl").unwrap_or(false));

                if is_jsonl && matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
                    let now = std::time::Instant::now();
                    if now.duration_since(last_emit) >= debounce {
                        last_emit = now;
                        let _ = app.emit("jsonl-updated", ());
                    }
                }
            }
            Ok(Err(e)) => {
                eprintln!("Watch error: {}", e);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                break;
            }
        }
    }

    Ok(())
}
