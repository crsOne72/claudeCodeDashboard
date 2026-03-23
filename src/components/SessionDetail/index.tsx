import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { CostBadge } from "../shared/CostBadge";
import { ModelBadge } from "../shared/ModelBadge";
import { formatCost, formatTokens } from "../../lib/costCalc";
import { formatDateTime } from "../../lib/formatTime";
import { TokenTimelineChart } from "./TokenTimelineChart";
import { ToolUsageBreakdown } from "./ToolUsageBreakdown";
import { SessionLogTimeline } from "./SessionLogTimeline";

export function SessionDetail() {
  const { projectId, sessionId } = useParams<{
    projectId: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const selectSession = useAppStore((s) => s.selectSession);
  const entries = useAppStore((s) => s.entries);
  const loading = useAppStore((s) => s.loading);

  useEffect(() => {
    if (sessionId && projectId) {
      selectSession(sessionId, projectId);
    }
  }, [sessionId, projectId, selectSession]);

  const stats = useMemo(() => {
    let totalCost = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheWrite = 0;
    let cacheRead = 0;
    let messageCount = 0;
    const toolCounts: Record<string, number> = {};
    const models = new Set<string>();

    for (const e of entries) {
      totalCost += e.costUsd;
      if (e.usage) {
        inputTokens += e.usage.inputTokens;
        outputTokens += e.usage.outputTokens;
        cacheWrite += e.usage.cacheCreationInputTokens;
        cacheRead += e.usage.cacheReadInputTokens;
      }
      if (e.entryType === "user" || e.entryType === "assistant") {
        messageCount++;
      }
      if (e.toolName) {
        toolCounts[e.toolName] = (toolCounts[e.toolName] ?? 0) + 1;
      }
      if (e.model) models.add(e.model);
    }

    return { totalCost, inputTokens, outputTokens, cacheWrite, cacheRead, messageCount, toolCounts, models: [...models] };
  }, [entries]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/projects")}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Session Detail</h2>
          <p className="text-sm text-muted-foreground">{sessionId?.slice(0, 8)}</p>
        </div>
        {stats.models.map((m) => (
          <ModelBadge key={m} model={m} />
        ))}
        <CostBadge cost={stats.totalCost} />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading session data...</p>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Messages" value={stats.messageCount.toString()} />
            <StatCard label="Input" value={formatTokens(stats.inputTokens)} />
            <StatCard label="Output" value={formatTokens(stats.outputTokens)} />
            <StatCard label="Cache Write" value={formatTokens(stats.cacheWrite)} />
            <StatCard label="Cache Read" value={formatTokens(stats.cacheRead)} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Token Usage Over Time
              </h3>
              <TokenTimelineChart entries={entries} />
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Tool Usage
              </h3>
              <ToolUsageBreakdown toolCounts={stats.toolCounts} />
            </div>
          </div>

          {/* Cost breakdown by model */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Cost Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CostItem label="Input" cost={(stats.inputTokens / 1e6) * 3} />
              <CostItem label="Output" cost={(stats.outputTokens / 1e6) * 15} />
              <CostItem label="Cache Write" cost={(stats.cacheWrite / 1e6) * 3.75} />
              <CostItem label="Cache Read" cost={(stats.cacheRead / 1e6) * 0.3} />
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Session Timeline ({entries.length} entries)
            </h3>
            <SessionLogTimeline entries={entries} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function CostItem({ label, cost }: { label: string; cost: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{formatCost(cost)}</p>
    </div>
  );
}
