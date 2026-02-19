import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Project, Session, JournalEntry, DailyStat } from "../types";

export type UserPlan = "api" | "pro" | "team" | "free";

interface AppState {
  // Data
  projects: Project[];
  sessions: Session[];
  entries: JournalEntry[];
  dailyStats: DailyStat[];
  activeSession: Session | null;

  // UI state
  selectedProjectId: string | null;
  selectedSessionId: string | null;
  loading: boolean;
  error: string | null;

  // Settings
  userPlan: UserPlan;

  // Actions
  scanProjects: () => Promise<void>;
  loadProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  selectSession: (sessionId: string, projectId: string) => Promise<void>;
  loadDailyStats: (days?: number) => Promise<void>;
  loadActiveSession: () => Promise<void>;
  startWatcher: () => Promise<void>;
  clearSelection: () => void;
  setUserPlan: (plan: UserPlan) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      sessions: [],
      entries: [],
      dailyStats: [],
      activeSession: null,
      selectedProjectId: null,
      selectedSessionId: null,
      loading: false,
      error: null,
      userPlan: "api" as UserPlan,

      scanProjects: async () => {
        set({ loading: true, error: null });
        try {
          const projects = await invoke<Project[]>("scan_projects");
          set({ projects, loading: false });
          // Reload daily stats after scan
          get().loadDailyStats();
          get().loadActiveSession();
        } catch (e) {
          set({ error: String(e), loading: false });
        }
      },

      loadProjects: async () => {
        try {
          const projects = await invoke<Project[]>("get_all_projects");
          set({ projects });
        } catch (e) {
          set({ error: String(e) });
        }
      },

      selectProject: async (projectId: string) => {
        set({ selectedProjectId: projectId, selectedSessionId: null, entries: [], loading: true });
        try {
          const sessions = await invoke<Session[]>("get_project_sessions", { projectId });
          set({ sessions, loading: false });
        } catch (e) {
          set({ error: String(e), loading: false });
        }
      },

      selectSession: async (sessionId: string, projectId: string) => {
        set({ selectedSessionId: sessionId, loading: true });
        try {
          const entries = await invoke<JournalEntry[]>("get_session_entries", {
            sessionId,
            projectId,
          });
          set({ entries, loading: false });
        } catch (e) {
          set({ error: String(e), loading: false });
        }
      },

      loadDailyStats: async (days?: number) => {
        try {
          const dailyStats = await invoke<DailyStat[]>("get_daily_stats", { days: days ?? 30 });
          set({ dailyStats });
        } catch (e) {
          set({ error: String(e) });
        }
      },

      loadActiveSession: async () => {
        try {
          const activeSession = await invoke<Session | null>("get_active_session");
          set({ activeSession });
        } catch (e) {
          // Ignore errors for active session
        }
      },

      startWatcher: async () => {
        await listen("jsonl-updated", () => {
          // Re-scan on file changes
          get().scanProjects();
        });
      },

      clearSelection: () => {
        set({ selectedProjectId: null, selectedSessionId: null, sessions: [], entries: [] });
      },

      setUserPlan: (plan: UserPlan) => {
        set({ userPlan: plan });
      },
    }),
    {
      name: "claude-dashboard-settings",
      partialize: (state) => ({ userPlan: state.userPlan }),
    }
  )
);
