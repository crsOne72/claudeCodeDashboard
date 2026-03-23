use anyhow::{Context, Result};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::models::{
    calculate_cost, DailyStat, JournalEntry, Project, Session, TokenUsage,
};

pub fn get_claude_projects_dir() -> Result<PathBuf> {
    let home = dirs::home_dir().context("Cannot find home directory")?;
    Ok(home.join(".claude").join("projects"))
}

pub fn dir_name_to_display_name(dir_name: &str) -> String {
    // "C--Users-cever-Projekte-foo" → "foo" (last segment)
    let parts: Vec<&str> = dir_name.split('-').collect();
    // Find the last meaningful segment
    // The encoding replaces path separators with '-' and drive colon with '--'
    // So we take the last non-empty part
    if let Some(last) = parts.last() {
        if !last.is_empty() {
            return last.to_string();
        }
    }
    dir_name.to_string()
}

/// Scan all projects and return (Project, Vec<Session>, DailyStats) for each
pub fn scan_all_projects(
    projects_dir: &Path,
) -> Result<Vec<(Project, Vec<Session>, HashMap<String, DailyStat>)>> {
    let mut results = Vec::new();

    if !projects_dir.exists() {
        return Ok(results);
    }

    let entries = fs::read_dir(projects_dir)?;
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let dir_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Skip the "memory" directory
        if dir_name == "memory" {
            continue;
        }

        match scan_project(&path, &dir_name) {
            Ok(Some(result)) => results.push(result),
            Ok(None) => {} // No sessions found
            Err(e) => {
                eprintln!("Error scanning project {}: {}", dir_name, e);
            }
        }
    }

    Ok(results)
}

fn scan_project(
    project_dir: &Path,
    project_id: &str,
) -> Result<Option<(Project, Vec<Session>, HashMap<String, DailyStat>)>> {
    let mut sessions = Vec::new();
    let mut total_usage = TokenUsage::default();
    let mut total_cost = 0.0;
    let mut last_accessed: Option<String> = None;
    let mut full_path: Option<String> = None;
    let mut daily_map: HashMap<String, DailyStat> = HashMap::new();

    // Find all JSONL files in project directory
    let dir_entries = fs::read_dir(project_dir)?;
    for entry in dir_entries {
        let entry = entry?;
        let path = entry.path();

        if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
            let session_id = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            match parse_session_from_file(&path, &session_id, project_id, false) {
                Ok(Some(session)) => {
                    total_usage.input_tokens += session.usage.input_tokens;
                    total_usage.output_tokens += session.usage.output_tokens;
                    total_usage.cache_creation_input_tokens +=
                        session.usage.cache_creation_input_tokens;
                    total_usage.cache_read_input_tokens += session.usage.cache_read_input_tokens;
                    total_cost += session.cost_usd;

                    // Track latest access
                    if let Some(ref ts) = session.started_at {
                        if last_accessed.is_none()
                            || last_accessed.as_ref().map(|l| ts > l).unwrap_or(true)
                        {
                            last_accessed = Some(ts.clone());
                        }
                        // Aggregate daily stats
                        let date = &ts[..10]; // "2026-02-18"
                        let entry = daily_map
                            .entry(date.to_string())
                            .or_insert_with(|| DailyStat {
                                date: date.to_string(),
                                cost_usd: 0.0,
                                input_tokens: 0,
                                output_tokens: 0,
                                cache_creation_input_tokens: 0,
                                cache_read_input_tokens: 0,
                            });
                        entry.cost_usd += session.cost_usd;
                        entry.input_tokens += session.usage.input_tokens;
                        entry.output_tokens += session.usage.output_tokens;
                        entry.cache_creation_input_tokens +=
                            session.usage.cache_creation_input_tokens;
                        entry.cache_read_input_tokens += session.usage.cache_read_input_tokens;
                    }

                    sessions.push(session);
                }
                Ok(None) => {}
                Err(e) => {
                    eprintln!("Error parsing session {}: {}", session_id, e);
                }
            }
        } else if path.is_dir() {
            // Check for subagent directories: <session-uuid>/subagents/agent-<id>.jsonl
            let subagent_dir = path.join("subagents");
            if subagent_dir.exists() {
                let parent_session_id = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();

                if let Ok(sub_entries) = fs::read_dir(&subagent_dir) {
                    for sub_entry in sub_entries.flatten() {
                        let sub_path = sub_entry.path();
                        if sub_path.extension().map(|e| e == "jsonl").unwrap_or(false) {
                            let sub_id = sub_path
                                .file_stem()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string();

                            if let Ok(Some(mut sub_session)) =
                                parse_session_from_file(&sub_path, &sub_id, project_id, true)
                            {
                                sub_session.parent_session_id = Some(parent_session_id.clone());
                                total_usage.input_tokens += sub_session.usage.input_tokens;
                                total_usage.output_tokens += sub_session.usage.output_tokens;
                                total_usage.cache_creation_input_tokens +=
                                    sub_session.usage.cache_creation_input_tokens;
                                total_usage.cache_read_input_tokens +=
                                    sub_session.usage.cache_read_input_tokens;
                                total_cost += sub_session.cost_usd;
                                sessions.push(sub_session);
                            }
                        }
                    }
                }
            }

            // Also extract full_path (cwd) from the session dir if we have a matching jsonl
            if full_path.is_none() {
                let jsonl_in_dir =
                    project_dir.join(format!("{}.jsonl", path.file_name().unwrap().to_string_lossy()));
                if jsonl_in_dir.exists() {
                    if let Ok(Some(cwd)) = extract_cwd(&jsonl_in_dir) {
                        full_path = Some(cwd);
                    }
                }
            }
        }
    }

    if sessions.is_empty() {
        return Ok(None);
    }

    // If we still don't have full_path, try the first JSONL
    if full_path.is_none() {
        for session in &sessions {
            let jsonl_path = project_dir.join(format!("{}.jsonl", session.id));
            if jsonl_path.exists() {
                if let Ok(Some(cwd)) = extract_cwd(&jsonl_path) {
                    full_path = Some(cwd);
                    break;
                }
            }
        }
    }

    let display_name = dir_name_to_display_name(project_id);

    let project = Project {
        id: project_id.to_string(),
        display_name,
        full_path,
        total_cost_usd: total_cost,
        usage: total_usage,
        session_count: sessions.len() as i64,
        last_accessed_at: last_accessed,
    };

    Ok(Some((project, sessions, daily_map)))
}

