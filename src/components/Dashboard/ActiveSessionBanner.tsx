import { Activity } from "lucide-react";
import { CostBadge } from "../shared/CostBadge";
import { ModelBadge } from "../shared/ModelBadge";
import { relativeTime } from "../../lib/formatTime";
import type { Session } from "../../types";

export function ActiveSessionBanner({ session }: { session: Session }) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-4">
      <Activity size={18} className="text-primary animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {session.slug ?? session.id.slice(0, 8)}
        </p>
        <p className="text-xs text-muted-foreground">
          Started {relativeTime(session.startedAt)} &middot; {session.messageCount} messages
        </p>
      </div>
      <ModelBadge model={session.model} />
      <CostBadge cost={session.costUsd} />
    </div>
  );
}
