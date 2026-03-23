use anyhow::Result;
use rusqlite::Connection;
use std::path::PathBuf;

use crate::models::{DailyStat, Project, Session, TokenUsage};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = Self::db_path()?;
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        let db = Database { conn };
        db.run_migrations()?;
        Ok(db)
    }

    fn db_path() -> Result<PathBuf> {
        let data_dir = dirs::data_local_dir()
            .ok_or_else(|| anyhow::anyhow!("Cannot find local data directory"))?;
        Ok(data_dir.join("claude-code-dashboard").join("dashboard.db"))
    }

    fn run_migrations(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                full_path TEXT,
                total_cost_usd REAL NOT NULL DEFAULT 0,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                cache_creation_input_tokens INTEGER NOT NULL DEFAULT 0,
                cache_read_input_tokens INTEGER NOT NULL DEFAULT 0,
                session_count INTEGER NOT NULL DEFAULT 0,
                last_accessed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                slug TEXT,
                started_at TEXT,
                git_branch TEXT,
                is_subagent INTEGER NOT NULL DEFAULT 0,
                parent_session_id TEXT,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                cache_creation_input_tokens INTEGER NOT NULL DEFAULT 0,
                cache_read_input_tokens INTEGER NOT NULL DEFAULT 0,
                cost_usd REAL NOT NULL DEFAULT 0,
                message_count INTEGER NOT NULL DEFAULT 0,
                model TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS daily_stats (
                date TEXT NOT NULL,
                project_id TEXT,
                cost_usd REAL NOT NULL DEFAULT 0,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                cache_creation_input_tokens INTEGER NOT NULL DEFAULT 0,
                cache_read_input_tokens INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (date, project_id)
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
            CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
            ",
        )?;
        Ok(())
    }

    pub fn upsert_project(&self, project: &Project) -> Result<()> {
        self.conn.execute(
            "INSERT INTO projects (id, display_name, full_path, total_cost_usd, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, session_count, last_accessed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
                display_name = ?2, full_path = ?3, total_cost_usd = ?4,
                input_tokens = ?5, output_tokens = ?6,
                cache_creation_input_tokens = ?7, cache_read_input_tokens = ?8,
                session_count = ?9, last_accessed_at = ?10",
            rusqlite::params![
                project.id,
                project.display_name,
                project.full_path,
                project.total_cost_usd,
                project.usage.input_tokens,
                project.usage.output_tokens,
                project.usage.cache_creation_input_tokens,
                project.usage.cache_read_input_tokens,
                project.session_count,
                project.last_accessed_at,
            ],
        )?;
        Ok(())
    }

    pub fn upsert_session(&self, session: &Session) -> Result<()> {
        self.conn.execute(
            "INSERT INTO sessions (id, project_id, slug, started_at, git_branch, is_subagent, parent_session_id, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, cost_usd, message_count, model)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(id) DO UPDATE SET
                slug = ?3, started_at = ?4, git_branch = ?5, is_subagent = ?6,
                parent_session_id = ?7, input_tokens = ?8, output_tokens = ?9,
                cache_creation_input_tokens = ?10, cache_read_input_tokens = ?11,
                cost_usd = ?12, message_count = ?13, model = ?14",
            rusqlite::params![
                session.id,
                session.project_id,
                session.slug,
                session.started_at,
                session.git_branch,
                session.is_subagent as i32,
                session.parent_session_id,
                session.usage.input_tokens,
                session.usage.output_tokens,
                session.usage.cache_creation_input_tokens,
                session.usage.cache_read_input_tokens,
                session.cost_usd,
                session.message_count,
                session.model,
            ],
        )?;
        Ok(())
    }

    pub fn upsert_daily_stat(&self, stat: &DailyStat, project_id: Option<&str>) -> Result<()> {
        self.conn.execute(
            "INSERT INTO daily_stats (date, project_id, cost_usd, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(date, project_id) DO UPDATE SET
                cost_usd = ?3, input_tokens = ?4, output_tokens = ?5,
                cache_creation_input_tokens = ?6, cache_read_input_tokens = ?7",
            rusqlite::params![
                stat.date,
                project_id,
                stat.cost_usd,
                stat.input_tokens,
                stat.output_tokens,
                stat.cache_creation_input_tokens,
                stat.cache_read_input_tokens,
            ],
        )?;
        Ok(())
    }

    pub fn get_all_projects(&self) -> Result<Vec<Project>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, display_name, full_path, total_cost_usd, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, session_count, last_accessed_at
             FROM projects ORDER BY last_accessed_at DESC",
        )?;
        let projects = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    display_name: row.get(1)?,
                    full_path: row.get(2)?,
                    total_cost_usd: row.get(3)?,
                    usage: TokenUsage {
                        input_tokens: row.get(4)?,
                        output_tokens: row.get(5)?,
                        cache_creation_input_tokens: row.get(6)?,
                        cache_read_input_tokens: row.get(7)?,
                    },
                    session_count: row.get(8)?,
                    last_accessed_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(projects)
    }

    pub fn get_project_sessions(&self, project_id: &str) -> Result<Vec<Session>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_id, slug, started_at, git_branch, is_subagent, parent_session_id, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, cost_usd, message_count, model
             FROM sessions WHERE project_id = ?1 ORDER BY started_at DESC",
        )?;
        let sessions = stmt
            .query_map([project_id], |row| {
                Ok(Session {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    slug: row.get(2)?,
                    started_at: row.get(3)?,
                    git_branch: row.get(4)?,
                    is_subagent: row.get::<_, i32>(5)? != 0,
                    parent_session_id: row.get(6)?,
                    usage: TokenUsage {
                        input_tokens: row.get(7)?,
                        output_tokens: row.get(8)?,
                        cache_creation_input_tokens: row.get(9)?,
                        cache_read_input_tokens: row.get(10)?,
                    },
                    cost_usd: row.get(11)?,
                    message_count: row.get(12)?,
                    model: row.get(13)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(sessions)
    }

    pub fn get_daily_stats(&self, days: i64) -> Result<Vec<DailyStat>> {
        let mut stmt = self.conn.prepare(
            "SELECT date, SUM(cost_usd), SUM(input_tokens), SUM(output_tokens), SUM(cache_creation_input_tokens), SUM(cache_read_input_tokens)
             FROM daily_stats
             WHERE date >= date('now', ?1)
             GROUP BY date ORDER BY date ASC",
        )?;
        let offset = format!("-{} days", days);
        let stats = stmt
            .query_map([&offset], |row| {
                Ok(DailyStat {
                    date: row.get(0)?,
                    cost_usd: row.get::<_, f64>(1).unwrap_or(0.0),
                    input_tokens: row.get::<_, i64>(2).unwrap_or(0),
                    output_tokens: row.get::<_, i64>(3).unwrap_or(0),
                    cache_creation_input_tokens: row.get::<_, i64>(4).unwrap_or(0),
                    cache_read_input_tokens: row.get::<_, i64>(5).unwrap_or(0),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(stats)
    }

    pub fn clear_all(&self) -> Result<()> {
        self.conn.execute_batch(
            "DELETE FROM daily_stats; DELETE FROM sessions; DELETE FROM projects;",
        )?;
        Ok(())
    }
}
