import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/",          icon: "📊", label: "Dashboard",       badge: null },
  { to: "/reports",   icon: "📋", label: "Reports Inbox",   badge: null },
  { to: "/issues",    icon: "🔍", label: "Issue Intel",     badge: null },
  { to: "/tasks",     icon: "⚙️", label: "Task Board",      badge: null },
  { to: "/fleet",     icon: "🤖", label: "Robot Simulation", badge: "Sim" },
  { to: "/analytics", icon: "📈", label: "Analytics",       badge: null },
  { to: "/audit",     icon: "🛡️", label: "Audit Log",       badge: null },
  { to: "/evaluation",icon: "⚖️", label: "Evaluation",      badge: null },
];

export default function Navbar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <nav className={`navbar ${isOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="navbar-logo">
          <div className="brand-lockup">
            <div className="brand-mark">
              <span className="brand-glyph">⬡</span>
            </div>
            <div className="brand-text">
              <h2 className="brand-name">RoboOps</h2>
              <span className="brand-desc">Operations Intel</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button className="mobile-close-btn" onClick={onClose} aria-label="Close navigation">
            ✕
          </button>
        </div>

        {/* Section Label */}
        <div className="nav-section-label">Operations</div>

        {/* Navigation Items */}
        <div className="nav-links-container">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-item-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </div>

        {/* Sidebar Footer info */}
        <div className="navbar-footer">
          <div className="system-status-indicator">
            <span className="system-dot" />
            <span className="system-status-label">Simulation Environment</span>
          </div>
          <p className="system-notice">
            Software-only intelligence. All workcell dispatches are simulated.
          </p>
        </div>
      </nav>
    </>
  );
}
