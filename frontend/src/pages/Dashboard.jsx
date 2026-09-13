import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AppShell from "../components/AppShell";
import { useAuth } from "../auth/AuthContext";

const TEXT = {
  EN: {
    command: "COMMAND SEARCH", search: "Search students, fees, attendance, reports or type a command...",
    live: "LIVE", today: "TODAY", schoolOS: "EDUSPHERE SCHOOL OS", welcome: "Good evening",
    overview: "Your school's operational command center — people, processes, risks and decisions in one place.",
    session: "Academic Session", operations: "School operations", foundation: "Foundation active",
    students: "Students", teachers: "Teachers", attendance: "Attendance", actions: "Pending Actions",
    awaiting: "Connect module to show live value", pulse: "School Pulse", pulseSub: "Live operational overview",
    pulseText: "The live pulse will combine attendance, fees, timetable, admissions and staff signals as modules connect.",
    pulsePreview: "VISUAL PREVIEW", action: "Action Center", actionSub: "Priorities, approvals and exceptions",
    actionEmpty: "No live actions yet", actionDesc: "Approvals, follow-ups, exceptions and important tasks will surface here automatically.",
    exceptions: "Exceptions", exceptionSub: "Problems detected across operations", exceptionEmpty: "No exceptions available",
    exceptionDesc: "Attendance gaps, fee risks, timetable conflicts and data issues will appear here.",
    schedule: "Today's Schedule", scheduleSub: "Current academic activity", scheduleEmpty: "Timetable data not connected",
    scheduleDesc: "Current period, classes, substitutions and timetable changes will appear here.",
    automation: "Automation", automationSub: "School workflows", automationTitle: "Automation Engine ready",
    automationDesc: "WHEN → CONDITION → ACTION workflows will run from this control center.",
    upcoming: "Upcoming", upcomingSub: "Next important events", upcomingEmpty: "No upcoming events yet",
    quality: "Data Quality", qualitySub: "School data health", qualityTitle: "Ready for live checks",
    qualityDesc: "Missing, duplicate and inconsistent records will be surfaced here.",
    workload: "Workload", workloadSub: "Staff workload intelligence", workloadTitle: "Optimizer ready",
    workloadDesc: "Staff load, pressure, balancing and substitute requirements will be calculated here.",
    saved: "Human Work Saved", savedSub: "Time saved through EduSphere", savedTitle: "Measurement starts with automation",
    savedDesc: "Actual administrative time saved will be calculated from completed workflows.",
    quick: "Quick Actions", quickSub: "Jump into important work", school: "School Profile", schoolDesc: "Manage identity and settings",
    sessions: "Academic Sessions", sessionsDesc: "Manage current and future sessions", assistant: "Smart Assistant",
    assistantDesc: "Ask EduSphere to find, explain or act", command: "Command Search", commandDesc: "Jump directly to work",
    health: "System Health", healthy: "Healthy", auth: "Authentication", api: "Application API", db: "Database", connected: "Connected",
    ready: "READY", open: "Open", noResults: "No matching command", noResultsDesc: "Try student, fees, attendance, reports or school profile.",
    preview: "Preview visualization — live data will replace this baseline when modules connect.",
    trend: "Operational Trend", trendSub: "Illustrative chart structure", activity: "Operational Activity", activitySub: "Live module activity",
    risk: "Risk Mix", riskSub: "Exception categories", strong: "System foundation is healthy",
  },
  HI: {
    command: "कमांड सर्च", search: "विद्यार्थी, फीस, उपस्थिति, रिपोर्ट खोजें या कमांड लिखें...", live: "लाइव", today: "आज",
    schoolOS: "एडुस्फीयर स्कूल ओएस", welcome: "शुभ संध्या", overview: "स्कूल के लोग, प्रक्रियाएँ, जोखिम और निर्णय — एक ही ऑपरेशनल कमांड सेंटर में।",
    session: "शैक्षणिक सत्र", operations: "स्कूल संचालन", foundation: "फाउंडेशन सक्रिय", students: "विद्यार्थी", teachers: "शिक्षक",
    attendance: "उपस्थिति", actions: "लंबित कार्य", awaiting: "लाइव वैल्यू के लिए मॉड्यूल कनेक्ट करें", pulse: "स्कूल पल्स", pulseSub: "लाइव ऑपरेशनल ओवरव्यू",
    pulseText: "मॉड्यूल कनेक्ट होने पर उपस्थिति, फीस, टाइमटेबल, एडमिशन और स्टाफ संकेत एक साथ दिखाई देंगे।", pulsePreview: "विजुअल प्रीव्यू",
    action: "एक्शन सेंटर", actionSub: "प्राथमिकताएँ, अप्रूवल और अपवाद", actionEmpty: "अभी कोई लाइव कार्य नहीं", actionDesc: "अप्रूवल, फॉलो-अप, अपवाद और महत्वपूर्ण कार्य यहाँ स्वतः आएँगे।",
    exceptions: "अपवाद", exceptionSub: "संचालन में मिली समस्याएँ", exceptionEmpty: "अभी कोई अपवाद नहीं", exceptionDesc: "उपस्थिति, फीस, टाइमटेबल और डेटा समस्याएँ यहाँ दिखाई देंगी।",
    schedule: "आज का शेड्यूल", scheduleSub: "आज की अकादमिक गतिविधि", scheduleEmpty: "टाइमटेबल डेटा कनेक्ट नहीं है", scheduleDesc: "वर्तमान पीरियड, कक्षाएँ, सब्स्टीट्यूशन और बदलाव यहाँ आएँगे।",
    automation: "ऑटोमेशन", automationSub: "स्कूल वर्कफ़्लो", automationTitle: "ऑटोमेशन इंजन तैयार", automationDesc: "WHEN → CONDITION → ACTION वर्कफ़्लो यहाँ से चलेंगे।",
    upcoming: "आगामी", upcomingSub: "अगली महत्वपूर्ण गतिविधियाँ", upcomingEmpty: "अभी कोई आगामी गतिविधि नहीं",
    quality: "डेटा क्वालिटी", qualitySub: "स्कूल डेटा स्वास्थ्य", qualityTitle: "लाइव जाँच के लिए तैयार", qualityDesc: "गुम, डुप्लिकेट और असंगत रिकॉर्ड यहाँ पकड़े जाएँगे।",
    workload: "वर्कलोड", workloadSub: "स्टाफ वर्कलोड इंटेलिजेंस", workloadTitle: "ऑप्टिमाइज़र तैयार", workloadDesc: "स्टाफ लोड, दबाव, बैलेंसिंग और सब्स्टीट्यूट आवश्यकता यहाँ निकलेगी।",
    saved: "मानव कार्य समय बचत", savedSub: "EduSphere से बचाया गया समय", savedTitle: "ऑटोमेशन से माप शुरू होगा", savedDesc: "पूर्ण हुए वर्कफ़्लो से वास्तविक प्रशासनिक समय बचत निकाली जाएगी।",
    quick: "क्विक एक्शन", quickSub: "महत्वपूर्ण काम पर जाएँ", school: "स्कूल प्रोफ़ाइल", schoolDesc: "पहचान और सेटिंग्स प्रबंधित करें",
    sessions: "शैक्षणिक सत्र", sessionsDesc: "वर्तमान और भविष्य के सत्र प्रबंधित करें", assistant: "स्मार्ट असिस्टेंट", assistantDesc: "खोजें, समझें या काम करवाएँ",
    command: "कमांड सर्च", commandDesc: "सीधे काम पर जाएँ", health: "सिस्टम स्वास्थ्य", healthy: "स्वस्थ", auth: "प्रमाणीकरण", api: "एप्लिकेशन API", db: "डेटाबेस", connected: "कनेक्टेड",
    ready: "तैयार", open: "खोलें", noResults: "कोई मिलती कमांड नहीं", noResultsDesc: "विद्यार्थी, फीस, उपस्थिति, रिपोर्ट या स्कूल प्रोफ़ाइल आज़माएँ।",
    preview: "विजुअल प्रीव्यू — मॉड्यूल कनेक्ट होने पर लाइव डेटा इस बेसलाइन को बदल देगा।", trend: "ऑपरेशनल ट्रेंड", trendSub: "चार्ट संरचना",
    activity: "ऑपरेशनल एक्टिविटी", activitySub: "लाइव मॉड्यूल गतिविधि", risk: "रिस्क मिक्स", riskSub: "अपवाद श्रेणियाँ", strong: "सिस्टम फाउंडेशन स्वस्थ है",
  },
};

