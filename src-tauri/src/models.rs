use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TokenUsage {
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_creation_input_tokens: i64,
    pub cache_read_input_tokens: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostBreakdown {
    pub input: f64,
    pub output: f64,
    pub cache_write: f64,
    pub cache_read: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub display_name: String,
    pub full_path: Option<String>,
    pub total_cost_usd: f64,
    pub usage: TokenUsage,
    pub session_count: i64,
    pub last_accessed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub project_id: String,
    pub slug: Option<String>,
    pub started_at: Option<String>,
    pub git_branch: Option<String>,
    pub is_subagent: bool,
    pub parent_session_id: Option<String>,
    pub usage: TokenUsage,
    pub cost_usd: f64,
    pub message_count: i64,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntry {
    pub uuid: Option<String>,
    pub entry_type: String,
    pub timestamp: Option<String>,
    pub model: Option<String>,
    pub usage: Option<TokenUsage>,
    pub tool_name: Option<String>,
    pub message_role: Option<String>,
    pub cost_usd: f64,
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStat {
    pub date: String,
    pub cost_usd: f64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_creation_input_tokens: i64,
    pub cache_read_input_tokens: i64,
}

/// Pricing for a model (per million tokens)
#[derive(Debug, Clone)]
pub struct ModelPricing {
    pub prefix: &'static str,
    pub input: f64,
    pub output: f64,
    pub cache_write: f64,
    pub cache_read: f64,
}

pub const MODEL_PRICING: &[ModelPricing] = &[
    ModelPricing {
        prefix: "claude-opus-4",
        input: 15.0,
        output: 75.0,
        cache_write: 18.75,
        cache_read: 1.50,
    },
    ModelPricing {
        prefix: "claude-sonnet-4",
        input: 3.0,
        output: 15.0,
        cache_write: 3.75,
        cache_read: 0.30,
    },
    ModelPricing {
        prefix: "claude-haiku-4",
        input: 0.80,
        output: 4.0,
        cache_write: 1.00,
        cache_read: 0.08,
    },
];

pub fn get_pricing(model: &str) -> &'static ModelPricing {
    MODEL_PRICING
        .iter()
        .find(|p| model.starts_with(p.prefix))
        .unwrap_or(&MODEL_PRICING[1]) // fallback to sonnet pricing
}

pub fn calculate_cost(usage: &TokenUsage, model: &str) -> CostBreakdown {
    let pricing = get_pricing(model);
    let input = usage.input_tokens as f64 / 1_000_000.0 * pricing.input;
    let output = usage.output_tokens as f64 / 1_000_000.0 * pricing.output;
    let cache_write = usage.cache_creation_input_tokens as f64 / 1_000_000.0 * pricing.cache_write;
    let cache_read = usage.cache_read_input_tokens as f64 / 1_000_000.0 * pricing.cache_read;
    CostBreakdown {
        input,
        output,
        cache_write,
        cache_read,
        total: input + output + cache_write + cache_read,
    }
}
