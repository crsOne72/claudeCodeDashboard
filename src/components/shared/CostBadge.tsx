import { formatCost, getCostBgColor } from "../../lib/costCalc";

export function CostBadge({ cost }: { cost: number }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCostBgColor(cost)}`}
    >
      {formatCost(cost)}
    </span>
  );
}
