import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getStudents } from "../api/students";
import { getSchools, getAcademicSessions, getCurrentAcademicSession } from "../api/school";
import { listStudentFeePlans } from "../api/studentFeePlans";
import { listFeePayments } from "../api/feePayments";

const TEXT = {
  EN: {
    commandSearch: "COMMAND SEARCH", search: "Search students, fees, attendance, reports or type a command...",
    live: "PREVIEW", today: "TODAY", schoolOS: "EDUSPHERE SCHOOL OS", welcome: "Good evening",
    overview: "Your school's operational command center — people, processes, risks and decisions in one place.",
    session: "Academic Session", operations: "School operations", foundation: "Foundation active",
    students: "Students", teachers: "Fee Collection", attendance: "Fee Plans", actions: "Outstanding Fees",
    awaiting: "Waiting for verified data connection", loading: "Loading live data…", dataUnavailable: "Could not load live data", noSchool: "School/session not linked to this account", collected: "Collected from posted payments", planned: "Active fee plans", outstanding: "Plan total minus posted payments", pulse: "School Pulse", pulseSub: "Operational overview",
    pulseText: "Sample visualization only. Attendance, fees, timetable, admissions and staff data are not connected here yet.",
    pulsePreview: "OVERVIEW", action: "Action Center", actionSub: "Priorities and follow-ups",
    actionEmpty: "No pending actions", actionDesc: "Approvals, follow-ups and important tasks will appear here when available.",
    exceptions: "Exceptions", exceptionSub: "Issues across school operations", exceptionEmpty: "No exceptions available",
    exceptionDesc: "Attendance gaps, fee risks, timetable conflicts and data issues will appear here.",
    schedule: "Today's Schedule", scheduleSub: "Academic activity", scheduleEmpty: "Timetable not connected",
    scheduleDesc: "Classes, periods, substitutions and timetable changes will appear here.",
    automation: "Automation", automationSub: "School workflows", automationTitle: "Automation is ready",
    automationDesc: "School workflows can be managed here when automation modules are connected.",
    upcoming: "Upcoming", upcomingSub: "Important events", upcomingEmpty: "No upcoming events",
    quality: "Data Quality", qualitySub: "School data health", qualityTitle: "Ready for live checks",
    qualityDesc: "Missing, duplicate and inconsistent records will be shown here.",
    workload: "Workload", workloadSub: "Staff workload", workloadTitle: "Workload overview ready",
    workloadDesc: "Staff workload and substitute requirements will be shown here when available.",
    saved: "Administrative Time Saved", savedSub: "Time saved through EduSphere", savedTitle: "Tracking starts with automation",
    savedDesc: "Time saved will be calculated from completed workflows.",
    quick: "Quick Actions", quickSub: "Shortcuts to important areas", school: "School Profile", schoolDesc: "Manage school details and settings",
    sessions: "Academic Sessions", sessionsDesc: "Manage academic sessions", assistant: "Smart Assistant",
    assistantDesc: "Ask EduSphere to find or explain something", command: "Command Search", commandDesc: "Find an area quickly",
    health: "System Health", healthy: "Not verified", auth: "Authentication", api: "Application API", db: "Database", connected: "Status not verified",
    ready: "READY", open: "Open", noResults: "No matching command", noResultsDesc: "Try school profile, sessions or assistant.",
    preview: "Illustrative preview. Live data will appear when connected.",
    trend: "Operational Trend", trendSub: "Illustrative trend preview", activity: "Operational Activity", activitySub: "Activity preview",
    risk: "Risk Overview", riskSub: "Exception categories", strong: "System status needs live verification"
  },
  HI: {
    commandSearch: "कमांड खोज", search: "विद्यार्थी, फीस, उपस्थिति या रिपोर्ट खोजें...",
    live: "लाइव", today: "आज", schoolOS: "एडूस्फीयर स्कूल ओएस", welcome: "शुभ संध्या",
    overview: "स्कूल के काम, प्रक्रियाओं और महत्वपूर्ण जानकारियों का एक ही स्थान पर अवलोकन।",
    session: "शैक्षणिक सत्र", operations: "स्कूल संचालन", foundation: "आधारभूत सेवाएँ सक्रिय",
    students: "विद्यार्थी", teachers: "फीस जमा", attendance: "कुल फीस योजना", actions: "बाकी फीस",
    awaiting: "डेटा कनेक्शन की प्रतीक्षा है", loading: "लाइव डेटा लोड हो रहा है…", dataUnavailable: "लाइव डेटा लोड नहीं हुआ", noSchool: "इस खाते से स्कूल/सत्र जुड़ा नहीं है", collected: "सफलतापूर्वक दर्ज फीस भुगतान", planned: "सक्रिय फीस योजनाएँ", outstanding: "कुल योजना में से जमा फीस घटाकर", pulse: "स्कूल की स्थिति", pulseSub: "संचालन का अवलोकन",
    pulseText: "यह केवल उदाहरण है। उपस्थिति, फीस, समय-सारणी, प्रवेश और स्टाफ का लाइव डेटा अभी यहाँ जुड़ा नहीं है।",
    pulsePreview: "अवलोकन", action: "कार्य केंद्र", actionSub: "प्राथमिकताएँ और फॉलो-अप",
    actionEmpty: "कोई लंबित कार्य नहीं", actionDesc: "उपलब्ध होने पर महत्वपूर्ण कार्य यहाँ दिखाई देंगे।",
    exceptions: "अपवाद", exceptionSub: "स्कूल संचालन की समस्याएँ", exceptionEmpty: "अभी कोई अपवाद नहीं",
    exceptionDesc: "उपस्थिति, फीस, समय-सारणी और डेटा की समस्याएँ यहाँ दिखेंगी।",
    schedule: "आज की समय-सारणी", scheduleSub: "शैक्षणिक गतिविधियाँ", scheduleEmpty: "समय-सारणी का डेटा जुड़ा नहीं है",
    scheduleDesc: "कक्षाएँ, पीरियड और बदलाव यहाँ दिखेंगे।",
    automation: "स्वचालन", automationSub: "स्कूल के कार्य-प्रवाह", automationTitle: "स्वचालन तैयार है",
    automationDesc: "मॉड्यूल जुड़ने पर स्कूल के कार्य-प्रवाह यहाँ प्रबंधित होंगे।",
    upcoming: "आगामी कार्यक्रम", upcomingSub: "महत्वपूर्ण कार्यक्रम", upcomingEmpty: "अभी कोई आगामी कार्यक्रम नहीं",
    quality: "डेटा गुणवत्ता", qualitySub: "स्कूल डेटा की स्थिति", qualityTitle: "लाइव जाँच के लिए तैयार",
    qualityDesc: "गुम, दोहराए गए और असंगत रिकॉर्ड यहाँ दिखेंगे।",
    workload: "कार्यभार", workloadSub: "स्टाफ का कार्यभार", workloadTitle: "कार्यभार अवलोकन तैयार",
    workloadDesc: "स्टाफ का कार्यभार और स्थानापन्न की आवश्यकता यहाँ दिखेगी।",
    saved: "बचा हुआ प्रशासनिक समय", savedSub: "EduSphere से बचा समय", savedTitle: "स्वचालन से गणना शुरू होगी",
    savedDesc: "पूरे हुए कार्य-प्रवाह के आधार पर समय की गणना होगी।",
    quick: "त्वरित कार्य", quickSub: "महत्वपूर्ण जगहों के शॉर्टकट", school: "स्कूल प्रोफ़ाइल", schoolDesc: "स्कूल की जानकारी और सेटिंग",
    sessions: "शैक्षणिक सत्र", sessionsDesc: "शैक्षणिक सत्र प्रबंधित करें", assistant: "स्मार्ट सहायक",
    assistantDesc: "EduSphere से जानकारी खोजें या समझें", command: "कमांड खोज", commandDesc: "किसी क्षेत्र तक जल्दी पहुँचें",
    health: "सिस्टम की स्थिति", healthy: "स्थिति सत्यापित नहीं", auth: "प्रमाणीकरण", api: "एप्लिकेशन API", db: "डेटाबेस", connected: "सत्यापित नहीं",
    ready: "तैयार", open: "खोलें", noResults: "कोई मेल खाती कमांड नहीं", noResultsDesc: "स्कूल प्रोफ़ाइल, सत्र या सहायक खोजें।",
    preview: "उदाहरण के लिए पूर्वावलोकन। मॉड्यूल जुड़ने पर लाइव डेटा दिखेगा।",
    trend: "संचालन का रुझान", trendSub: "रुझान का पूर्वावलोकन", activity: "संचालन गतिविधि", activitySub: "गतिविधि का पूर्वावलोकन",
    risk: "जोखिम अवलोकन", riskSub: "अपवादों की श्रेणियाँ", strong: "सिस्टम की लाइव स्थिति जाँचना बाकी है"
  }
};

