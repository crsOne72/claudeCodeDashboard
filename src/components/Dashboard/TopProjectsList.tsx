import { useNavigate } from "react-router-dom";
import { CostBadge } from "../shared/CostBadge";
import { formatTokens } from "../../lib/costCalc";
import { relativeTime } from "../../lib/formatTime";
import type { Project } from "../../types";

export function TopProjectsList({ projects }: { projects: Project[] }) {
  const navigate = useNavigate();
  const sorted = [...projects].sort((a, b) => b.totalCostUsd - a.totalCostUsd).slice(0, 10);

  if (sorted.length === 0) {
    return <p className="text-muted-foreground text-sm">No projects found</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground border-b border-border">
          <th className="pb-2 font-medium">Project</th>
          <th className="pb-2 font-medium text-right">Sessions</th>
          <th className="pb-2 font-medium text-right">Tokens</th>
          <th className="pb-2 font-medium text-right">Cost</th>
          <th className="pb-2 font-medium text-right">Last Active</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((p) => (
          <tr
            key={p.id}
            className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate("/projects")}
          >
            <td className="py-2.5">
              <p className="font-medium">{p.displayName}</p>
              {p.fullPath && (
                <p className="text-xs text-muted-foreground truncate max-w-xs">{p.fullPath}</p>
              )}
            </td>
            <td className="py-2.5 text-right text-muted-foreground">{p.sessionCount}</td>
            <td className="py-2.5 text-right text-muted-foreground">
              {formatTokens(
                p.usage.inputTokens +
                  p.usage.outputTokens +
                  p.usage.cacheCreationInputTokens +
                  p.usage.cacheReadInputTokens
              )}
            </td>
            <td className="py-2.5 text-right">
              <CostBadge cost={p.totalCostUsd} />
            </td>
            <td className="py-2.5 text-right text-muted-foreground text-xs">
              {relativeTime(p.lastAccessedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