function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const icons = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>, users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>, teacher: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h5M7 12h10M7 16h6" /><circle cx="18" cy="8" r="1" /></>, check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>, alert: <><path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" /><path d="M12 8v4M12 16h.01" /></>, pulse: <path d="M3 12h4l2-7 4 14 2-7h6" />, calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>, spark: <path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />, database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>, arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>, school: <><path d="m3 10 9-6 9 6" /><path d="M5 10v9h14v-9M9 19v-5h6v5M3 21h18" /></>, clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, shield: <><path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" /><path d="m8.5 12 2.2 2.2L16 9" /></>, chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>, bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>, filter: <><path d="M4 5h16M7 12h10M10 19h4" /></>, brain: <><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3h1V4H9ZM15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3h-1V4h1Z" /><path d="M6 11h4M14 11h4M9 16h2M13 16h2" /></>, trend: <><path d="M4 17 10 11l4 4 6-8" /><path d="M16 7h4v4" /></>, dot: <circle cx="12" cy="12" r="2" />,
  };
  return <svg {...p}>{icons[name]}</svg>;
}

function Heading({ icon, title, subtitle, badge }) {
  return <div className="dash-heading"><div className="dash-heading-left"><span className="dash-icon"><Icon name={icon} size={20} /></span><div><h2>{title}</h2><p>{subtitle}</p></div></div>{badge && <span className="dash-badge"><i />{badge}</span>}</div>;
}

