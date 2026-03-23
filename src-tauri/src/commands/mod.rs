pub mod parser;
pub mod watcher;

use crate::AppState;
use crate::models::{DailyStat, JournalEntry, Project, Session};
use tauri::State;

#[tauri::command]
pub async fn get_all_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_all_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_project_sessions(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<Session>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_project_sessions(&project_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_session_entries(
    session_id: String,
    project_id: String,
) -> Result<Vec<JournalEntry>, String> {
    let projects_dir = parser::get_claude_projects_dir().map_err(|e| e.to_string())?;

    // JSONL files live at: ~/.claude/projects/{project_id}/{session_id}.jsonl
    let jsonl_path = projects_dir
        .join(&project_id)
        .join(format!("{}.jsonl", session_id));

    if !jsonl_path.exists() {
        return Ok(vec![]);
    }

    parser::parse_jsonl_file(&jsonl_path, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_daily_stats(
    state: State<'_, AppState>,
    days: Option<i64>,
) -> Result<Vec<DailyStat>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_daily_stats(days.unwrap_or(30))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn scan_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let projects_dir = parser::get_claude_projects_dir().map_err(|e| e.to_string())?;
    let results = parser::scan_all_projects(&projects_dir).map_err(|e| e.to_string())?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.clear_all().map_err(|e| e.to_string())?;

    for (project, sessions, daily_map) in &results {
        db.upsert_project(project).map_err(|e| e.to_string())?;
        for session in sessions {
            db.upsert_session(session).map_err(|e| e.to_string())?;
        }
        for (date, stat) in daily_map {
            db.upsert_daily_stat(stat, Some(&project.id))
                .map_err(|e| e.to_string())?;
            // also upsert global daily stat
            let _ = date; // date is in stat
        }
    }

    db.get_all_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_session(
    state: State<'_, AppState>,
) -> Result<Option<Session>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let projects = db.get_all_projects().map_err(|e| e.to_string())?;

    // Find the most recently accessed project and its latest session
    if let Some(project) = projects.first() {
        let sessions = db
            .get_project_sessions(&project.id)
            .map_err(|e| e.to_string())?;
        return Ok(sessions.into_iter().next());
    }
    Ok(None)
}