function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const icons = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    teacher: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h5M7 12h10M7 16h6" /><circle cx="18" cy="8" r="1" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    alert: <><path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" /><path d="M12 8v4M12 16h.01" /></>,
    pulse: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>,
    spark: <path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    school: <><path d="m3 10 9-6 9 6" /><path d="M5 10v9h14v-9M9 19v-5h6v5M3 21h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" /><path d="m8.5 12 2.2 2.2L16 9" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    brain: <><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3h1V4H9ZM15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3h-1V4h1Z" /><path d="M6 11h4M14 11h4M9 16h2M13 16h2" /></>,
    trend: <><path d="M4 17 10 11l4 4 6-8" /><path d="M16 7h4v4" /></>
  };
  return <svg {...p}>{icons[name]}</svg>;
}

function Heading({ icon, title, subtitle, badge }) {
  return <div className="dash-heading"><div className="dash-heading-left"><span className="dash-icon"><Icon name={icon} size={19} /></span><div><h2>{title}</h2><p>{subtitle}</p></div></div>{badge && <span className="dash-badge"><i />{badge}</span>}</div>;
}
function Stat({ icon, label, value, note, tone }) {
  return <article className={`dash-stat tone-${tone}`}><div className="dash-stat-icon"><Icon name={icon} size={21} /></div><div className="dash-stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}
function Empty({ icon, title, text }) {
  return <div className="dash-empty"><span><Icon name={icon} size={21} /></span><div><strong>{title}</strong><p>{text}</p></div></div>;
}
function LineChart() {
  const points = [86, 72, 77, 52, 60, 45, 51, 34, 43, 27, 35, 20];
  const coords = points.map((y, i) => `${i * 9.09},${y}`).join(" ");
  return <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Operational trend preview"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".12" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><path d={`M0,100 L0,${points[0]} L${coords.replace(/ /g, " L")} L100,100 Z`} fill="url(#area)" /><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>;
}
function Bars() {
  const values = [36, 55, 44, 70, 62, 82, 58, 76, 68, 88, 72, 91];
  return <div className="bar-chart">{values.map((v, i) => <div className="bar-wrap" key={i}><span style={{ height: `${v}%` }} /></div>)}</div>;
}
function Donut() {
  return <div className="donut-wrap"><div className="donut"><div><strong>—</strong><span>PREVIEW</span></div></div><div className="donut-legend"><span><i className="legend-blue" />Attendance</span><span><i className="legend-purple" />Fees</span><span><i className="legend-amber" />Timetable</span></div></div>;
}

function unwrapPayload(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function toArray(response) {
  const value = unwrapPayload(response);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function idFrom(value, keys) {
  for (const key of keys) {
    const candidate = value?.[key];
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
    }
  }
  return null;
}

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

async function loadAllStudents(schoolId, sessionId) {
  const all = [];
  const pageSize = 100;
  for (let page = 1; page <= 100; page += 1) {
    const batch = await getStudents({ schoolId, academicSessionId: sessionId, isActive: true, page, pageSize });
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

async function loadAllFeePlans(schoolId, sessionId) {
  const all = [];
  const pageSize = 100;
  for (let page = 1; page <= 100; page += 1) {
    const response = await listStudentFeePlans({ school_id: schoolId, academic_session_id: sessionId, is_active: true, status: "active", page, page_size: pageSize });
    const batch = toArray(response);
    all.push(...batch);
    const meta = unwrapPayload(response)?.meta ?? response?.meta;
    const pages = Number(meta?.pages ?? meta?.total_pages ?? 0);
    if ((pages && page >= pages) || batch.length < pageSize) break;
  }
  return all;
}

async function loadAllPostedPayments(schoolId, sessionId) {
  const all = [];
  const limit = 500;
  for (let offset = 0; offset < 100000; offset += limit) {
    const response = await listFeePayments({ school_id: schoolId, academic_session_id: sessionId, status: "posted", limit, offset });
    const batch = toArray(response);
    all.push(...batch.filter((payment) => String(payment?.status || "posted").toLowerCase() === "posted"));
    if (batch.length < limit) break;
  }
  return all;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [language, setLanguage] = useState(() => localStorage.getItem("edusphere_language") || "EN");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [dashboardData, setDashboardData] = useState({ loading: true, error: "", schoolName: "", schoolId: null, sessionId: null, sessionName: "", studentCount: null, collected: null, planned: null, outstanding: null });
  const [studentMatches, setStudentMatches] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearchError, setStudentSearchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setDashboardData((current) => ({ ...current, loading: true, error: "" }));
      try {
        // The school ID may be absent from /auth/me for some admin accounts.
        // Use the configured default school only as a fallback; keep the API as the source of truth.
        const userSchoolId = idFrom(user, ["school_id", "schoolId"]) || idFrom(user?.school, ["id", "school_id"]);
        let school = null;
        let schoolId = userSchoolId || 1;

        if (schoolId) {
          try {
            const schoolsResponse = await getSchools();
            const schools = toArray(schoolsResponse);
            school = schools.find((item) => idFrom(item, ["id", "school_id"]) === schoolId) || null;
          } catch {
            // The authenticated user may not have permission to list schools.
          }
        } else {
          const schoolsResponse = await getSchools();
          const schools = toArray(schoolsResponse);
          const associated = schools.find((item) => idFrom(item, ["id", "school_id"]) === idFrom(user?.school, ["id", "school_id"]));
          school = associated || (schools.length === 1 ? schools[0] : null);
          schoolId = idFrom(school, ["id", "school_id"]) || 1;
        }

        if (!schoolId) {
          if (!cancelled) setDashboardData({ loading: false, error: t.noSchool, schoolName: "", schoolId: null, sessionId: null, sessionName: "", studentCount: null, collected: null, planned: null, outstanding: null });
          return;
        }

        let session = null;
        try {
          const sessionResponse = await getCurrentAcademicSession(schoolId);
          session = unwrapPayload(sessionResponse);
          // Some APIs wrap the result as { success, data }, while others return it directly.
          if (session && !Array.isArray(session) && session.data && !session.id && !session.academic_session_id) {
            session = session.data;
          }
        } catch {
          // Fall back to the school's session list below.
        }

        let sessionId = idFrom(session, ["id", "academic_session_id", "session_id"]);
        if (!sessionId) {
          try {
            const sessionsResponse = await getAcademicSessions(schoolId);
            const sessions = toArray(sessionsResponse);
            const currentSession = sessions.find((item) =>
              item?.is_current === true || item?.isCurrent === true || item?.current === true ||
              String(item?.status || "").toLowerCase() === "current"
            );
            const yearSession = sessions.find((item) => {
              const label = String(item?.name || item?.session_name || item?.academic_year || item?.label || "");
              return /2026\s*[-–/]\s*2027|2026\s*[-–/]\s*27/.test(label);
            });
            session = currentSession || yearSession || (sessions.length === 1 ? sessions[0] : null);
            sessionId = idFrom(session, ["id", "academic_session_id", "session_id"]);
          } catch {
            // The error below will explain that no usable session could be found.
          }
        }

        const sessionName = session?.name || session?.session_name || session?.academic_year || session?.label || "Current session";
        const schoolName = school?.name || school?.school_name || user?.school_name || user?.school?.name || "";

        if (!sessionId) {
          if (!cancelled) setDashboardData({ loading: false, error: t.noSchool, schoolName, schoolId, sessionId: null, sessionName: "", studentCount: null, collected: null, planned: null, outstanding: null });
          return;
        }

        const [students, plans, payments] = await Promise.all([
          loadAllStudents(schoolId, sessionId),
          loadAllFeePlans(schoolId, sessionId),
          loadAllPostedPayments(schoolId, sessionId),
        ]);
        const planned = plans.reduce((sum, plan) => sum + Math.max(0, Number(plan?.net_amount ?? plan?.total_amount ?? plan?.amount ?? 0) || 0), 0);
        const collected = payments.reduce((sum, payment) => sum + (String(payment?.status || "posted").toLowerCase() === "posted" ? Math.max(0, Number(payment?.amount || 0) || 0) : 0), 0);

        if (!cancelled) setDashboardData({ loading: false, error: "", schoolName, schoolId, sessionId, sessionName, studentCount: students.length, collected, planned, outstanding: Math.max(0, planned - collected) });
      } catch (error) {
        if (!cancelled) setDashboardData({ loading: false, error: error?.message || t.dataUnavailable, schoolName: "", schoolId: null, sessionId: null, sessionName: "", studentCount: null, collected: null, planned: null, outstanding: null });
      }
    }

    if (user) loadDashboard();
    else setDashboardData({ loading: false, error: t.noSchool, schoolName: "", schoolId: null, sessionId: null, sessionName: "", studentCount: null, collected: null, planned: null, outstanding: null });

    return () => { cancelled = true; };
  }, [user, refreshKey, language]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const onLanguage = (event) => setLanguage(event.detail === "HI" ? "HI" : "EN");
    const onShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector(".dash-commandbar input")?.focus();
      }
    };
    window.addEventListener("edusphere-language-change", onLanguage);
    window.addEventListener("keydown", onShortcut);
    return () => {
      clearInterval(timer);
      window.removeEventListener("edusphere-language-change", onLanguage);
      window.removeEventListener("keydown", onShortcut);
    };
  }, []);

  const t = TEXT[language] || TEXT.EN;
  const candidateName = user?.full_name?.trim() || user?.name?.trim() || user?.email?.split("@")[0] || "";
  const rawName = /^(edusphere|school admin|administrator|admin)$/i.test(candidateName) ? "Admin" : candidateName || "Admin";
  const firstName = /^(edusphere|school admin|administrator)$/i.test(rawName) ? "Admin" : rawName.split(" ")[0];
  const timeText = useMemo(() => currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }), [currentTime]);
  const dateText = useMemo(() => currentTime.toLocaleDateString(language === "HI" ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), [currentTime, language]);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    let cancelled = false;
    const term = query.trim();
    if (term.length < 2 || !dashboardData.schoolId || !dashboardData.sessionId) {
      setStudentMatches([]);
      setStudentSearchError("");
      setStudentSearchLoading(false);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setStudentSearchLoading(true);
      setStudentSearchError("");
      try {
        const matches = await getStudents({
          schoolId: dashboardData.schoolId,
          academicSessionId: dashboardData.sessionId,
          search: term,
          page: 1,
          pageSize: 8,
        });
        if (!cancelled) setStudentMatches(Array.isArray(matches) ? matches.slice(0, 8) : []);
      } catch (error) {
        if (!cancelled) {
          setStudentMatches([]);
          setStudentSearchError(error?.response?.data?.detail || error?.message || t.dataUnavailable);
        }
      } finally {
        if (!cancelled) setStudentSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, dashboardData.schoolId, dashboardData.sessionId, t.dataUnavailable]);

  const commandItems = [
    { name: t.students, desc: t.students, path: "/students", icon: "users", keywords: "student pupils admission" },
    { name: t.teachers, desc: t.teachers, path: "/fees", icon: "database", keywords: "fees payment collection outstanding" },
    { name: t.school, desc: t.schoolDesc, path: "/school-profile", icon: "school", keywords: "school profile settings" },
    { name: t.sessions, desc: t.sessionsDesc, path: "/school-profile", icon: "calendar", keywords: "academic session sessions" }
  ];
  const filtered = normalizedQuery ? commandItems.filter((x) => `${x.name} ${x.desc} ${x.keywords}`.toLowerCase().includes(normalizedQuery)) : commandItems;

  return (
    <>
      <style>{`\n/* EduSphere Dashboard — clean, practical, responsive UI.
   Scoped to dashboard classes so other pages remain unchanged. */
.dash-page {
  width: 100%;
  max-width: 1560px;
  min-width: 0;
  margin: 0 auto;
  padding: 0 0 28px;
  color: #1d2a3f;
  font-size: 14px;
  line-height: 1.5;
}
.dash-page *, .dash-page *::before, .dash-page *::after { box-sizing: border-box; }
.dash-page .dash-commandbar {
  display: flex; align-items: center; gap: 13px; min-width: 0; min-height: 64px;
  margin: 0 0 18px; padding: 10px 14px; border: 1px solid #dfe5ed; border-radius: 10px;
  background: #fff; box-shadow: 0 2px 8px rgba(20, 38, 66, .035);
}
.dash-page .dash-command-icon { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; border-radius: 8px; color: #2457a6; background: #edf3fb; }
.dash-page .dash-command-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.dash-page .dash-command-copy span { color: #69778a; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.dash-page .dash-command-copy input { width: 100%; min-width: 0; margin-top: 2px; padding: 2px 0; border: 0; outline: 0; background: transparent; color: #243247; font: inherit; font-size: 14px; font-weight: 500; box-shadow: none; }
.dash-page .dash-command-copy input::placeholder { color: #8b96a5; font-weight: 400; }
.dash-page .dash-command-hint { display: flex; gap: 4px; }
.dash-page .dash-command-hint span { display: grid; place-items: center; min-width: 25px; height: 24px; padding: 0 5px; border: 1px solid #e0e5ec; border-radius: 5px; color: #677589; background: #f8fafc; font-size: 10px; font-weight: 600; }
.dash-page .dash-command-results { display: grid; gap: 4px; margin: -8px 0 18px; padding: 7px; border: 1px solid #dfe5ed; border-radius: 10px; background: #fff; box-shadow: 0 4px 16px rgba(20, 38, 66, .06); }
.dash-page .dash-result { display: flex; align-items: center; gap: 11px; width: 100%; min-width: 0; padding: 10px; border: 0; border-radius: 7px; background: transparent; color: inherit; text-align: left; text-decoration: none; cursor: pointer; }
.dash-page .dash-result:hover { background: #f4f7fb; }
.dash-page .dash-result>span { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 34px; border-radius: 7px; color: #2457a6; background: #edf3fb; }
.dash-page .dash-result div { min-width: 0; flex: 1; }
.dash-page .dash-result strong, .dash-page .dash-result small { display: block; }
.dash-page .dash-result strong { color: #26354a; font-size: 13px; font-weight: 650; }
.dash-page .dash-result small { margin-top: 2px; color: #738095; font-size: 11px; }
.dash-page .dash-no-results { display: grid; gap: 3px; padding: 13px; color: #69778a; }
.dash-page .dash-no-results strong { color: #26354a; font-size: 13px; }
.dash-page .dash-no-results span { font-size: 12px; }

.dash-page .dash-hero {
  position: relative; display: flex; align-items: center; justify-content: space-between; gap: 28px;
  min-width: 0; min-height: 220px; margin-bottom: 18px; padding: 28px 30px; overflow: hidden;
  border: 1px solid #1e4c91; border-radius: 12px; color: #fff;
  background:
    radial-gradient(circle at 88% 18%, rgba(91, 151, 235, .34), transparent 34%),
    linear-gradient(120deg, #173b72 0%, #214f91 56%, #2865ad 100%);
}
.dash-page .dash-hero::after { content: ""; position: absolute; top: 0; right: 0; width: 32%; height: 100%; pointer-events: none; background: linear-gradient(90deg, transparent, rgba(255,255,255,.035)); }
.dash-page .hero-content { position: relative; z-index: 1; min-width: 0; flex: 1; }
.dash-page .hero-kicker { display: inline-flex; align-items: center; gap: 8px; color: #d4dfeb; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.dash-page .hero-kicker i, .dash-page .hero-meta>span>i, .dash-page .dash-badge i, .dash-page .saved-chip i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #54b68b; }
.dash-page .hero-kicker b { margin-left: 4px; padding: 3px 6px; border: 1px solid rgba(255,255,255,.18); border-radius: 4px; color: #e2eaf3; font-size: 9px; letter-spacing: .04em; }
.dash-page .dash-hero h1 { margin: 13px 0 8px; color: #fff; font-size: clamp(28px, 3vw, 40px); line-height: 1.15; letter-spacing: -.8px; font-weight: 700; }
.dash-page .dash-hero h1 em { color: #c7d9ef; font-style: normal; }
.dash-page .dash-hero p { max-width: 680px; margin: 0; color: #d0dbe7; font-size: 13px; line-height: 1.65; }
.dash-page .hero-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.dash-page .hero-meta>span { display: inline-flex; align-items: center; gap: 7px; min-height: 30px; padding: 0 9px; border: 1px solid rgba(255,255,255,.17); border-radius: 6px; color: #d8e2ec; background: rgba(255,255,255,.055); font-size: 10px; }
.dash-page .hero-meta b { color: #fff; font-weight: 650; }
.dash-page .hero-clock { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; flex: 0 0 170px; }
.dash-page .hero-clock-ring { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 158px; height: 158px; padding: 12px; border: 1px solid rgba(255,255,255,.22); border-radius: 50%; background: rgba(255,255,255,.055); text-align: center; }
.dash-page .hero-clock-ring span { color: #c8d7e6; font-size: 10px; font-weight: 650; letter-spacing: .08em; }
.dash-page .hero-clock-ring strong { margin-top: 7px; color: #fff; font-size: 25px; line-height: 1.1; font-weight: 700; }
.dash-page .hero-clock-ring small { max-width: 130px; margin-top: 7px; color: #d0dbe7; font-size: 9px; line-height: 1.4; }

.dash-page .dash-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.dash-page .dash-stat { position: relative; display: flex; align-items: flex-start; gap: 12px; min-width: 0; min-height: 104px; padding: 14px; overflow: hidden; border: 1px solid #dfe5ed; border-radius: 10px; background: #fff; box-shadow: 0 2px 8px rgba(20,38,66,.035); }
.dash-page .dash-stat-icon { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 40px; border-radius: 8px; }
.dash-page .tone-blue .dash-stat-icon { color: #2457a6; background: #edf3fb; }
.dash-page .tone-purple .dash-stat-icon { color: #6755a5; background: #f1eef9; }
.dash-page .tone-green .dash-stat-icon { color: #247b59; background: #eaf5ef; }
.dash-page .tone-amber .dash-stat-icon { color: #9b6a1e; background: #faf2e5; }
.dash-page .dash-stat-copy { min-width: 0; flex: 1; }
.dash-page .dash-stat-copy span { display: block; color: #5f6d80; font-size: 12px; font-weight: 650; }
.dash-page .dash-stat-copy strong { display: block; margin-top: 7px; color: #243247; font-size: 27px; line-height: 1.1; font-weight: 700; letter-spacing: -.5px; }
.dash-page .dash-stat-copy small { display: block; margin-top: 8px; color: #7b8797; font-size: 10px; line-height: 1.4; }
.dash-page .dash-grid-two, .dash-page .dash-grid-three, .dash-page .dash-intelligence-grid { display: grid; gap: 14px; margin-bottom: 14px; min-width: 0; }
.dash-page .dash-grid-two { grid-template-columns: minmax(0, 1.25fr) minmax(280px, .9fr); }
.dash-page .dash-grid-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.dash-page .dash-intelligence-grid { grid-template-columns: minmax(0, 1.25fr) minmax(190px, .8fr) minmax(190px, .8fr); }
.dash-page .dash-panel { min-width: 0; padding: 16px; border: 1px solid #dfe5ed; border-radius: 10px; background: #fff; box-shadow: 0 2px 8px rgba(20,38,66,.035); }
.dash-page .dash-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; min-width: 0; margin-bottom: 17px; }
.dash-page .dash-heading-left { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.dash-page .dash-icon { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 34px; border-radius: 7px; color: #315f8e; background: #eef3f8; }
.dash-page .dash-heading h2 { margin: 0; color: #29384c; font-size: 14px; line-height: 1.35; font-weight: 700; }
.dash-page .dash-heading p { margin: 4px 0 0; color: #778496; font-size: 11px; line-height: 1.45; }
.dash-page .dash-badge { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; padding: 4px 7px; border: 1px solid #e1e8e4; border-radius: 5px; color: #47705c; background: #f4f8f5; font-size: 9px; font-weight: 650; }
.dash-page .dash-badge i { width: 6px; height: 6px; }
.dash-page .pulse-main { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 18px; align-items: center; min-width: 0; }
.dash-page .pulse-summary { min-width: 0; }
.dash-page .pulse-summary>span { color: #69778a; font-size: 11px; font-weight: 600; }
.dash-page .pulse-summary>strong { display: block; margin-top: 8px; color: #26364a; font-size: 30px; line-height: 1.1; }
.dash-page .pulse-summary p { margin: 9px 0 12px; color: #68778a; font-size: 11px; line-height: 1.6; }
.dash-page .pulse-summary small { color: #7b8797; font-size: 9px; font-weight: 700; letter-spacing: .06em; }
.dash-page .pulse-chart { min-width: 0; padding: 12px; border: 1px solid #e6ebf1; border-radius: 8px; background: #fafbfd; }
.dash-page .chart-labels, .dash-page .chart-x { display: flex; justify-content: space-between; gap: 8px; color: #7c8898; font-size: 9px; }
.dash-page .line-chart { display: block; width: 100%; height: 105px; overflow: visible; color: #3c719e; }
.dash-page .dash-empty { display: flex; align-items: flex-start; gap: 11px; min-width: 0; padding: 13px 0 2px; }
.dash-page .dash-empty>span { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 34px; border-radius: 7px; color: #47745f; background: #edf5f0; }
.dash-page .dash-empty strong { display: block; color: #354459; font-size: 12px; font-weight: 650; }
.dash-page .dash-empty p { margin: 5px 0 0; color: #738095; font-size: 11px; line-height: 1.55; }
.dash-page .automation-card { padding: 14px; border: 1px solid #e5e9ef; border-radius: 8px; background: #fafbfd; }
.dash-page .automation-flow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 15px; }
.dash-page .automation-flow span { padding: 4px 6px; border: 1px solid #dfe6ed; border-radius: 4px; color: #4c6076; background: #fff; font-size: 9px; font-weight: 700; }
.dash-page .automation-flow b { color: #8b96a5; font-size: 11px; font-weight: 500; }
.dash-page .automation-card>strong { color: #354459; font-size: 12px; }
.dash-page .automation-card p { margin: 6px 0 12px; color: #738095; font-size: 11px; line-height: 1.55; }
.dash-page .automation-track { display: flex; gap: 5px; }
.dash-page .automation-track i { height: 4px; flex: 1; border-radius: 3px; background: #dfe7ef; }
.dash-page .automation-track i:first-child { background: #8ba8c4; }
.dash-page .large-chart { display: flex; gap: 10px; min-width: 0; height: 150px; }
.dash-page .chart-y { display: flex; flex-direction: column; justify-content: space-between; color: #7c8898; font-size: 9px; }
.dash-page .chart-field { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.dash-page .chart-field .line-chart { height: 122px; position: relative; z-index: 1; }
.dash-page .grid-lines { position: absolute; inset: 0 0 20px; background: repeating-linear-gradient(to bottom, #e9edf2 0, #e9edf2 1px, transparent 1px, transparent 25%); }
.dash-page .chart-note { margin: 12px 0 0; color: #778496; font-size: 10px; line-height: 1.5; }
.dash-page .bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 130px; padding: 8px 2px 0; border-bottom: 1px solid #e6ebf1; }
.dash-page .bar-wrap { display: flex; align-items: flex-end; flex: 1; height: 100%; min-width: 0; }
.dash-page .bar-wrap span { display: block; width: 100%; min-height: 6px; border-radius: 3px 3px 0 0; background: #8eabc5; }
.dash-page .activity-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; color: #748195; font-size: 10px; }
.dash-page .activity-foot span { display: flex; align-items: center; gap: 6px; }
.dash-page .activity-foot i { width: 6px; height: 6px; border-radius: 50%; background: #69a987; }
.dash-page .activity-foot strong { color: #33445a; font-size: 15px; }
.dash-page .donut-wrap { display: flex; flex-direction: column; align-items: center; gap: 15px; }
.dash-page .donut { display: grid; place-items: center; width: 118px; height: 118px; border-radius: 50%; background: conic-gradient(#547da5 0 34%, #a39ac7 34% 65%, #d5b477 65% 82%, #e9edf2 82% 100%); }
.dash-page .donut>div { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 82px; height: 82px; border-radius: 50%; background: #fff; }
.dash-page .donut strong { color: #34445a; font-size: 22px; }
.dash-page .donut span { color: #7c8898; font-size: 9px; }
.dash-page .donut-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 12px; color: #69778a; font-size: 10px; }
.dash-page .donut-legend span { display: flex; align-items: center; gap: 5px; }
.dash-page .donut-legend i { display: inline-block; width: 7px; height: 7px; border-radius: 2px; }
.dash-page .legend-blue { background: #547da5; } .dash-page .legend-purple { background: #a39ac7; } .dash-page .legend-amber { background: #d5b477; }
.dash-page .readiness { display: flex; align-items: flex-start; gap: 12px; }
.dash-page .readiness-score { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 38px; border: 1px solid #e1e7ee; border-radius: 7px; color: #41566d; background: #f7f9fb; font-size: 17px; font-weight: 700; }
.dash-page .readiness strong { display: block; color: #354459; font-size: 12px; }
.dash-page .readiness p { margin: 5px 0 0; color: #738095; font-size: 11px; line-height: 1.55; }
.dash-page .dash-saved { display: flex; align-items: center; gap: 14px; min-width: 0; margin-bottom: 14px; padding: 16px 18px; border: 1px solid #dfe5ed; border-radius: 10px; background: #fff; }
.dash-page .saved-visual { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; width: 44px; height: 44px; flex: 0 0 44px; border-radius: 8px; color: #315f8e; background: #eef3f8; }
.dash-page .saved-visual span { font-size: 8px; font-weight: 700; }
.dash-page .saved-copy { min-width: 0; flex: 1; }
.dash-page .saved-copy>span { display: block; color: #536277; font-size: 12px; font-weight: 650; }
.dash-page .saved-copy>strong { display: inline-block; margin-top: 3px; color: #26364a; font-size: 21px; }
.dash-page .saved-copy>small { display: block; color: #778496; font-size: 10px; line-height: 1.5; }
.dash-page .saved-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px; border: 1px solid #e1e8e4; border-radius: 5px; color: #47705c; background: #f4f8f5; font-size: 9px; font-weight: 650; }
.dash-page .quick-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }
.dash-page .quick-item { display: flex; align-items: center; gap: 9px; min-width: 0; min-height: 72px; padding: 11px; border: 1px solid #e1e7ee; border-radius: 8px; color: inherit; background: #fff; text-align: left; text-decoration: none; cursor: pointer; }
.dash-page .quick-item:hover { border-color: #b8c8d9; background: #f9fbfd; }
.dash-page .quick-item>span { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 34px; border-radius: 7px; color: #315f8e; background: #eef3f8; }
.dash-page .quick-item div { min-width: 0; flex: 1; }
.dash-page .quick-item strong { display: block; overflow-wrap: anywhere; color: #354459; font-size: 11px; font-weight: 650; }
.dash-page .quick-item small { display: block; margin-top: 3px; color: #778496; font-size: 9px; line-height: 1.4; }
.dash-page .quick-item>svg { flex: 0 0 auto; color: #7b8797; }
.dash-page .health-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #e5eaf0; border-radius: 8px; }
.dash-page .health-grid>div { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 12px; border-right: 1px solid #e5eaf0; }
.dash-page .health-grid>div:last-child { border-right: 0; }
.dash-page .health-grid>div>span { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 32px; border-radius: 7px; color: #315f8e; background: #eef3f8; }
.dash-page .health-grid>div>div { min-width: 0; flex: 1; }
.dash-page .health-grid strong, .dash-page .health-grid small { display: block; }
.dash-page .health-grid strong { color: #354459; font-size: 11px; }
.dash-page .health-grid small { margin-top: 3px; color: #778496; font-size: 10px; }
.dash-page .health-grid>div>i { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #5aa37e; }
.dash-page .health-message { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding: 11px; border-radius: 7px; color: #42634f; background: #f2f7f3; }
.dash-page .health-message strong { font-size: 11px; font-weight: 650; }
.dash-page .health-message small { color: #6d8375; font-size: 10px; }

@media (max-width: 1250px) {
  .dash-page .dash-intelligence-grid { grid-template-columns: minmax(0, 1.2fr) minmax(180px, .8fr); }
  .dash-page .dash-intelligence-grid article:last-child { grid-column: 1 / -1; }
  .dash-page .quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dash-page .dash-grid-two { grid-template-columns: minmax(0, 1fr) minmax(260px, .85fr); }
}
@media (max-width: 1000px) {
  .dash-page .dash-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dash-page .dash-grid-two { grid-template-columns: minmax(0, 1fr); }
  .dash-page .dash-grid-three { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dash-page .dash-grid-three article:last-child { grid-column: 1 / -1; }
  .dash-page .dash-intelligence-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dash-page .dash-intelligence-grid article:first-child { grid-column: 1 / -1; }
  .dash-page .dash-intelligence-grid article:last-child { grid-column: auto; }
}
@media (max-width: 760px) {
  .dash-page { padding-bottom: 18px; }
  .dash-page .dash-commandbar { min-height: 58px; gap: 10px; margin-bottom: 13px; padding: 8px 10px; }
  .dash-page .dash-command-icon { width: 35px; height: 35px; flex-basis: 35px; }
  .dash-page .dash-command-copy span { font-size: 9px; }
  .dash-page .dash-command-copy input { font-size: 12px; }
  .dash-page .dash-command-hint { display: none; }
  .dash-page .dash-hero { align-items: flex-start; flex-direction: column; gap: 18px; min-height: auto; padding: 22px; }
  .dash-page .dash-hero h1 { font-size: clamp(26px, 6vw, 34px); }
  .dash-page .dash-hero p { font-size: 12px; }
  .dash-page .hero-meta { flex-direction: row; align-items: flex-start; }
  .dash-page .hero-meta>span { max-width: 100%; flex-wrap: wrap; }
  .dash-page .hero-clock { flex-basis: auto; justify-content: flex-start; width: 100%; }
  .dash-page .hero-clock-ring { align-items: flex-start; width: auto; height: auto; min-height: 0; padding: 0; border: 0; background: transparent; text-align: left; }
  .dash-page .hero-clock-ring strong { font-size: 22px; }
  .dash-page .dash-grid-three { grid-template-columns: minmax(0, 1fr); }
  .dash-page .dash-grid-three article:last-child { grid-column: auto; }
  .dash-page .dash-intelligence-grid { grid-template-columns: minmax(0, 1fr); }
  .dash-page .dash-intelligence-grid article:first-child, .dash-page .dash-intelligence-grid article:last-child { grid-column: auto; }
  .dash-page .pulse-main { grid-template-columns: minmax(0, 1fr); }
  .dash-page .dash-panel { padding: 15px; }
  .dash-page .dash-heading { gap: 8px; margin-bottom: 13px; }
  .dash-page .dash-heading h2 { font-size: 13px; }
  .dash-page .dash-heading p { font-size: 10px; }
  .dash-page .dash-stat { padding: 14px; }
  .dash-page .health-grid { grid-template-columns: minmax(0, 1fr); }
  .dash-page .health-grid>div { border-right: 0; border-bottom: 1px solid #e5eaf0; }
  .dash-page .health-grid>div:last-child { border-bottom: 0; }
}
@media (max-width: 480px) {
  .dash-page .dash-stats { grid-template-columns: minmax(0, 1fr); gap: 9px; }
  .dash-page .dash-stat { min-height: 92px; }
  .dash-page .dash-stat-copy strong { font-size: 24px; }
  .dash-page .dash-hero { padding: 18px; }
  .dash-page .hero-meta { flex-direction: column; }
  .dash-page .hero-meta>span { width: fit-content; }
  .dash-page .quick-grid { grid-template-columns: minmax(0, 1fr); }
  .dash-page .dash-saved { align-items: flex-start; padding: 13px; }
  .dash-page .saved-chip { display: none; }
  .dash-page .dash-badge { font-size: 8px; }
  .dash-page .donut-legend { gap: 7px; }
}
@media (prefers-reduced-motion: reduce) {
  .dash-page * { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}
\n      `}</style>
      <div className="dash-page">
      <section className="dash-commandbar">
        <div className="dash-command-icon"><Icon name="search" size={20} /></div>
        <div className="dash-command-copy"><span>{t.commandSearch}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} /></div>
        <div className="dash-command-hint"><span>Ctrl</span><span>K</span></div>
      </section>

      {query.trim() && <section className="dash-command-results">
        {filtered.map((item) => <Link key={`command-${item.name}`} to={item.path} className="dash-result"><span><Icon name={item.icon} size={18} /></span><div><strong>{item.name}</strong><small>{item.desc}</small></div><Icon name="arrow" size={16} /></Link>)}
        {studentSearchLoading && <div className="dash-no-results"><span>{language === "HI" ? "विद्यार्थी खोज रहे हैं…" : "Searching students…"}</span></div>}
        {studentMatches.map((student) => {
          const studentId = student?.id ?? student?.student_id;
          const name = student?.full_name || [student?.first_name, student?.middle_name, student?.last_name].filter(Boolean).join(" ") || student?.name || (language === "HI" ? "विद्यार्थी" : "Student");
          const detail = [student?.admission_number || student?.admission_no || student?.sr_no, student?.class_name || student?.class?.name || student?.class_name].filter(Boolean).join(" · ");
          return <Link key={`student-${studentId ?? name}`} to={studentId ? `/students/${studentId}` : "/students"} className="dash-result"><span><Icon name="users" size={18} /></span><div><strong>{name}</strong><small>{detail || (language === "HI" ? "विद्यार्थी रिकॉर्ड" : "Student record")}</small></div><Icon name="arrow" size={16} /></Link>;
        })}
        {studentSearchError && <div className="dash-no-results"><strong>{language === "HI" ? "विद्यार्थी खोज उपलब्ध नहीं" : "Student search unavailable"}</strong><span>{studentSearchError}</span></div>}
        {!studentSearchLoading && !studentSearchError && filtered.length === 0 && studentMatches.length === 0 && <div className="dash-no-results"><strong>{t.noResults}</strong><span>{t.noResultsDesc}</span></div>}
      </section>}

      <section className="dash-hero">
        <div className="hero-content"><span className="hero-kicker"><i />{t.schoolOS}<b>{language === "HI" ? "पूर्वावलोकन" : "PREVIEW"}</b></span><h1>{t.welcome}, <em>{firstName}</em></h1><p>{t.overview}</p><div className="hero-meta"><span><Icon name="calendar" size={15} />{t.session}<b>{dashboardData.sessionName || (dashboardData.loading ? t.loading : "—")}</b></span><span><i />{t.operations}</span><span><i />{t.foundation}</span><button type="button" onClick={() => setRefreshKey((value) => value + 1)} style={{ border: "1px solid rgba(255,255,255,.25)", borderRadius: 6, padding: "0 10px", minHeight: 30, color: "#fff", background: "rgba(255,255,255,.08)", cursor: "pointer", font: "inherit", fontSize: 10 }}>{language === "HI" ? "डेटा रीफ़्रेश" : "Refresh data"}</button></div></div>
        <div className="hero-clock"><div className="hero-clock-ring"><span>{t.today}</span><strong>{timeText}</strong><small>{dateText}</small></div></div>
      </section>

      <section className="dash-stats">
        <Stat icon="users" label={t.students} value={dashboardData.studentCount === null ? (dashboardData.loading ? "…" : "—") : dashboardData.studentCount.toLocaleString("en-IN")} note={dashboardData.error || (dashboardData.loading ? t.loading : dashboardData.schoolName || t.awaiting)} tone="blue" />
        <Stat icon="teacher" label={t.teachers} value={dashboardData.collected === null ? (dashboardData.loading ? "…" : "—") : money(dashboardData.collected)} note={dashboardData.loading ? t.loading : t.collected} tone="purple" />
        <Stat icon="check" label={t.attendance} value={dashboardData.planned === null ? (dashboardData.loading ? "…" : "—") : money(dashboardData.planned)} note={dashboardData.loading ? t.loading : t.planned} tone="green" />
        <Stat icon="alert" label={t.actions} value={dashboardData.outstanding === null ? (dashboardData.loading ? "…" : "—") : money(dashboardData.outstanding)} note={dashboardData.loading ? t.loading : t.outstanding} tone="amber" />
      </section>

      <section className="dash-grid-two">
        <article className="dash-panel dash-pulse"><Heading icon="pulse" title={t.pulse} subtitle={t.pulseSub} badge={language === "HI" ? "पूर्वावलोकन" : "PREVIEW"} /><div className="pulse-main"><div className="pulse-summary"><span>{t.operations}</span><strong>{dashboardData.collected === null ? "—" : money(dashboardData.collected)}</strong><p>{dashboardData.error || (dashboardData.planned === null ? t.pulseText : `${t.collected}. ${t.planned}: ${money(dashboardData.planned)}. ${t.outstanding}: ${money(dashboardData.outstanding)}.`)}</p><small>{t.pulsePreview}</small></div><div className="pulse-chart"><div className="chart-labels"><span>HIGH</span><span>LOW</span></div><LineChart /><div className="chart-x"><span>START</span><span>NOW</span></div></div></div></article>
        <article className="dash-panel"><Heading icon="bell" title={t.action} subtitle={t.actionSub} /><Empty icon="check" title={t.actionEmpty} text={t.actionDesc} /></article>
      </section>

      <section className="dash-grid-three">
        <article className="dash-panel"><Heading icon="alert" title={t.exceptions} subtitle={t.exceptionSub} /><Empty icon="shield" title={t.exceptionEmpty} text={t.exceptionDesc} /></article>
        <article className="dash-panel"><Heading icon="calendar" title={t.schedule} subtitle={t.scheduleSub} /><Empty icon="clock" title={t.scheduleEmpty} text={t.scheduleDesc} /></article>
        <article className="dash-panel"><Heading icon="spark" title={t.automation} subtitle={t.automationSub} badge={t.ready} /><div className="automation-card"><div className="automation-flow"><span>WHEN</span><b>→</b><span>CONDITION</span><b>→</b><span>ACTION</span></div><strong>{t.automationTitle}</strong><p>{t.automationDesc}</p><div className="automation-track"><i /><i /><i /></div></div></article>
      </section>

      <section className="dash-intelligence-grid">
        <article className="dash-panel intelligence-large"><Heading icon="chart" title={t.trend} subtitle={t.trendSub} /><div className="large-chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-field"><div className="grid-lines" /><LineChart /><div className="chart-x"><span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>NOW</span></div></div></div><p className="chart-note">{t.preview}</p></article>
        <article className="dash-panel"><Heading icon="pulse" title={t.activity} subtitle={t.activitySub} badge={language === "HI" ? "पूर्वावलोकन" : "PREVIEW"} /><Bars /><div className="activity-foot"><span><i />Module signals</span><strong>—</strong></div></article>
        <article className="dash-panel"><Heading icon="alert" title={t.risk} subtitle={t.riskSub} /><Donut /><p className="chart-note">{t.preview}</p></article>
      </section>

      <section className="dash-grid-three">
        <article className="dash-panel"><Heading icon="calendar" title={t.upcoming} subtitle={t.upcomingSub} /><Empty icon="calendar" title={t.upcomingEmpty} text="Events, exams, fee dates, meetings and approvals will appear here." /></article>
        <article className="dash-panel"><Heading icon="database" title={t.quality} subtitle={t.qualitySub} badge={t.ready} /><div className="readiness"><span className="readiness-score">—</span><div><strong>{t.qualityTitle}</strong><p>{t.qualityDesc}</p></div></div></article>
        <article className="dash-panel"><Heading icon="trend" title={t.workload} subtitle={t.workloadSub} badge={t.ready} /><div className="readiness"><span className="readiness-score">—</span><div><strong>{t.workloadTitle}</strong><p>{t.workloadDesc}</p></div></div></article>
      </section>

      <section className="dash-saved"><div className="saved-visual"><Icon name="clock" size={22} /><span>TIME</span></div><div className="saved-copy"><span>{t.saved}</span><strong>—</strong><small>{t.savedTitle} · {t.savedDesc}</small></div><div className="saved-chip"><i />{language === "HI" ? "पूर्वावलोकन" : "PREVIEW"}</div></section>

      <section className="dash-panel dash-quick"><Heading icon="spark" title={t.quick} subtitle={t.quickSub} /><div className="quick-grid"><Link to="/school-profile" className="quick-item"><span><Icon name="school" size={21} /></span><div><strong>{t.school}</strong><small>{t.schoolDesc}</small></div><Icon name="arrow" size={16} /></Link><Link to="/school-profile" className="quick-item"><span><Icon name="calendar" size={21} /></span><div><strong>{t.sessions}</strong><small>{t.sessionsDesc}</small></div><Icon name="arrow" size={16} /></Link><button type="button" className="quick-item"><span><Icon name="brain" size={21} /></span><div><strong>{t.assistant}</strong><small>{t.assistantDesc}</small></div><Icon name="arrow" size={16} /></button><button type="button" className="quick-item" onClick={() => document.querySelector(".dash-commandbar input")?.focus()}><span><Icon name="search" size={21} /></span><div><strong>{t.command}</strong><small>{t.commandDesc}</small></div><Icon name="arrow" size={16} /></button></div></section>

      <section className="dash-panel dash-health"><Heading icon="database" title={t.health} subtitle={dashboardData.error || (dashboardData.loading ? t.loading : (dashboardData.studentCount !== null ? t.connected : t.healthy))} badge={dashboardData.error ? (language === "HI" ? "जाँचें" : "CHECK") : (dashboardData.loading ? t.loading : t.connected)} /><div className="health-grid"><div><span><Icon name="users" size={18} /></span><div><strong>{t.auth}</strong><small>{dashboardData.loading ? t.loading : (dashboardData.error ? t.dataUnavailable : t.connected)}</small></div><i /></div><div><span><Icon name="pulse" size={18} /></span><div><strong>{t.api}</strong><small>{dashboardData.loading ? t.loading : (dashboardData.error ? t.dataUnavailable : t.connected)}</small></div><i /></div><div><span><Icon name="database" size={18} /></span><div><strong>{t.db}</strong><small>{dashboardData.loading ? t.loading : (dashboardData.error ? t.dataUnavailable : t.connected)}</small></div><i /></div></div><div className="health-message"><span><Icon name="shield" size={17} /></span><strong>{dashboardData.error || (dashboardData.loading ? t.loading : t.strong)}</strong><small>{dashboardData.schoolName ? `${dashboardData.schoolName} · ${dashboardData.sessionName || ""}` : "Core dashboard data connection status"}</small></div></section>
      </div>
    </>
  );
}
