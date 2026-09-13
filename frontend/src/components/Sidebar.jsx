import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const navigation = [
  {
    en: "Dashboard",
    hi: "डैशबोर्ड",
    path: "/dashboard",
    icon: "grid",
  },
  {
    en: "School Profile",
    hi: "स्कूल प्रोफ़ाइल",
    path: "/school-profile",
    icon: "school",
  },
  {
    en: "Users & Identity",
    hi: "यूज़र और पहचान",
    path: "/users",
    icon: "users",
  },
];

const TEXT = {
  EN: {
    workspace: "WORKSPACE",
    system: "System Online",
    services: "Core services operational",
    live: "LIVE",
  },
  HI: {
    workspace: "कार्य क्षेत्र",
    system: "सिस्टम ऑनलाइन",
    services: "मुख्य सेवाएँ सक्रिय हैं",
    live: "लाइव",
  },
};

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
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

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
}

export default function Sidebar() {
  const [language, setLanguage] = useState(() =>
    localStorage.getItem("edusphere_language") === "HI"
      ? "HI"
      : "EN",
  );

  useEffect(() => {
    const onLanguageChange = (event) => {
      setLanguage(event.detail === "HI" ? "HI" : "EN");
    };

    window.addEventListener(
      "edusphere-language-change",
      onLanguageChange,
    );

    return () =>
      window.removeEventListener(
        "edusphere-language-change",
        onLanguageChange,
      );
  }, []);

  const t = TEXT[language];

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
        <span>{t.workspace}</span>
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
              <strong>
                {language === "HI" ? item.hi : item.en}
              </strong>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-system">
          <span className="system-live-dot" />

          <div>
            <strong>{t.system}</strong>
            <small>{t.services}</small>
          </div>

          <span className="sidebar-live">{t.live}</span>
        </div>

        <div className="sidebar-footer">
          <span>EduSphere</span>
          <small>v0.1.0</small>
        </div>
      </div>
    </aside>
  );
}