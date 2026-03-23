import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, GitBranch } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { CostBadge } from "../shared/CostBadge";
import { ModelBadge } from "../shared/ModelBadge";
import { formatTokens } from "../../lib/costCalc";
import { relativeTime } from "../../lib/formatTime";
import type { Project, Session } from "../../types";

export function Projects() {
  const projects = useAppStore((s) => s.projects);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4 max-w-6xl">
      <h2 className="text-xl font-semibold">Projects</h2>
      <div className="space-y-2">
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No projects found. Click "Rescan Projects" in the sidebar.
          </p>
        ) : (
          projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              expanded={expandedId === project.id}
              onToggle={() =>
                setExpandedId(expandedId === project.id ? null : project.id)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  expanded,
  onToggle,
}: {
  project: Project;
  expanded: boolean;
  onToggle: () => void;
}) {
  const selectProject = useAppStore((s) => s.selectProject);
  const sessions = useAppStore((s) => s.sessions);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);

  const handleToggle = () => {
    onToggle();
    if (!expanded) {
      selectProject(project.id);
    }
  };

  const projectSessions = selectedProjectId === project.id ? sessions : [];

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleToggle}
      >
        {expanded ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{project.displayName}</p>
          {project.fullPath && (
            <p className="text-xs text-muted-foreground truncate">{project.fullPath}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{project.sessionCount} sessions</span>
        <span className="text-xs text-muted-foreground">
          {formatTokens(
            project.usage.inputTokens +
              project.usage.outputTokens +
              project.usage.cacheCreationInputTokens +
              project.usage.cacheReadInputTokens
          )}{" "}
          tokens
        </span>
        <CostBadge cost={project.totalCostUsd} />
        <span className="text-xs text-muted-foreground">{relativeTime(project.lastAccessedAt)}</span>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {projectSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Loading sessions...</p>
          ) : (
            <SessionList sessions={projectSessions} projectId={project.id} />
          )}
        </div>
      )}
    </div>
  );
}

function SessionList({
  sessions,
  projectId,
}: {
  sessions: Session[];
  projectId: string;
}) {
  const navigate = useNavigate();

  // Separate parent and subagent sessions
  const parentSessions = sessions.filter((s) => !s.isSubagent);
  const subagentMap = new Map<string, Session[]>();
  for (const s of sessions.filter((s) => s.isSubagent)) {
    const parentId = s.parentSessionId ?? "orphan";
    const list = subagentMap.get(parentId) ?? [];
    list.push(s);
    subagentMap.set(parentId, list);
  }

  return (
    <div className="divide-y divide-border/50">
      {parentSessions.map((session) => (
        <div key={session.id}>
          <div
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => navigate(`/session/${projectId}/${session.id}`)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {session.slug ?? session.id.slice(0, 8)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {session.gitBranch && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GitBranch size={10} />
                    {session.gitBranch}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {session.messageCount} messages
                </span>
              </div>
            </div>
            <ModelBadge model={session.model} />
            <CostBadge cost={session.costUsd} />
            <span className="text-xs text-muted-foreground">
              {relativeTime(session.startedAt)}
            </span>
          </div>

          {/* Subagent sessions indented */}
          {subagentMap.get(session.id)?.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-3 px-4 py-2 pl-10 hover:bg-muted/30 cursor-pointer transition-colors border-t border-border/30"
              onClick={() => navigate(`/session/${projectId}/${sub.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  Subagent: {sub.id.slice(0, 12)}
                </p>
              </div>
              <ModelBadge model={sub.model} />
              <CostBadge cost={sub.costUsd} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