function Stat({ icon, label, value, note, tone }) {
  return <article className={`dash-stat tone-${tone}`}><div className="dash-stat-icon"><Icon name={icon} size={22} /></div><div className="dash-stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div><div className="dash-stat-orb" /></article>;
}

function Empty({ icon, title, text }) {
  return <div className="dash-empty"><span><Icon name={icon} size={22} /></span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function LineChart() {
  const points = [86, 72, 77, 52, 60, 45, 51, 34, 43, 27, 35, 20];
  const coords = points.map((y, i) => `${i * 9.09},${y}`).join(" ");
  return <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Operational trend preview"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopOpacity=".24" /><stop offset="1" stopOpacity="0" /></linearGradient></defs><path d={`M0,100 L0,${points[0]} L${coords.replace(/ /g, " L")} L100,100 Z`} fill="url(#area)" /><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>;
}

function Bars() {
  const values = [36, 55, 44, 70, 62, 82, 58, 76, 68, 88, 72, 91];
  return <div className="bar-chart">{values.map((v, i) => <div className="bar-wrap" key={i}><span style={{ height: `${v}%` }} /></div>)}</div>;
}

function Donut() {
  return <div className="donut-wrap"><div className="donut"><div><strong>—</strong><span>LIVE</span></div></div><div className="donut-legend"><span><i className="legend-blue" />Attendance</span><span><i className="legend-purple" />Fees</span><span><i className="legend-amber" />Timetable</span></div></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [language, setLanguage] = useState(() => localStorage.getItem("edusphere_language") || "EN");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const onLanguage = (event) => setLanguage(event.detail === "HI" ? "HI" : "EN");
    window.addEventListener("edusphere-language-change", onLanguage);
    return () => { clearInterval(timer); window.removeEventListener("edusphere-language-change", onLanguage); };
  }, []);

  const t = TEXT[language];
  const firstName = user?.full_name?.trim()?.split(" ")[0] || "Admin";
  const timeText = useMemo(() => currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }), [currentTime]);
  const dateText = useMemo(() => currentTime.toLocaleDateString(language === "HI" ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), [currentTime, language]);
  const normalizedQuery = query.trim().toLowerCase();
  const commandItems = [
    { name: t.school, desc: t.schoolDesc, path: "/school-profile", icon: "school", keywords: "school profile" },
    { name: t.sessions, desc: t.sessionsDesc, path: "/school-profile", icon: "calendar", keywords: "academic session sessions" },
    { name: t.assistant, desc: t.assistantDesc, path: "#", icon: "brain", keywords: "assistant smart" },
  ];
  const filtered = normalizedQuery ? commandItems.filter((x) => `${x.name} ${x.desc} ${x.keywords}`.toLowerCase().includes(normalizedQuery)) : commandItems;

  return <AppShell>
    <div className="dash-page">
      <section className="dash-commandbar">
        <div className="dash-command-icon"><Icon name="search" size={22} /></div>
        <div className="dash-command-copy"><span>{t.command}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} /></div>
        <div className="dash-command-hint"><span>⌘</span><span>K</span></div>
      </section>

      {query && <section className="dash-command-results">{filtered.length ? filtered.map((item) => item.path === "#" ? <button type="button" key={item.name} className="dash-result"><span><Icon name={item.icon} size={19} /></span><div><strong>{item.name}</strong><small>{item.desc}</small></div><Icon name="arrow" size={17} /></button> : <Link key={item.name} to={item.path} className="dash-result"><span><Icon name={item.icon} size={19} /></span><div><strong>{item.name}</strong><small>{item.desc}</small></div><Icon name="arrow" size={17} /></Link>) : <div className="dash-no-results"><strong>{t.noResults}</strong><span>{t.noResultsDesc}</span></div>}</section>}

      <section className="dash-hero">
        <div className="hero-grid-lines" /><div className="hero-glow hero-glow-a" /><div className="hero-glow hero-glow-b" />
        <div className="hero-content"><span className="hero-kicker"><i />{t.schoolOS}<b>{t.live}</b></span><h1>{t.welcome}, <em>{firstName}</em></h1><p>{t.overview}</p><div className="hero-meta"><span><Icon name="calendar" size={15} />{t.session}<b>2026–27</b></span><span><i />{t.operations}</span><span><i />{t.foundation}</span></div></div>
        <div className="hero-clock"><div className="hero-clock-ring"><span>{t.today}</span><strong>{timeText}</strong><small>{dateText}</small></div></div>
      </section>

      <section className="dash-stats">
        <Stat icon="users" label={t.students} value="—" note={t.awaiting} tone="blue" />
        <Stat icon="teacher" label={t.teachers} value="—" note={t.awaiting} tone="purple" />
        <Stat icon="check" label={t.attendance} value="—" note={t.awaiting} tone="green" />
        <Stat icon="alert" label={t.actions} value="—" note={t.awaiting} tone="amber" />
      </section>

      <section className="dash-grid-two">
        <article className="dash-panel dash-pulse"><Heading icon="pulse" title={t.pulse} subtitle={t.pulseSub} badge={t.live} /><div className="pulse-main"><div className="pulse-summary"><span>{t.operations}</span><strong>—</strong><p>{t.pulseText}</p><small>{t.pulsePreview}</small></div><div className="pulse-chart"><div className="chart-labels"><span>HIGH</span><span>LOW</span></div><LineChart /><div className="chart-x"><span>START</span><span>NOW</span></div></div></div></article>
        <article className="dash-panel"><Heading icon="bell" title={t.action} subtitle={t.actionSub} /><Empty icon="check" title={t.actionEmpty} text={t.actionDesc} /></article>
      </section>

      <section className="dash-grid-three">
        <article className="dash-panel"><Heading icon="alert" title={t.exceptions} subtitle={t.exceptionSub} /><Empty icon="shield" title={t.exceptionEmpty} text={t.exceptionDesc} /></article>
        <article className="dash-panel"><Heading icon="calendar" title={t.schedule} subtitle={t.scheduleSub} /><Empty icon="clock" title={t.scheduleEmpty} text={t.scheduleDesc} /></article>
        <article className="dash-panel"><Heading icon="spark" title={t.automation} subtitle={t.automationSub} badge={t.ready} /><div className="automation-card"><div className="automation-flow"><span>WHEN</span><b>→</b><span>CONDITION</span><b>→</b><span>ACTION</span></div><strong>{t.automationTitle}</strong><p>{t.automationDesc}</p><div className="automation-track"><i /><i /><i /></div></div></article>
      </section>

      <section className="dash-intelligence-grid">
        <article className="dash-panel intelligence-large"><Heading icon="chart" title={t.trend} subtitle={t.trendSub} /><div className="large-chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-field"><div className="grid-lines" /><LineChart /><div className="chart-x"><span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>NOW</span></div></div></div><p className="chart-note">{t.preview}</p></article>
        <article className="dash-panel"><Heading icon="pulse" title={t.activity} subtitle={t.activitySub} badge={t.live} /><Bars /><div className="activity-foot"><span><i />Module signals</span><strong>—</strong></div></article>
        <article className="dash-panel"><Heading icon="alert" title={t.risk} subtitle={t.riskSub} /><Donut /><p className="chart-note">{t.preview}</p></article>
      </section>

      <section className="dash-grid-three">
        <article className="dash-panel"><Heading icon="calendar" title={t.upcoming} subtitle={t.upcomingSub} /><Empty icon="calendar" title={t.upcomingEmpty} text="Events, exams, fee dates, meetings and approvals will appear here." /></article>
        <article className="dash-panel"><Heading icon="database" title={t.quality} subtitle={t.qualitySub} badge={t.ready} /><div className="readiness"><span className="readiness-score">—</span><div><strong>{t.qualityTitle}</strong><p>{t.qualityDesc}</p></div></div></article>
        <article className="dash-panel"><Heading icon="trend" title={t.workload} subtitle={t.workloadSub} badge={t.ready} /><div className="readiness"><span className="readiness-score">—</span><div><strong>{t.workloadTitle}</strong><p>{t.workloadDesc}</p></div></div></article>
      </section>

      <section className="dash-saved"><div className="saved-visual"><Icon name="clock" size={24} /><span>TIME</span></div><div><span>{t.saved}</span><strong>—</strong><small>{t.savedTitle} · {t.savedDesc}</small></div><div className="saved-chip"><i />{t.live}</div></section>

      <section className="dash-panel dash-quick"><Heading icon="spark" title={t.quick} subtitle={t.quickSub} /><div className="quick-grid"><Link to="/school-profile" className="quick-item"><span><Icon name="school" size={22} /></span><div><strong>{t.school}</strong><small>{t.schoolDesc}</small></div><Icon name="arrow" size={17} /></Link><Link to="/school-profile" className="quick-item"><span><Icon name="calendar" size={22} /></span><div><strong>{t.sessions}</strong><small>{t.sessionsDesc}</small></div><Icon name="arrow" size={17} /></Link><button type="button" className="quick-item"><span><Icon name="brain" size={22} /></span><div><strong>{t.assistant}</strong><small>{t.assistantDesc}</small></div><Icon name="arrow" size={17} /></button><button type="button" className="quick-item" onClick={() => document.querySelector(".dash-commandbar input")?.focus()}><span><Icon name="search" size={22} /></span><div><strong>{t.command}</strong><small>{t.commandDesc}</small></div><Icon name="arrow" size={17} /></button></div></section>

      <section className="dash-panel dash-health"><Heading icon="database" title={t.health} subtitle={t.healthy} badge={t.healthy} /><div className="health-grid"><div><span><Icon name="users" size={18} /></span><div><strong>{t.auth}</strong><small>{t.connected}</small></div><i /></div><div><span><Icon name="pulse" size={18} /></span><div><strong>{t.api}</strong><small>{t.connected}</small></div><i /></div><div><span><Icon name="database" size={18} /></span><div><strong>{t.db}</strong><small>{t.connected}</small></div><i /></div></div><div className="health-message"><span><Icon name="shield" size={17} /></span><strong>{t.strong}</strong><small>Core foundation services are available.</small></div></section>
    </div>
  </AppShell>;
}
