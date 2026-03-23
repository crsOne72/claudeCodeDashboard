import { useState, useMemo } from "react";
import { User, Bot, Wrench, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { CostBadge } from "../shared/CostBadge";
import { formatTokens } from "../../lib/costCalc";
import { formatDateTime } from "../../lib/formatTime";
import type { JournalEntry } from "../../types";

const PAGE_SIZE = 50;

export function SessionLogTimeline({ entries }: { entries: JournalEntry[] }) {
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () => entries.filter((e) => ["user", "assistant", "tool_use"].includes(e.entryType)),
    [entries]
  );

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hasMore = filtered.length > PAGE_SIZE && !showAll;

  if (filtered.length === 0) {
    return <p className="text-muted-foreground text-sm">No message entries</p>;
  }

  return (
    <div className="space-y-1">
      {visible.map((entry, i) => (
        <TimelineEntry key={entry.uuid ?? i} entry={entry} />
      ))}

      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center gap-1 w-full justify-center py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown size={14} />
          Show all {filtered.length} entries
        </button>
      )}
      {showAll && filtered.length > PAGE_SIZE && (
        <button
          onClick={() => setShowAll(false)}
          className="flex items-center gap-1 w-full justify-center py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronUp size={14} />
          Show less
        </button>
      )}
    </div>
  );
}

function TimelineEntry({ entry }: { entry: JournalEntry }) {
  const icon = (() => {
    switch (entry.entryType) {
      case "user":
        return <User size={14} className="text-blue-400" />;
      case "tool_use":
        return <Wrench size={14} className="text-purple-400" />;
      case "assistant":
        return <Bot size={14} className="text-orange-400" />;
      default:
        return <FileText size={14} className="text-zinc-500" />;
    }
  })();

  const label = (() => {
    if (entry.entryType === "tool_use" && entry.toolName) {
      return entry.toolName;
    }
    return entry.entryType;
  })();

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-muted/30 transition-colors">
      {icon}
      <span className="text-sm flex-1 min-w-0 truncate">{label}</span>
      {entry.usage && (
        <span className="text-xs text-muted-foreground">
          {formatTokens(entry.usage.inputTokens + entry.usage.outputTokens)} tok
        </span>
      )}
      {entry.costUsd > 0 && <CostBadge cost={entry.costUsd} />}
      <span className="text-xs text-muted-foreground w-28 text-right">
        {formatDateTime(entry.timestamp)}
      </span>
    </div>
  );
}
