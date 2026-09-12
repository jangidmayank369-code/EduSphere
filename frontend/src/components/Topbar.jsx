import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AppShell from "../components/AppShell";
import { useAuth } from "../auth/AuthContext";

const TEXT = {
  EN: {
    evening: "Good evening",
    overview:
      "Your school's operational command center — everything important in one place.",
    search: "Search anything or type a command...",
    session: "Academic Session",
    today: "Today",
    students: "Students",
    teachers: "Teachers",
    attendance: "Attendance",
    actions: "Pending Actions",
    enrolled: "Total enrolled",
    teaching: "Teaching staff",
    todayAttendance: "Today's attendance",
    attention: "Needs attention",

    pulse: "School Pulse",
    liveOverview: "Live operational overview",
    operational: "School operations",
    noLiveData: "Live metrics will appear here as modules are connected.",

    actionCenter: "Action Center",
    actionSubtitle: "Things that need your attention",
    noActions: "No live actions yet",
    actionDescription:
      "Action Center will surface approvals, exceptions, follow-ups and important tasks.",

    exceptions: "Exceptions",
    exceptionSubtitle: "Problems detected across operations",
    noExceptions: "No exceptions available",
    exceptionDescription:
      "Attendance gaps, fee risks, timetable conflicts and data issues will appear here.",

    schedule: "Today's Schedule",
    scheduleSubtitle: "Current academic activity",
    noSchedule: "Timetable data not connected",
    scheduleDescription:
      "Today's classes, periods, substitutions and timetable changes will appear here.",

    automation: "Automation",
    automationSubtitle: "School workflows",
    automationReady: "Automation Engine ready",
    automationDescription:
      "WHEN → CONDITION → ACTION workflows will run from this control center.",

    upcoming: "Upcoming",
    upcomingSubtitle: "Next important events",
    upcomingEmpty: "No upcoming events yet",

    quality: "Data Quality",
    qualitySubtitle: "School data health",
    qualityReady: "Ready for live checks",
    qualityDescription:
      "Missing, duplicate and inconsistent records will be surfaced here.",

    workload: "Workload",
    workloadSubtitle: "Staff workload intelligence",
    workloadReady: "Optimizer ready",
    workloadDescription:
      "Workload balancing, substitute requirements and operational pressure will appear here.",

    saved: "Human Work Saved",
    savedSubtitle: "Time saved through EduSphere",
    savedValue: "—",
    savedDescription:
      "Automation and intelligent workflows will calculate actual time saved.",

    quickActions: "Quick Actions",
    schoolProfile: "School Profile",
    academicSessions: "Academic Sessions",
    assistant: "Smart Assistant",
    command: "Command Search",

    system: "System Health",
    healthy: "Healthy",
    authentication: "Authentication",
    api: "Application API",
    database: "Database",
    connected: "Connected",

    ready: "Ready",
    live: "LIVE",
    setup: "Setup",
  },

  HI: {
    evening: "शुभ संध्या",
    overview:
      "आपके स्कूल का ऑपरेशनल कमांड सेंटर — सभी महत्वपूर्ण जानकारी एक जगह।",
    search: "कुछ भी खोजें या कमांड लिखें...",
    session: "शैक्षणिक सत्र",
    today: "आज",
    students: "विद्यार्थी",
    teachers: "शिक्षक",
    attendance: "उपस्थिति",
    actions: "लंबित कार्य",
    enrolled: "कुल नामांकित",
    teaching: "शिक्षण स्टाफ",
    todayAttendance: "आज की उपस्थिति",
    attention: "ध्यान आवश्यक",

    pulse: "स्कूल पल्स",
    liveOverview: "स्कूल की लाइव स्थिति",
    operational: "स्कूल संचालन",
    noLiveData:
      "मॉड्यूल कनेक्ट होने के साथ लाइव मेट्रिक्स यहाँ दिखाई देंगे।",

    actionCenter: "एक्शन सेंटर",
    actionSubtitle: "ध्यान देने योग्य कार्य",
    noActions: "अभी कोई लाइव कार्य नहीं",
    actionDescription:
      "अप्रूवल, अपवाद, फॉलो-अप और महत्वपूर्ण कार्य यहाँ दिखाई देंगे।",

    exceptions: "अपवाद",
    exceptionSubtitle: "संचालन में मिली समस्याएँ",
    noExceptions: "अभी कोई अपवाद नहीं",
    exceptionDescription:
      "उपस्थिति, फीस, टाइमटेबल और डेटा संबंधी समस्याएँ यहाँ दिखाई देंगी।",

    schedule: "आज का शेड्यूल",
    scheduleSubtitle: "आज की अकादमिक गतिविधि",
    noSchedule: "टाइमटेबल डेटा कनेक्ट नहीं है",
    scheduleDescription:
      "कक्षाएँ, पीरियड, सब्स्टीट्यूशन और बदलाव यहाँ दिखाई देंगे।",

    automation: "ऑटोमेशन",
    automationSubtitle: "स्कूल वर्कफ़्लो",
    automationReady: "ऑटोमेशन इंजन तैयार",
    automationDescription:
      "WHEN → CONDITION → ACTION वर्कफ़्लो यहाँ से चलेंगे।",

    upcoming: "आगामी",
    upcomingSubtitle: "अगली महत्वपूर्ण गतिविधियाँ",
    upcomingEmpty: "अभी कोई आगामी गतिविधि नहीं",

    quality: "डेटा क्वालिटी",
    qualitySubtitle: "स्कूल डेटा स्वास्थ्य",
    qualityReady: "लाइव जाँच के लिए तैयार",
    qualityDescription:
      "गुम, डुप्लिकेट और असंगत रिकॉर्ड यहाँ दिखाई देंगे।",

    workload: "वर्कलोड",
    workloadSubtitle: "स्टाफ वर्कलोड इंटेलिजेंस",
    workloadReady: "ऑप्टिमाइज़र तैयार",
    workloadDescription:
      "वर्कलोड बैलेंसिंग, सब्स्टीट्यूट और स्टाफ दबाव यहाँ दिखाई देगा।",

    saved: "मानव कार्य समय बचत",
    savedSubtitle: "EduSphere से बचाया गया समय",
    savedValue: "—",
    savedDescription:
      "ऑटोमेशन के आधार पर वास्तविक समय बचत यहाँ दिखाई जाएगी।",

    quickActions: "त्वरित कार्य",
    schoolProfile: "स्कूल प्रोफ़ाइल",
    academicSessions: "शैक्षणिक सत्र",
    assistant: "स्मार्ट असिस्टेंट",
    command: "कमांड सर्च",

    system: "सिस्टम स्वास्थ्य",
    healthy: "स्वस्थ",
    authentication: "प्रमाणीकरण",
    api: "एप्लिकेशन API",
    database: "डेटाबेस",
    connected: "कनेक्टेड",

    ready: "तैयार",
    live: "लाइव",
    setup: "सेटअप",
  },
};

