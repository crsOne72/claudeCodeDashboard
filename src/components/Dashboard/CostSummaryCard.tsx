import { formatCost, getCostColor } from "../../lib/costCalc";

interface Props {
  label: string;
  cost: number;
  isCurrency?: boolean;
  isSubscription?: boolean;
}

export function CostSummaryCard({ label, cost, isCurrency = true, isSubscription = false }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${isCurrency ? getCostColor(cost) : "text-foreground"}`}>
        {isCurrency ? formatCost(cost) : cost}
      </p>
      {isCurrency && isSubscription && (
        <p className="text-xs text-yellow-400/70 mt-1">API-Äquiv.</p>
      )}
    </div>
  );
}
