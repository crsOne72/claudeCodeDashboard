import { NavLink } from "react-router-dom";
import { LayoutDashboard, FolderOpen, RefreshCw, Settings } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { formatCost, isSubscriptionPlan } from "../../lib/costCalc";

export function Sidebar() {
  const scanProjects = useAppStore((s) => s.scanProjects);
  const loading = useAppStore((s) => s.loading);
  const projects = useAppStore((s) => s.projects);
  const userPlan = useAppStore((s) => s.userPlan);

  const totalCost = projects.reduce((sum, p) => sum + p.totalCostUsd, 0);
  const showBadge = isSubscriptionPlan(userPlan);

  return (
    <aside className="w-56 border-r border-border bg-zinc-950 flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-sm font-bold tracking-tight text-zinc-100">
          Claude Code Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          Total: {formatCost(totalCost)}
          {showBadge && (
            <span className="text-yellow-400 text-xs font-medium">(est.)</span>
          )}
        </p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`
          }
        >
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`
          }
        >
          <FolderOpen size={16} />
          Projects
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`
          }
        >
          <Settings size={16} />
          Settings
        </NavLink>
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={() => scanProjects()}
          disabled={loading}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Scanning..." : "Rescan Projects"}
        </button>
      </div>
    </aside>
  );
}
