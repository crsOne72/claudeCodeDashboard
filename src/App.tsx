import { HashRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Projects } from "./components/Projects";
import { SessionDetail } from "./components/SessionDetail";
import { Settings } from "./components/Settings";
import { useAppStore } from "./store/appStore";

export default function App() {
  const scanProjects = useAppStore((s) => s.scanProjects);
  const startWatcher = useAppStore((s) => s.startWatcher);

  useEffect(() => {
    scanProjects();
    startWatcher();
  }, [scanProjects, startWatcher]);

  return (
    <HashRouter>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/session/:projectId/:sessionId" element={<SessionDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
