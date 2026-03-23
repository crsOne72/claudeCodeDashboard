import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatTokens } from "../../lib/costCalc";
import type { JournalEntry } from "../../types";

export function TokenTimelineChart({ entries }: { entries: JournalEntry[] }) {
  // Build cumulative data points from entries that have usage
  let cumInput = 0;
  let cumOutput = 0;

  const data = entries
    .filter((e) => e.usage)
    .map((e, i) => {
      cumInput += e.usage!.inputTokens;
      cumOutput += e.usage!.outputTokens;
      return {
        index: i,
        input: cumInput,
        output: cumOutput,
      };
    });

  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">No token data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="index"
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatTokens}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => formatTokens(Number(value))}
        />
        <Legend formatter={(v: string) => <span className="text-xs text-zinc-400">{v}</span>} />
        <Line
          type="monotone"
          dataKey="input"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Input"
        />
        <Line
          type="monotone"
          dataKey="output"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          name="Output"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
