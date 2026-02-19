import { useAppStore } from "../../store/appStore";
import { isSubscriptionPlan } from "../../lib/costCalc";
import { CostSummaryCard } from "./CostSummaryCard";
import { TokenDonutChart } from "./TokenDonutChart";
import { ActiveSessionBanner } from "./ActiveSessionBanner";
import { DailyCostChart } from "./DailyCostChart";
import { TopProjectsList } from "./TopProjectsList";

export function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const dailyStats = useAppStore((s) => s.dailyStats);
  const activeSession = useAppStore((s) => s.activeSession);
  const userPlan = useAppStore((s) => s.userPlan);

  const totalUsage = projects.reduce(
    (acc, p) => ({
      inputTokens: acc.inputTokens + p.usage.inputTokens,
      outputTokens: acc.outputTokens + p.usage.outputTokens,
      cacheCreationInputTokens: acc.cacheCreationInputTokens + p.usage.cacheCreationInputTokens,
      cacheReadInputTokens: acc.cacheReadInputTokens + p.usage.cacheReadInputTokens,
    }),
    { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 }
  );

  const totalCost = projects.reduce((sum, p) => sum + p.totalCostUsd, 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStat = dailyStats.find((s) => s.date === todayStr);
  const todayCost = todayStat?.costUsd ?? 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      {activeSession && <ActiveSessionBanner session={activeSession} />}

      {isSubscriptionPlan(userPlan) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-sm">
          <span className="font-medium">
            {userPlan === "free" ? "Free Plan" : userPlan === "pro" ? "Pro Plan" : "Team Plan"}
          </span>
          <span className="text-yellow-400/80">—</span>
          <span className="text-yellow-400/80">
            Cost figures are API-equivalent estimates, not actual charges.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CostSummaryCard label="Today" cost={todayCost} isSubscription={isSubscriptionPlan(userPlan)} />
        <CostSummaryCard label="All Time" cost={totalCost} isSubscription={isSubscriptionPlan(userPlan)} />
        <CostSummaryCard
          label="Projects"
          cost={projects.length}
          isCurrency={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Daily Cost (30 days)</h3>
          <DailyCostChart data={dailyStats} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Token Distribution</h3>
          <TokenDonutChart usage={totalUsage} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Top Projects by Cost</h3>
        <TopProjectsList projects={projects} />
      </div>
    </div>
  );
}
