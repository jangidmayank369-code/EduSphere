import { useEffect, useMemo, useState } from "react";
import { getAcademicSessions } from "../../api/school";
import { getStudents, importStudentsFromSession } from "../../api/students";

function recordsOf(value) {
  let result = value?.data ?? value;
  for (let i = 0; i < 3; i += 1) {
    if (result && !Array.isArray(result) && result.data !== undefined && !result.id) result = result.data;
    else break;
  }
  if (Array.isArray(result)) return result;
  return result?.items || result?.results || result?.sessions || result?.students || [];
}

function sessionId(session) {
  return session?.id ?? session?.academic_session_id ?? session?.session_id;
}

function studentName(student) {
  return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
}

// Suggest the next class from the student's current class. Unknown labels stay
// blank so the UI never silently guesses a promotion path it does not know.
function nextClassName(value) {
  const current = String(value ?? "").trim();
  if (!current) return "";

  const normalized = current.toLowerCase().replace(/\s+/g, " ");
  const namedProgression = {
    nursery: "LKG",
    lkg: "UKG",
    ukg: "1",
  };
  if (namedProgression[normalized]) return namedProgression[normalized];

  const classMatch = normalized.match(/^(?:class\s*)?(\d+)(?:st|nd|rd|th)?$/i);
  if (classMatch) {
    const next = Number(classMatch[1]) + 1;
    if (!Number.isSafeInteger(next)) return "";
    if (/^class\s*/i.test(current)) return `Class ${next}`;
    return String(next);
  }

  const ordinalMatch = current.match(/^(\d+)(st|nd|rd|th)$/i);
  if (ordinalMatch) {
    const next = Number(ordinalMatch[1]) + 1;
    const suffix = next % 100 >= 11 && next % 100 <= 13 ? "th" : next % 10 === 1 ? "st" : next % 10 === 2 ? "nd" : next % 10 === 3 ? "rd" : "th";
    return `${next}${suffix}`;
  }

  return "";
}

