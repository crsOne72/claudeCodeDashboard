import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatTokens } from "../../lib/costCalc";
import type { TokenUsage } from "../../types";

const COLORS = {
  Input: "#3b82f6",
  Output: "#f97316",
  "Cache Write": "#8b5cf6",
  "Cache Read": "#22c55e",
};

export function TokenDonutChart({ usage }: { usage: TokenUsage }) {
  const data = [
    { name: "Input", value: usage.inputTokens },
    { name: "Output", value: usage.outputTokens },
    { name: "Cache Write", value: usage.cacheCreationInputTokens },
    { name: "Cache Read", value: usage.cacheReadInputTokens },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">No token data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={COLORS[entry.name as keyof typeof COLORS]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => formatTokens(Number(value))}
        />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-zinc-400">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
