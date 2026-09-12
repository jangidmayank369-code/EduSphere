import { NavLink } from "react-router-dom";

const navigation = [
  {
    label: "Dashboard",
    hindi: "डैशबोर्ड",
    path: "/dashboard",
    icon: "grid",
  },
  {
    label: "School Profile",
    hindi: "स्कूल प्रोफ़ाइल",
    path: "/school-profile",
    icon: "school",
  },
];

const Icon = ({ name }) => {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),

    school: (
      <>
        <path d="m3 10 9-6 9 6" />
        <path d="M5 10v9h14v-9" />
        <path d="M9 19v-5h6v5" />
        <path d="M3 21h18" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    action: (
      <>
        <path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
};

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">E</div>

        <div className="sidebar-brand-text">
          <strong>EduSphere</strong>
          <span>School Operating System</span>
        </div>
      </div>

      <div className="sidebar-workspace">
        <span>WORKSPACE</span>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">
              <Icon name={item.icon} />
            </span>

            <span className="nav-label">
              <strong>{item.label}</strong>
              <small>{item.hindi}</small>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-system">
          <span className="system-live-dot" />

          <div>
            <strong>System Online</strong>
            <small>Core services operational</small>
          </div>
        </div>

        <div className="sidebar-footer">
          <span>EduSphere</span>
          <small>v0.1.0</small>
        </div>
      </div>
    </aside>
  );
}