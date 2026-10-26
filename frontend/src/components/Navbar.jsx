import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/",          icon: "⬡", label: "Dashboard"    },
  { to: "/reports",   icon: "📋", label: "Reports Inbox" },
  { to: "/issues",    icon: "🔍", label: "Issue Intel"   },
  { to: "/tasks",     icon: "⚙", label: "Task Board"    },
  { to: "/audit",     icon: "📊", label: "Audit & Eval"  },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <h1>RoboOps</h1>
        <span>Maintenance System</span>
      </div>

      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}

      <div style={{ marginTop: "auto", padding: "1rem 1.5rem", borderTop: "1px solid var(--border-subtle)" }}>
        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          SIMULATION MODE<br />No real robots controlled
        </p>
      </div>
    </nav>
  );
}
