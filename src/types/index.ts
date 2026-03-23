export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface CostBreakdown {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
  total: number;
}

export interface Project {
  id: string;
  displayName: string;
  fullPath: string | null;
  totalCostUsd: number;
  usage: TokenUsage;
  sessionCount: number;
  lastAccessedAt: string | null;
}

export interface Session {
  id: string;
  projectId: string;
  slug: string | null;
  startedAt: string | null;
  gitBranch: string | null;
  isSubagent: boolean;
  parentSessionId: string | null;
  usage: TokenUsage;
  costUsd: number;
  messageCount: number;
  model: string | null;
}

export interface JournalEntry {
  uuid: string | null;
  entryType: string;
  timestamp: string | null;
  model: string | null;
  usage: TokenUsage | null;
  toolName: string | null;
  messageRole: string | null;
  costUsd: number;
  sessionId: string;
}

export interface DailyStat {
  date: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface ModelPricing {
  prefix: string;
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}
