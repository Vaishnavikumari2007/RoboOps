import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard        from "./pages/Dashboard";
import ReportsInbox     from "./pages/ReportsInbox";
import IssueIntelligence from "./pages/IssueIntelligence";
import TaskBoard        from "./pages/TaskBoard";
import EvaluationAudit  from "./pages/EvaluationAudit";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="page-content">
          <Routes>
            <Route path="/"        element={<Dashboard />} />
            <Route path="/reports" element={<ReportsInbox />} />
            <Route path="/issues"  element={<IssueIntelligence />} />
            <Route path="/tasks"   element={<TaskBoard />} />
            <Route path="/audit"   element={<EvaluationAudit />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