function Icon({ name, size = 19 }) {
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
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    teacher: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h5M7 12h10M7 16h6" />
        <circle cx="18" cy="8" r="1" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
    pulse: (
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </>
    ),
    automation: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.6v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.6h-.2a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    quality: (
      <>
        <path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" />
        <path d="m8.5 12 2.2 2.2L16 9" />
      </>
    ),
    workload: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 15v-3M12 15V9M17 15v-5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    assistant: (
      <>
        <path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    server: (
      <>
        <rect x="3" y="4" width="18" height="6" rx="2" />
        <rect x="3" y="14" width="18" height="6" rx="2" />
        <path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
}

function StatCard({
  icon,
  label,
  value,
  description,
  variant,
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-${variant}`}>
        <Icon name={icon} size={19} />
      </div>

      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        <span className="stat-description">{description}</span>
      </div>
    </article>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={18} />
      </div>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [language, setLanguage] = useState(
    localStorage.getItem("edusphere_language") || "EN",
  );

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleLanguageChange = (event) => {
      setLanguage(event.detail);
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

  const firstName =
    user?.full_name?.trim()?.split(" ")[0] || "Admin";

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
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      ),
    [currentTime, language],
  );

  return (
    <AppShell>
      <div className="dashboard-page">

        {/* COMMAND SEARCH */}
        <section className="command-search">
          <div className="command-search-icon">
            <Icon name="search" size={18} />
          </div>

          <div className="command-search-content">
            <span>{t.command}</span>
            <strong>{t.search}</strong>
          </div>

          <kbd>⌘ K</kbd>
        </section>

        {/* HERO */}
        <section className="dashboard-hero">
          <div className="hero-content">
            <span className="hero-kicker">
              <span className="hero-live-dot" />
              EDUSPHERE SCHOOL OS
            </span>

            <h1>
              {t.evening}, {firstName}
            </h1>

            <p>{t.overview}</p>

            <div className="hero-meta">
              <span>
                <Icon name="calendar" size={14} />
                {t.session}: <strong>2026–27</strong>
              </span>

              <span>
                <span className="hero-small-dot" />
                {t.operational}
              </span>
            </div>
          </div>

          <div className="hero-date">
            <span>{t.today}</span>
            <strong>{timeText}</strong>
            <small>{dateText}</small>
          </div>
        </section>

        {/* KPI */}
        <section className="stats-grid">
          <StatCard
            icon="users"
            label={t.students}
            value="—"
            description={t.enrolled}
            variant="blue"
          />

          <StatCard
            icon="teacher"
            label={t.teachers}
            value="—"
            description={t.teaching}
            variant="navy"
          />

          <StatCard
            icon="check"
            label={t.attendance}
            value="—"
            description={t.todayAttendance}
            variant="green"
          />

          <StatCard
            icon="alert"
            label={t.actions}
            value="—"
            description={t.attention}
            variant="amber"
          />
        </section>

        {/* PULSE + ACTION CENTER */}
        <div className="dashboard-main-grid">

          <section className="content-card pulse-card">
            <div className="section-heading">
              <div className="section-title-group">
                <span className="section-icon">
                  <Icon name="pulse" size={18} />
                </span>

                <div>
                  <h2>{t.pulse}</h2>
                  <p>{t.liveOverview}</p>
                </div>
              </div>

              <span className="live-badge">
                <span className="status-dot" />
                {t.live}
              </span>
            </div>

            <div className="pulse-panel">
              <div className="pulse-summary">
                <span>{t.operational}</span>
                <strong>—</strong>
                <small>{t.noLiveData}</small>
              </div>

              <div className="pulse-visual">
                {Array.from({ length: 12 }).map(
                  (_, index) => (
                    <span
                      key={index}
                      style={{
                        height: `${30 + ((index * 17) % 60)}%`,
                      }}
                    />
                  ),
                )}
              </div>
            </div>
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div className="section-title-group">
                <span className="section-icon">
                  <Icon name="alert" size={18} />
                </span>

                <div>
                  <h2>{t.actionCenter}</h2>
                  <p>{t.actionSubtitle}</p>
                </div>
              </div>
            </div>

            <EmptyState
              icon="action"
              title={t.noActions}
              description={t.actionDescription}
            />
          </section>
        </div>

        {/* EXCEPTIONS + SCHEDULE + AUTOMATION */}
        <section className="three-column-grid">

          <article className="content-card">
            <div className="section-heading">
              <div className="section-title-group">
                <span className="section-icon">
                  <Icon name="alert" size={18} />
                </span>

                <div>
                  <h2>{t.exceptions}</h2>
                  <p>{t.exceptionSubtitle}</p>
                </div>
              </div>
            </div>

            <EmptyState
              icon="alert"
              title={t.noExceptions}
              description={t.exceptionDescription}
            />
          </article>

          <article className="content-card">
            <div className="section-heading">
              <div className="section-title-group">
                <span className="section-icon">
                  <Icon name="calendar" size={18} />
                </span>

                <div>
                  <h2>{t.schedule}</h2>
                  <p>{t.scheduleSubtitle}</p>
                </div>
              </div>
            </div>

            <EmptyState
              icon="calendar"
              title={t.noSchedule}
              description={t.scheduleDescription}
            />
          </article>

          <article className="content-card">
            <div className="section-heading">
              <div className="section-title-group">
                <span className="section-icon">
                  <Icon name="automation" size={18} />
                </span>

                <div>
                  <h2>{t.automation}</h2>
                  <p>{t.automationSubtitle}</p>
                </div>
              </div>

              <span className="ready-badge">{t.ready}</span>
            </div>

            <div className="feature-status">
              <strong>{t.automationReady}</strong>
              <p>{t.automationDescription}</p>
            </div>
          </article>
        </section>

        {/* INTELLIGENCE ROW */}
        <section className="intelligence-grid">

          <article className="intelligence-card">
            <div className="intelligence-icon">
              <Icon name="calendar" size={18} />
            </div>

            <div>
              <span>{t.upcoming}</span>
              <strong>—</strong>
              <small>{t.upcomingEmpty}</small>
            </div>
          </article>

          <article className="intelligence-card">
            <div className="intelligence-icon">
              <Icon name="quality" size={18} />
            </div>

            <div>
              <span>{t.quality}</span>
              <strong>{t.qualityReady}</strong>
              <small>{t.qualityDescription}</small>
            </div>
          </article>

          <article className="intelligence-card">
            <div className="intelligence-icon">
              <Icon name="workload" size={18} />
            </div>

            <div>
              <span>{t.workload}</span>
              <strong>{t.workloadReady}</strong>
              <small>{t.workloadDescription}</small>
            </div>
          </article>

          <article className="intelligence-card saved-card">
            <div className="intelligence-icon">
              <Icon name="clock" size={18} />
            </div>

            <div>
              <span>{t.saved}</span>
              <strong>{t.savedValue}</strong>
              <small>{t.savedDescription}</small>
            </div>
          </article>
        </section>

        {/* QUICK ACTIONS */}
        <section className="content-card quick-card">
          <div className="section-heading">
            <div>
              <h2>{t.quickActions}</h2>
            </div>
          </div>

          <div className="quick-actions">

            <Link
              to="/school-profile"
              className="quick-action"
            >
              <span className="quick-action-icon">
                <Icon name="school" size={20} />
              </span>

              <span className="quick-action-content">
                <strong>{t.schoolProfile}</strong>
                <small>{t.setup}</small>
              </span>

              <span className="quick-action-arrow">
                <Icon name="arrow" size={16} />
              </span>
            </Link>

            <Link
              to="/school-profile"
              className="quick-action"
            >
              <span className="quick-action-icon">
                <Icon name="calendar" size={20} />
              </span>

              <span className="quick-action-content">
                <strong>{t.academicSessions}</strong>
                <small>{t.setup}</small>
              </span>

              <span className="quick-action-arrow">
                <Icon name="arrow" size={16} />
              </span>
            </Link>

            <button className="quick-action" type="button">
              <span className="quick-action-icon">
                <Icon name="assistant" size={20} />
              </span>

              <span className="quick-action-content">
                <strong>{t.assistant}</strong>
                <small>{t.ready}</small>
              </span>

              <span className="quick-action-arrow">
                <Icon name="arrow" size={16} />
              </span>
            </button>

            <button className="quick-action" type="button">
              <span className="quick-action-icon">
                <Icon name="search" size={20} />
              </span>

              <span className="quick-action-content">
                <strong>{t.command}</strong>
                <small>{t.ready}</small>
              </span>

              <span className="quick-action-arrow">
                <Icon name="arrow" size={16} />
              </span>
            </button>

          </div>
        </section>

        {/* SYSTEM */}
        <section className="content-card system-card">
          <div className="section-heading">
            <div className="section-title-group">
              <span className="section-icon">
                <Icon name="server" size={18} />
              </span>

              <div>
                <h2>{t.system}</h2>
                <p>{t.healthy}</p>
              </div>
            </div>

            <span className="healthy-badge">
              <span className="status-dot" />
              {t.healthy}
            </span>
          </div>

          <div className="system-grid">
            <SystemItem
              icon="users"
              label={t.authentication}
              value={t.connected}
            />

            <SystemItem
              icon="pulse"
              label={t.api}
              value={t.connected}
            />

            <SystemItem
              icon="server"
              label={t.database}
              value={t.connected}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SystemItem({ icon, label, value }) {
  return (
    <div className="system-item">
      <span className="system-item-icon">
        <Icon name={icon} size={16} />
      </span>

      <span className="system-item-label">{label}</span>

      <span className="system-connected">
        <span className="status-dot" />
        {value}
      </span>
    </div>
  );
}