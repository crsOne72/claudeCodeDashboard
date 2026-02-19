import type { TokenUsage, CostBreakdown, ModelPricing } from "../types";
import type { UserPlan } from "../store/appStore";

export function isSubscriptionPlan(plan: UserPlan): boolean {
  return plan === "free" || plan === "pro" || plan === "team";
}

export const MODEL_PRICING: ModelPricing[] = [
  { prefix: "claude-opus-4", input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  { prefix: "claude-sonnet-4", input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  { prefix: "claude-haiku-4", input: 0.8, output: 4, cacheWrite: 1.0, cacheRead: 0.08 },
];

export function getPricing(model: string): ModelPricing {
  return MODEL_PRICING.find((p) => model.startsWith(p.prefix)) ?? MODEL_PRICING[1];
}

export function calculateCost(usage: TokenUsage, model: string): CostBreakdown {
  const pricing = getPricing(model);
  const input = (usage.inputTokens / 1_000_000) * pricing.input;
  const output = (usage.outputTokens / 1_000_000) * pricing.output;
  const cacheWrite = (usage.cacheCreationInputTokens / 1_000_000) * pricing.cacheWrite;
  const cacheRead = (usage.cacheReadInputTokens / 1_000_000) * pricing.cacheRead;
  return { input, output, cacheWrite, cacheRead, total: input + output + cacheWrite + cacheRead };
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function getCostColor(usd: number): string {
  if (usd < 0.1) return "text-green-400";
  if (usd < 1) return "text-yellow-400";
  if (usd < 5) return "text-orange-400";
  return "text-red-400";
}

export function getCostBgColor(usd: number): string {
  if (usd < 0.1) return "bg-green-400/10 text-green-400 border-green-400/20";
  if (usd < 1) return "bg-yellow-400/10 text-yellow-400 border-yellow-400/20";
  if (usd < 5) return "bg-orange-400/10 text-orange-400 border-orange-400/20";
  return "bg-red-400/10 text-red-400 border-red-400/20";
}