fn extract_cwd(jsonl_path: &Path) -> Result<Option<String>> {
    let content = fs::read_to_string(jsonl_path)?;
    for line in content.lines().take(10) {
        if line.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<Value>(line) {
            if let Some(cwd) = val.get("cwd").and_then(|v| v.as_str()) {
                return Ok(Some(cwd.to_string()));
            }
        }
    }
    Ok(None)
}

fn parse_session_from_file(
    path: &Path,
    session_id: &str,
    project_id: &str,
    is_subagent: bool,
) -> Result<Option<Session>> {
    let content = fs::read_to_string(path).context("Failed to read JSONL file")?;

    let mut usage = TokenUsage::default();
    let mut cost = 0.0;
    let mut message_count: i64 = 0;
    let mut slug: Option<String> = None;
    let mut started_at: Option<String> = None;
    let mut git_branch: Option<String> = None;
    let mut model: Option<String> = None;

    for line in content.lines() {
        if line.is_empty() {
            continue;
        }

        let val: Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let entry_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");

        // Extract slug from first entry that has it
        if slug.is_none() {
            if let Some(s) = val.get("slug").and_then(|v| v.as_str()) {
                slug = Some(s.to_string());
            }
        }

        // Extract git branch
        if git_branch.is_none() {
            if let Some(b) = val.get("gitBranch").and_then(|v| v.as_str()) {
                git_branch = Some(b.to_string());
            }
        }

        // Track earliest timestamp
        if let Some(ts) = val.get("timestamp").and_then(|v| v.as_str()) {
            if started_at.is_none() || started_at.as_ref().map(|s| ts < s.as_str()).unwrap_or(true)
            {
                started_at = Some(ts.to_string());
            }
        }

        match entry_type {
            "user" => {
                message_count += 1;
            }
            "assistant" => {
                message_count += 1;

                // Extract usage from message.usage
                if let Some(msg) = val.get("message") {
                    if let Some(msg_model) = msg.get("model").and_then(|v| v.as_str()) {
                        model = Some(msg_model.to_string());
                    }

                    if let Some(u) = msg.get("usage") {
                        let input = u
                            .get("input_tokens")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(0);
                        let output = u
                            .get("output_tokens")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(0);
                        let cache_create = u
                            .get("cache_creation_input_tokens")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(0);
                        let cache_read = u
                            .get("cache_read_input_tokens")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(0);

                        usage.input_tokens += input;
                        usage.output_tokens += output;
                        usage.cache_creation_input_tokens += cache_create;
                        usage.cache_read_input_tokens += cache_read;

                        // Calculate cost for this entry
                        let entry_usage = TokenUsage {
                            input_tokens: input,
                            output_tokens: output,
                            cache_creation_input_tokens: cache_create,
                            cache_read_input_tokens: cache_read,
                        };
                        let m = model.as_deref().unwrap_or("claude-sonnet-4");
                        let breakdown = calculate_cost(&entry_usage, m);
                        cost += breakdown.total;
                    }
                }
            }
            _ => {}
        }
    }

    if message_count == 0 {
        return Ok(None);
    }

    Ok(Some(Session {
        id: session_id.to_string(),
        project_id: project_id.to_string(),
        slug,
        started_at,
        git_branch,
        is_subagent,
        parent_session_id: None,
        usage,
        cost_usd: cost,
        message_count,
        model,
    }))
}

