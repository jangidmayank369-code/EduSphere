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
    en: "Students",
    hi: "विद्यार्थी",
    path: "/students",
    icon: "users",
  },
  {
    en: "Fee Management",
    hi: "फीस प्रबंधन",
    path: "/fees",
    icon: "wallet",
  },
  {
    en: "Users & Identity",
    hi: "यूज़र और पहचान",
    path: "/users",
    icon: "identity",
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

function Icon({ name }) {
  const common = {
    width: 20,
    height: 20,
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
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8" />
        <path d="M18 14.8c1.8.8 3 2.6 3 4.7" />
      </>
    ),

    wallet: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5Z" />
        <path d="M4 7h14.5A2.5 2.5 0 0 1 21 9.5v5H17a2.5 2.5 0 0 1 0-5h4" />
        <path d="M17 12h.01" />
      </>
    ),

    identity: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="9" r="2.5" />
        <path d="M8 17c.8-2 2.1-3 4-3s3.2 1 4 3" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] || icons.grid}</svg>;
}

export default function Sidebar() {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("edusphere-language") || "EN",
  );

  const t = TEXT[language] || TEXT.EN;

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const nextLanguage =
        event.detail === "HI" || event.detail === "EN"
          ? event.detail
          : localStorage.getItem("edusphere-language") || "EN";

      setLanguage(nextLanguage);
    };

    window.addEventListener(
      "edusphere-language-change",
      handleLanguageChange,
    );

    return () => {
      window.removeEventListener(
        "edusphere-language-change",
        handleLanguageChange,
      );
    };
  }, []);

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
            {({ isActive }) => (
              <>
                <span className="nav-icon">
                  <Icon name={item.icon} />
                </span>

                <span className="nav-label">
                  <strong>
                    {language === "HI" ? item.hi : item.en}
                  </strong>

                  <small>
                    {language === "HI" ? item.en : item.hi}
                  </small>
                </span>

                {isActive && <span className="nav-active-indicator" />}
              </>
            )}
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