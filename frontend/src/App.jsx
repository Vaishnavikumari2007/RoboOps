import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import TopHeader from "./components/TopHeader";
import Dashboard from "./pages/Dashboard";
import ReportsInbox from "./pages/ReportsInbox";
import IssueIntelligence from "./pages/IssueIntelligence";
import TaskBoard from "./pages/TaskBoard";
import RobotFleet from "./pages/RobotFleet";
import OperationsAnalytics from "./pages/OperationsAnalytics";
import EvaluationAudit from "./pages/EvaluationAudit";
import AuditLog from "./pages/AuditLog";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="app-main">
          <TopHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reports" element={<ReportsInbox />} />
              <Route path="/issues" element={<IssueIntelligence />} />
              <Route path="/tasks" element={<TaskBoard />} />
              <Route path="/fleet" element={<RobotFleet />} />
              <Route path="/simulation" element={<RobotFleet />} />
              <Route path="/analytics" element={<OperationsAnalytics />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/evaluation" element={<EvaluationAudit />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