/// Parse a JSONL file into individual journal entries for the session detail view
pub fn parse_jsonl_file(path: &Path, session_id: &str) -> Result<Vec<JournalEntry>> {
    let content = fs::read_to_string(path)?;
    let mut entries = Vec::new();
    let mut current_model: Option<String> = None;

    for line in content.lines() {
        if line.is_empty() {
            continue;
        }

        let val: Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let entry_type = val
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let uuid = val
            .get("uuid")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let timestamp = val
            .get("timestamp")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        match entry_type.as_str() {
            "user" | "system" => {
                entries.push(JournalEntry {
                    uuid,
                    entry_type,
                    timestamp,
                    model: None,
                    usage: None,
                    tool_name: None,
                    message_role: Some("user".to_string()),
                    cost_usd: 0.0,
                    session_id: session_id.to_string(),
                });
            }
            "assistant" => {
                if let Some(msg) = val.get("message") {
                    let msg_model = msg
                        .get("model")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    if msg_model.is_some() {
                        current_model = msg_model.clone();
                    }

                    let mut entry_usage = None;
                    let mut entry_cost = 0.0;

                    if let Some(u) = msg.get("usage") {
                        let tok = TokenUsage {
                            input_tokens: u
                                .get("input_tokens")
                                .and_then(|v| v.as_i64())
                                .unwrap_or(0),
                            output_tokens: u
                                .get("output_tokens")
                                .and_then(|v| v.as_i64())
                                .unwrap_or(0),
                            cache_creation_input_tokens: u
                                .get("cache_creation_input_tokens")
                                .and_then(|v| v.as_i64())
                                .unwrap_or(0),
                            cache_read_input_tokens: u
                                .get("cache_read_input_tokens")
                                .and_then(|v| v.as_i64())
                                .unwrap_or(0),
                        };
                        let m = current_model.as_deref().unwrap_or("claude-sonnet-4");
                        entry_cost = calculate_cost(&tok, m).total;
                        entry_usage = Some(tok);
                    }

                    // Check for tool_use in content
                    let mut tool_names = Vec::new();
                    if let Some(content) = msg.get("content").and_then(|v| v.as_array()) {
                        for item in content {
                            if item.get("type").and_then(|v| v.as_str()) == Some("tool_use") {
                                if let Some(name) = item.get("name").and_then(|v| v.as_str()) {
                                    tool_names.push(name.to_string());
                                }
                            }
                        }
                    }

                    if tool_names.is_empty() {
                        entries.push(JournalEntry {
                            uuid,
                            entry_type,
                            timestamp,
                            model: current_model.clone(),
                            usage: entry_usage,
                            tool_name: None,
                            message_role: Some("assistant".to_string()),
                            cost_usd: entry_cost,
                            session_id: session_id.to_string(),
                        });
                    } else {
                        // Create one entry per tool use
                        let per_tool_cost = entry_cost / tool_names.len() as f64;
                        for (i, tool) in tool_names.iter().enumerate() {
                            entries.push(JournalEntry {
                                uuid: uuid
                                    .as_ref()
                                    .map(|u| format!("{}-tool-{}", u, i)),
                                entry_type: "tool_use".to_string(),
                                timestamp: timestamp.clone(),
                                model: current_model.clone(),
                                usage: if i == 0 { entry_usage.clone() } else { None },
                                tool_name: Some(tool.clone()),
                                message_role: Some("assistant".to_string()),
                                cost_usd: per_tool_cost,
                                session_id: session_id.to_string(),
                            });
                        }
                    }
                }
            }
            _ => {
                // Include progress, summary, etc. as-is
                entries.push(JournalEntry {
                    uuid,
                    entry_type,
                    timestamp,
                    model: None,
                    usage: None,
                    tool_name: None,
                    message_role: None,
                    cost_usd: 0.0,
                    session_id: session_id.to_string(),
                });
            }
        }
    }

    Ok(entries)
}
