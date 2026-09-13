import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";

const TEXT = {
  EN: {
    session: "Academic Session",
    live: "LIVE",
    logout: "Logout",
    admin: "Administrator",
  },
  HI: {
    session: "शैक्षणिक सत्र",
    live: "लाइव",
    logout: "लॉगआउट",
    admin: "प्रशासक",
  },
};

function Icon({ name, size = 16 }) {
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
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
}

export default function Topbar() {
  const { user, logout } = useAuth();

  const [language, setLanguage] = useState(
    () => localStorage.getItem("edusphere_language") || "EN",
  );

  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleLanguageChange = (event) => {
      const nextLanguage = event.detail === "HI" ? "HI" : "EN";
      setLanguage(nextLanguage);
    };

    window.addEventListener(
      "edusphere-language-change",
      handleLanguageChange,
    );

    return () => {
      clearInterval(timer);
      window.removeEventListener(
        "edusphere-language-change",
        handleLanguageChange,
      );
    };
  }, []);

  const t = TEXT[language];

  const timeText = useMemo(
    () =>
      currentTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    [currentTime],
  );

  const dateText = useMemo(
    () =>
      currentTime.toLocaleDateString(
        language === "HI" ? "hi-IN" : "en-IN",
        {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      ),
    [currentTime, language],
  );

  const firstName =
    user?.full_name?.trim()?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Admin";

  const avatarLetter = firstName.charAt(0).toUpperCase();

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem("edusphere_language", nextLanguage);

    window.dispatchEvent(
      new CustomEvent("edusphere-language-change", {
        detail: nextLanguage,
      }),
    );
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          EduSphere School Operating System
        </div>

        <div className="session-pill">
          <Icon name="calendar" size={12} />
          <span>{t.session}</span>
          <strong>2026–27</strong>
        </div>
      </div>

      <div className="topbar-right">
        <div className="live-time">
          <strong>{timeText}</strong>
          <span>{dateText}</span>
        </div>

        <div className="topbar-live">
          <span className="status-dot" />
          {t.live}
        </div>

        <div
          className="language-switch"
          aria-label="Language selection"
        >
          <button
            type="button"
            className={language === "EN" ? "active" : ""}
            onClick={() => changeLanguage("EN")}
            aria-label="Switch to English"
          >
            EN
          </button>

          <button
            type="button"
            className={language === "HI" ? "active" : ""}
            onClick={() => changeLanguage("HI")}
            aria-label="हिंदी में बदलें"
          >
            HI
          </button>
        </div>

        <div className="user-menu">
          <div className="user-avatar" title={user?.full_name || user?.email}>
            {avatarLetter}
          </div>

          <div className="user-details">
            <strong>{firstName}</strong>
            <small>{t.admin}</small>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            <Icon name="logout" size={14} />
            {t.logout}
          </button>
        </div>
      </div>
    </header>
  );
}