export default function StudentSessionImport({ scope, language = "en", onClose, onComplete }) {
  const hi = language === "hi";
  const [sessions, setSessions] = useState([]);
  const [sourceId, setSourceId] = useState("");
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState({});
  const [placements, setPlacements] = useState({});
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const sources = useMemo(() => sessions.filter((session) => String(sessionId(session)) !== String(scope?.sessionId)), [sessions, scope?.sessionId]);

  useEffect(() => {
    let live = true;
    getAcademicSessions(scope.schoolId)
      .then((result) => {
        if (!live) return;
        const list = recordsOf(result);
        setSessions(list);
        const preferred = list.find((item) => String(sessionId(item)) !== String(scope.sessionId) && /2025\s*[-–/]\s*(2026|26)/.test(String(item.name || item.session_name || item.academic_year || item.label || "")));
        const first = list.find((item) => String(sessionId(item)) !== String(scope.sessionId));
        if (preferred || first) setSourceId(String(sessionId(preferred || first)));
      })
      .catch((err) => { if (live) setError(err.message || (hi ? "सेशन लोड नहीं हुए।" : "Unable to load academic sessions.")); })
      .finally(() => { if (live) setLoadingSessions(false); });
    return () => { live = false; };
  }, [scope.schoolId, scope.sessionId, hi]);

  useEffect(() => {
    let live = true;
    if (!sourceId) { setStudents([]); setSelected({}); setPlacements({}); return () => { live = false; }; }
    setLoadingStudents(true); setError(""); setMessage("");
    getStudents({ schoolId: scope.schoolId, academicSessionId: Number(sourceId), page: 1, pageSize: 100 })
      .then((result) => {
        if (!live) return;
        const list = recordsOf(result);
        setStudents(list);
        setSelected({});
        setPlacements(Object.fromEntries(list.map((student) => [student.id, { class_name: nextClassName(student.class_name), section: student.section || "" }])));
      })
      .catch((err) => { if (live) setError(err.message || (hi ? "विद्यार्थी लोड नहीं हुए।" : "Unable to load source-session students.")); })
      .finally(() => { if (live) setLoadingStudents(false); });
    return () => { live = false; };
  }, [scope.schoolId, sourceId, hi]);

  function updatePlacement(id, key, value) {
    setPlacements((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  async function submit(event) {
    event.preventDefault();
    const chosen = students.filter((student) => selected[student.id]);
    if (!chosen.length) { setError(hi ? "कम से कम एक विद्यार्थी चुनें।" : "Select at least one student."); return; }
    if (!window.confirm(hi ? `${chosen.length} विद्यार्थियों को चुने गए नए सेशन में ले जाना है?` : `Move ${chosen.length} student(s) into the selected academic session?`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await importStudentsFromSession({
        school_id: Number(scope.schoolId),
        source_academic_session_id: Number(sourceId),
        target_academic_session_id: Number(scope.sessionId),
        students: chosen.map((student) => ({ student_id: student.id, class_name: placements[student.id]?.class_name ?? null, section: placements[student.id]?.section ?? null })),
      });
      const count = result?.meta?.updated ?? chosen.length;
      setMessage(hi ? `${count} विद्यार्थी नए सेशन में आ गए।` : `${count} student(s) moved to the current session.`);
      await onComplete?.();
      window.setTimeout(() => onClose?.(), 700);
    } catch (err) {
      setError(err.message || (hi ? "सेशन इम्पोर्ट पूरा नहीं हुआ।" : "Session import failed."));
    } finally { setSaving(false); }
  }

  const label = {
    title: hi ? "पिछले सेशन से विद्यार्थी लाएँ" : "Import Students From Another Session",
    source: hi ? "सोर्स सेशन" : "Source session",
    target: hi ? "टारगेट सेशन" : "Target session",
    select: hi ? "चुनें" : "Select",
    all: hi ? "सभी चुनें" : "Select all",
    name: hi ? "विद्यार्थी" : "Student",
    admission: hi ? "प्रवेश संख्या" : "Admission no.",
    currentClass: hi ? "वर्तमान कक्षा" : "Current class",
    currentSection: hi ? "वर्तमान सेक्शन" : "Current section",
    className: hi ? "नई कक्षा" : "New class",
    section: hi ? "नया सेक्शन" : "New section",
    cancel: hi ? "रद्द करें" : "Cancel",
    submit: hi ? "चुने विद्यार्थियों को इम्पोर्ट करें" : "Import selected students",
    loading: hi ? "लोड हो रहा है…" : "Loading…",
    none: hi ? "इस सेशन में विद्यार्थी नहीं मिले।" : "No students found in this session.",
    note: hi ? "यह प्रक्रिया विद्यार्थी का वही रिकॉर्ड और प्रवेश संख्या रखती है; केवल वर्तमान सेशन/कक्षा बदलेगी। पुराने सेशन की फीस हिस्ट्री बनी रहेगी।" : "This keeps the same student record and admission number, changes current session/class placement, and preserves historical fee records.",
  };

  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose?.(); }} style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(15,23,42,.58)", display: "grid", placeItems: "center", padding: 12 }}>
    <section role="dialog" aria-modal="true" aria-labelledby="student-session-import-title" style={{ width: "min(1180px, calc(100vw - 24px))", maxWidth: "1180px", maxHeight: "92dvh", overflow: "auto", boxSizing: "border-box", background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px #0f172a40", padding: "clamp(14px, 2vw, 24px)", color: "#25314a" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div><h2 id="student-session-import-title" style={{ margin: "0 0 6px", fontSize: 21 }}>{label.title}</h2><p style={{ margin: 0, fontSize: 13, color: "#718096" }}>{label.note}</p></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close" style={{ border: 0, background: "#f1f5f9", borderRadius: 8, padding: "7px 11px", cursor: "pointer" }}>✕</button>
      </header>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, margin: "18px 0" }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>{label.source}<select value={sourceId} onChange={(event) => setSourceId(event.target.value)} disabled={loadingSessions || saving} required style={{ minHeight: 42, border: "1px solid #dbe2ef", borderRadius: 9, padding: 9, background: "#fff" }}><option value="">{label.select}</option>{sources.map((session) => <option key={sessionId(session)} value={sessionId(session)}>{session.name || session.session_name || session.academic_year || session.label || `Session ${sessionId(session)}`}</option>)}</select></label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>{label.target}<input readOnly value={scope.sessionName || scope.sessionId} style={{ minHeight: 42, border: "1px solid #dbe2ef", borderRadius: 9, padding: 9, background: "#f8fafc" }} /></label>
        </div>
        {error && <div role="alert" style={{ background: "#fff1f2", color: "#b42336", borderRadius: 9, padding: 10, marginBottom: 12, fontSize: 13 }}>{error}</div>}
        {message && <div role="status" style={{ background: "#ecfdf3", color: "#027a48", borderRadius: 9, padding: 10, marginBottom: 12, fontSize: 13 }}>{message}</div>}
        {loadingSessions || loadingStudents ? <p>{label.loading}</p> : <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}><strong style={{ fontSize: 13 }}>{students.length} {label.name.toLowerCase()}(s)</strong><button type="button" onClick={() => setSelected(Object.fromEntries(students.map((student) => [student.id, true])))} disabled={!students.length || saving} style={{ border: "1px solid #dbe2ef", borderRadius: 8, background: "white", padding: "8px 10px", cursor: "pointer" }}>{label.all}</button></div>
          {!students.length ? <p style={{ textAlign: "center", padding: 30, color: "#718096" }}>{label.none}</p> : <div style={{ display: "block", width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", border: "1px solid #e5eaf2", borderRadius: 10, boxSizing: "border-box" }}>
            <div role="table" aria-label={label.title} style={{ display: "block", width: "100%", minWidth: 0, boxSizing: "border-box", fontSize: 12 }}>
              <div role="row" style={{ display: "grid", gridTemplateColumns: "40px minmax(170px, 1.4fr) minmax(95px, .7fr) minmax(95px, .7fr) minmax(120px, 1fr) minmax(110px, .9fr)", width: "100%", boxSizing: "border-box", background: "#f8fafc", color: "#667085", fontWeight: 700, alignItems: "center" }}>
                <div role="columnheader" style={{ padding: "12px 10px" }}></div>
                <div role="columnheader" style={{ padding: "12px 10px", overflowWrap: "anywhere" }}>{label.name} / {label.admission}</div>
                <div role="columnheader" style={{ padding: "12px 8px" }}>{label.currentClass}</div>
                <div role="columnheader" style={{ padding: "12px 8px" }}>{label.currentSection}</div>
                <div role="columnheader" style={{ padding: "12px 8px" }}>{label.className}</div>
                <div role="columnheader" style={{ padding: "12px 8px" }}>{label.section}</div>
              </div>
              {students.map((student) => <div role="row" key={student.id} style={{ display: "grid", gridTemplateColumns: "40px minmax(170px, 1.4fr) minmax(95px, .7fr) minmax(95px, .7fr) minmax(120px, 1fr) minmax(110px, .9fr)", width: "100%", boxSizing: "border-box", borderTop: "1px solid #edf1f6", alignItems: "center" }}>
                <div role="cell" style={{ padding: 10 }}><input type="checkbox" checked={Boolean(selected[student.id])} onChange={(event) => setSelected((current) => ({ ...current, [student.id]: event.target.checked }))} aria-label={`Select ${studentName(student)}`} /></div>
                <div role="cell" style={{ padding: "12px 10px", minWidth: 0, overflowWrap: "anywhere" }}><strong style={{ display: "block", overflowWrap: "anywhere" }}>{studentName(student)}</strong><span style={{ color: "#718096", overflowWrap: "anywhere" }}>{student.admission_number}</span></div>
                <div role="cell" style={{ padding: "12px 8px", minWidth: 0, color: "#475467" }}>{student.class_name || "—"}</div>
                <div role="cell" style={{ padding: "12px 8px", minWidth: 0, color: "#475467" }}>{student.section || "—"}</div>
                <div role="cell" style={{ padding: 8, minWidth: 0 }}><input value={placements[student.id]?.class_name ?? ""} onChange={(event) => updatePlacement(student.id, "class_name", event.target.value)} maxLength={50} aria-label={`${label.className} ${studentName(student)}`} style={{ display: "block", width: "100%", minWidth: 0, boxSizing: "border-box", minHeight: 38, border: "1px solid #dbe2ef", borderRadius: 7, padding: 7 }} /></div>
                <div role="cell" style={{ padding: 8, minWidth: 0 }}><input value={placements[student.id]?.section ?? ""} onChange={(event) => updatePlacement(student.id, "section", event.target.value)} maxLength={30} aria-label={`${label.section} ${studentName(student)}`} style={{ display: "block", width: "100%", minWidth: 0, boxSizing: "border-box", minHeight: 38, border: "1px solid #dbe2ef", borderRadius: 7, padding: 7 }} /></div>
              </div>)}
            </div>
          </div>}
        </>}
        <footer style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 18 }}><button type="button" onClick={onClose} disabled={saving} style={{ border: "1px solid #dbe2ef", borderRadius: 9, background: "white", padding: "10px 14px", cursor: "pointer" }}>{label.cancel}</button><button type="submit" disabled={saving || loadingSessions || loadingStudents || !sourceId || !students.length} style={{ border: 0, borderRadius: 9, background: "#4f46b5", color: "white", padding: "10px 15px", fontWeight: 700, cursor: "pointer", opacity: saving ? .7 : 1 }}>{saving ? label.loading : label.submit}</button></footer>
      </form>
    </section>
  </div>;
}
