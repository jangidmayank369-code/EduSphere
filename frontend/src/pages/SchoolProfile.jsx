import React, { useEffect, useMemo, useState } from "react";
import {
  createAcademicSession,
  getAcademicSessions,
  getSchools,
  setCurrentAcademicSession,
  updateAcademicSession,
  updateAcademicSessionStatus,
  updateSchool,
  updateSchoolStatus,
} from "../api/school";

import "../school-profile.css";

const TEXT = {
  en: {
    title: "School Profile",
    subtitle: "Manage your school identity, branding and academic sessions.",
    schoolIdentity: "School Identity",
    academicSessions: "Academic Sessions",
    schoolName: "School Name",
    schoolCode: "School Code",
    address: "Address",
    city: "City",
    state: "State",
    country: "Country",
    postalCode: "Postal Code",
    phone: "Phone",
    email: "Email",
    website: "Website",
    principalName: "Principal Name",
    logoUrl: "Logo URL",
    saveChanges: "Save Changes",
    edit: "Edit",
    active: "Active",
    inactive: "Inactive",
    current: "Current",
    setCurrent: "Set Current",
    deactivate: "Deactivate",
    activate: "Activate",
    addSession: "Add Session",
    editSession: "Edit Session",
    createSession: "Create Session",
    sessionName: "Session Name",
    startDate: "Start Date",
    endDate: "End Date",
    sessionStatus: "Session Status",
    cancel: "Cancel",
    save: "Save",
    loading: "Loading school profile...",
    noSchool: "No school profile found.",
    noSessions: "No academic sessions found.",
    sessionCount: "Sessions",
    schoolStatus: "School Status",
    currentSession: "Current Session",
    profileUpdated: "School profile updated successfully.",
    sessionCreated: "Academic session created successfully.",
    sessionUpdated: "Academic session updated successfully.",
    currentUpdated: "Current academic session updated.",
    statusUpdated: "Status updated successfully.",
    failed: "Something went wrong. Please try again.",
    yes: "Yes",
    no: "No",
  },
  hi: {
    title: "स्कूल प्रोफाइल",
    subtitle: "स्कूल की पहचान, ब्रांडिंग और अकादमिक सत्र प्रबंधित करें।",
    schoolIdentity: "स्कूल की जानकारी",
    academicSessions: "अकादमिक सत्र",
    schoolName: "स्कूल का नाम",
    schoolCode: "स्कूल कोड",
    address: "पता",
    city: "शहर",
    state: "राज्य",
    country: "देश",
    postalCode: "पिन कोड",
    phone: "फोन",
    email: "ईमेल",
    website: "वेबसाइट",
    principalName: "प्रधानाचार्य का नाम",
    logoUrl: "लोगो URL",
    saveChanges: "बदलाव सेव करें",
    edit: "संपादित करें",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    current: "वर्तमान",
    setCurrent: "वर्तमान करें",
    deactivate: "निष्क्रिय करें",
    activate: "सक्रिय करें",
    addSession: "सत्र जोड़ें",
    editSession: "सत्र संपादित करें",
    createSession: "सत्र बनाएं",
    sessionName: "सत्र का नाम",
    startDate: "आरंभ तिथि",
    endDate: "समाप्ति तिथि",
    sessionStatus: "सत्र स्थिति",
    cancel: "रद्द करें",
    save: "सेव करें",
    loading: "स्कूल प्रोफाइल लोड हो रही है...",
    noSchool: "स्कूल प्रोफाइल नहीं मिली।",
    noSessions: "कोई अकादमिक सत्र नहीं मिला।",
    sessionCount: "सत्र",
    schoolStatus: "स्कूल स्थिति",
    currentSession: "वर्तमान सत्र",
    profileUpdated: "स्कूल प्रोफाइल सफलतापूर्वक अपडेट हुई।",
    sessionCreated: "अकादमिक सत्र सफलतापूर्वक बनाया गया।",
    sessionUpdated: "अकादमिक सत्र सफलतापूर्वक अपडेट हुआ।",
    currentUpdated: "वर्तमान अकादमिक सत्र अपडेट हुआ।",
    statusUpdated: "स्थिति सफलतापूर्वक अपडेट हुई।",
    failed: "कुछ गलत हुआ। कृपया दोबारा प्रयास करें।",
    yes: "हाँ",
    no: "नहीं",
  },
};

const EMPTY_SESSION = {
  name: "",
  start_date: "",
  end_date: "",
};

function unwrap(response) {
  return response?.data ?? response;
}

function getError(error, fallback) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

  const paths = {
    school: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V9l7-4 7 4v12" />
        <path d="M9 21v-6h6v6" />
        <path d="M9 10h.01M12 10h.01M15 10h.01" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M16 2.5v4M8 2.5v4M3 9h18" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    power: (
      <>
        <path d="M12 2v10" />
        <path d="M18.4 5.6a8 8 0 1 1-12.8 0" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    save: (
      <>
        <path d="M5 3h12l2 2v16H5z" />
        <path d="M8 3v6h8V3M8 21v-7h8v7" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.school}</svg>;
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
  placeholder = "",
}) {
  return (
    <label className="school-field">
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function SchoolProfile() {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("edusphere-language") || "en"
  );

  const t = TEXT[language] || TEXT.en;

  const [school, setSchool] = useState(null);
  const [schoolForm, setSchoolForm] = useState({});
  const [sessions, setSessions] = useState([]);

  const [editing, setEditing] = useState(false);
  const [sessionModal, setSessionModal] = useState(null);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(localStorage.getItem("edusphere-language") || "en");
    };

    window.addEventListener("edusphere-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener(
        "edusphere-language-change",
        handleLanguageChange
      );
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const schoolsResponse = await getSchools();
      const schoolsPayload = unwrap(schoolsResponse);

      const schoolList = Array.isArray(schoolsPayload)
        ? schoolsPayload
        : schoolsPayload?.items || schoolsPayload?.data || [];

      const activeSchool =
        schoolList.find((item) => item?.is_active !== false) ||
        schoolList[0] ||
        null;

      if (!activeSchool) {
        setSchool(null);
        setSessions([]);
        return;
      }

      setSchool(activeSchool);
      setSchoolForm({
        name: activeSchool.name || "",
        code: activeSchool.code || "",
        address: activeSchool.address || "",
        city: activeSchool.city || "",
        state: activeSchool.state || "",
        country: activeSchool.country || "",
        postal_code: activeSchool.postal_code || "",
        phone: activeSchool.phone || "",
        email: activeSchool.email || "",
        website: activeSchool.website || "",
        principal_name: activeSchool.principal_name || "",
        logo_url: activeSchool.logo_url || "",
      });

      const sessionResponse = await getAcademicSessions(activeSchool.id);
      const sessionPayload = unwrap(sessionResponse);

      const sessionList = Array.isArray(sessionPayload)
        ? sessionPayload
        : sessionPayload?.items || sessionPayload?.data || [];

      setSessions(sessionList);
    } catch (err) {
      setError(getError(err, t.failed));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentSession = useMemo(
    () => sessions.find((session) => session.is_current) || null,
    [sessions]
  );

  const updateSchoolField = (field, value) => {
    setSchoolForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveSchool = async () => {
    if (!school?.id) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        name: schoolForm.name,
        code: schoolForm.code,
        address: schoolForm.address || null,
        city: schoolForm.city || null,
        state: schoolForm.state || null,
        country: schoolForm.country || null,
        postal_code: schoolForm.postal_code || null,
        phone: schoolForm.phone || null,
        email: schoolForm.email || null,
        website: schoolForm.website || null,
        principal_name: schoolForm.principal_name || null,
        logo_url: schoolForm.logo_url || null,
      };

      const response = await updateSchool(school.id, payload);
      const updated = unwrap(response);

      setSchool(updated);
      setSchoolForm({
        name: updated.name || "",
        code: updated.code || "",
        address: updated.address || "",
        city: updated.city || "",
        state: updated.state || "",
        country: updated.country || "",
        postal_code: updated.postal_code || "",
        phone: updated.phone || "",
        email: updated.email || "",
        website: updated.website || "",
        principal_name: updated.principal_name || "",
        logo_url: updated.logo_url || "",
      });

      setEditing(false);
      setMessage(t.profileUpdated);
    } catch (err) {
      setError(getError(err, t.failed));
    } finally {
      setSaving(false);
    }
  };

  const toggleSchoolStatus = async () => {
    if (!school?.id) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const nextStatus = school.is_active === false;

      const response = await updateSchoolStatus(school.id, nextStatus);
      const updated = unwrap(response);

      setSchool(updated);
      setMessage(t.statusUpdated);
    } catch (err) {
      setError(getError(err, t.failed));
    } finally {
      setSaving(false);
    }
  };

  const openCreateSession = () => {
    setSessionForm(EMPTY_SESSION);
    setSessionModal("create");
    setError("");
    setMessage("");
  };

  const openEditSession = (session) => {
    setSessionForm({
      name: session.name || "",
      start_date: session.start_date || "",
      end_date: session.end_date || "",
    });

    setSessionModal({
      mode: "edit",
      id: session.id,
    });

    setError("");
    setMessage("");
  };

  const saveSession = async () => {
    if (!school?.id) return;

    if (!sessionForm.name || !sessionForm.start_date || !sessionForm.end_date) {
      setError(t.failed);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (sessionModal === "create") {
        await createAcademicSession({
          school_id: school.id,
          name: sessionForm.name,
          start_date: sessionForm.start_date,
          end_date: sessionForm.end_date,
        });

        setMessage(t.sessionCreated);
      } else {
        await updateAcademicSession(sessionModal.id, {
          name: sessionForm.name,
          start_date: sessionForm.start_date,
          end_date: sessionForm.end_date,
        });

        setMessage(t.sessionUpdated);
      }

      setSessionModal(null);
      setSessionForm(EMPTY_SESSION);

      const response = await getAcademicSessions(school.id);
      const payload = unwrap(response);

      setSessions(
        Array.isArray(payload)
          ? payload
          : payload?.items || payload?.data || []
      );
    } catch (err) {
      setError(getError(err, t.failed));
    } finally {
      setSaving(false);
    }
  };

  const makeCurrent = async (session) => {
    if (!school?.id || !session?.id) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await setCurrentAcademicSession(school.id, session.id);

      const response = await getAcademicSessions(school.id);
      const payload = unwrap(response);

      const updatedSessions = Array.isArray(payload)
        ? payload
        : payload?.items || payload?.data || [];

      setSessions(updatedSessions);
      setMessage(t.currentUpdated);
    } catch (err) {
      setError(getError(err, t.failed));
    } finally {
      setSaving(false);
    }
  };

  const toggleSessionStatus = async (session) => {
    if (!session?.id) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await updateAcademicSessionStatus(
        session.id,
        session.is_active === false
      );

      const response = await getAcademicSessions(school.id);
      const payload = unwrap(response);

      setSessions(
        Array.isArray(payload)
          ? payload
          : payload?.items || payload?.data || []
      );

      setMessage(t.statusUpdated);
    } catch (err) {
      setError(getError(err, t.failed));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="school-page">
        <div className="school-loading">
          <div className="school-loading-orb" />
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="school-page">
        <div className="school-empty">
          <div className="school-empty-icon">
            <Icon name="school" />
          </div>
          <h2>{t.noSchool}</h2>
          <button className="school-btn school-btn-primary" onClick={loadData}>
            {t.save}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="school-page">
      <section className="school-hero">
        <div className="school-hero-glow school-hero-glow-one" />
        <div className="school-hero-glow school-hero-glow-two" />

        <div className="school-hero-main">
          <div className="school-logo">
            {school.logo_url ? (
              <img src={school.logo_url} alt={school.name} />
            ) : (
              <Icon name="school" />
            )}
          </div>

          <div className="school-hero-copy">
            <div className="school-eyebrow">
              EDU<span>SPHERE</span> · SCHOOL CORE
            </div>

            <h1>{school.name}</h1>

            <p>{t.subtitle}</p>

            <div className="school-hero-meta">
              <span>{school.code || "—"}</span>

              {currentSession && (
                <span className="school-current-pill">
                  <Icon name="calendar" />
                  {currentSession.name}
                </span>
              )}

              <span
                className={
                  school.is_active === false
                    ? "school-status-pill inactive"
                    : "school-status-pill"
                }
              >
                {school.is_active === false ? t.inactive : t.active}
              </span>
            </div>
          </div>
        </div>

        <div className="school-hero-actions">
          <button
            className="school-btn school-btn-ghost"
            onClick={() => setEditing((value) => !value)}
          >
            <Icon name="edit" />
            {editing ? t.cancel : t.edit}
          </button>

          <button
            className="school-btn school-btn-light"
            onClick={toggleSchoolStatus}
            disabled={saving}
          >
            <Icon name="power" />
            {school.is_active === false ? t.activate : t.deactivate}
          </button>
        </div>
      </section>

      {error && (
        <div className="school-alert school-alert-error">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <Icon name="close" />
          </button>
        </div>
      )}

      {message && (
        <div className="school-alert school-alert-success">
          <Icon name="check" />
          <span>{message}</span>
        </div>
      )}

      <section className="school-stats">
        <div className="school-stat-card">
          <div className="school-stat-icon">
            <Icon name="school" />
          </div>
          <div>
            <span>{t.schoolStatus}</span>
            <strong>
              {school.is_active === false ? t.inactive : t.active}
            </strong>
          </div>
        </div>

        <div className="school-stat-card">
          <div className="school-stat-icon">
            <Icon name="calendar" />
          </div>
          <div>
            <span>{t.currentSession}</span>
            <strong>{currentSession?.name || "—"}</strong>
          </div>
        </div>

        <div className="school-stat-card">
          <div className="school-stat-icon">
            <Icon name="check" />
          </div>
          <div>
            <span>{t.sessionStatus}</span>
            <strong>
              {currentSession
                ? currentSession.is_active === false
                  ? t.inactive
                  : t.active
                : "—"}
            </strong>
          </div>
        </div>

        <div className="school-stat-card">
          <div className="school-stat-icon">
            <Icon name="calendar" />
          </div>
          <div>
            <span>{t.sessionCount}</span>
            <strong>{sessions.length}</strong>
          </div>
        </div>
      </section>

      <section className="school-section">
        <div className="school-section-heading">
          <div>
            <span className="school-section-kicker">IDENTITY</span>
            <h2>{t.schoolIdentity}</h2>
          </div>

          {!editing && (
            <button
              className="school-btn school-btn-secondary"
              onClick={() => setEditing(true)}
            >
              <Icon name="edit" />
              {t.edit}
            </button>
          )}
        </div>

        <div className="school-identity-card">
          <div className="school-identity-preview">
            <div className="school-preview-logo">
              {school.logo_url ? (
                <img src={school.logo_url} alt={school.name} />
              ) : (
                <Icon name="school" />
              )}
            </div>

            <strong>{school.name}</strong>
            <span>{school.code || "—"}</span>

            {currentSession && (
              <small>{currentSession.name}</small>
            )}
          </div>

          <div className="school-form">
            <Field
              label={t.schoolName}
              value={schoolForm.name}
              onChange={(value) => updateSchoolField("name", value)}
              disabled={!editing || saving}
            />

            <Field
              label={t.schoolCode}
              value={schoolForm.code}
              onChange={(value) => updateSchoolField("code", value)}
              disabled={!editing || saving}
            />

            <Field
              label={t.principalName}
              value={schoolForm.principal_name}
              onChange={(value) =>
                updateSchoolField("principal_name", value)
              }
              disabled={!editing || saving}
            />

            <Field
              label={t.phone}
              value={schoolForm.phone}
              onChange={(value) => updateSchoolField("phone", value)}
              disabled={!editing || saving}
            />

            <Field
              label={t.email}
              type="email"
              value={schoolForm.email}
              onChange={(value) => updateSchoolField("email", value)}
              disabled={!editing || saving}
            />

            <Field
              label={t.website}
              value={schoolForm.website}
              onChange={(value) => updateSchoolField("website", value)}
              disabled={!editing || saving}
            />

            <Field
              label={t.city}
              value={schoolForm.city}
              onChange={(value) => updateSchoolField("city", value)}
              disabled={!editing || saving}
            />

            <Field
              label={t.state}
              value={schoolForm.state}
              onChange={(value) => updateSchoolField("state", value)}
              disabled={!editing || saving}
            />

            <Field
              label={t.country}
              value={schoolForm.country}
              onChange={(value) => updateSchoolField("country", value)}
              disabled={!editing || saving}
            />

            <Field
              label={t.postalCode}
              value={schoolForm.postal_code}
              onChange={(value) => updateSchoolField("postal_code", value)}
              disabled={!editing || saving}
            />

            <div className="school-field school-field-wide">
              <span>{t.address}</span>
              <textarea
                value={schoolForm.address ?? ""}
                onChange={(event) =>
                  updateSchoolField("address", event.target.value)
                }
                disabled={!editing || saving}
                rows={3}
              />
            </div>

            <Field
              label={t.logoUrl}
              value={schoolForm.logo_url}
              onChange={(value) => updateSchoolField("logo_url", value)}
              disabled={!editing || saving}
              placeholder="https://..."
            />
          </div>
        </div>

        {editing && (
          <div className="school-form-actions">
            <button
              className="school-btn school-btn-secondary"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              {t.cancel}
            </button>

            <button
              className="school-btn school-btn-primary"
              onClick={saveSchool}
              disabled={saving}
            >
              <Icon name="save" />
              {saving ? "..." : t.saveChanges}
            </button>
          </div>
        )}
      </section>

      <section className="school-section">
        <div className="school-section-heading">
          <div>
            <span className="school-section-kicker">ACADEMIC ENGINE</span>
            <h2>{t.academicSessions}</h2>
          </div>

          <button
            className="school-btn school-btn-primary"
            onClick={openCreateSession}
            disabled={saving}
          >
            <Icon name="plus" />
            {t.addSession}
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="school-no-sessions">
            <div className="school-empty-icon">
              <Icon name="calendar" />
            </div>
            <strong>{t.noSessions}</strong>
          </div>
        ) : (
          <div className="school-session-list">
            {sessions.map((session) => (
              <article
                className={`school-session-card ${
                  session.is_current ? "current" : ""
                }`}
                key={session.id}
              >
                <div className="school-session-main">
                  <div className="school-session-icon">
                    <Icon name="calendar" />
                  </div>

                  <div>
                    <div className="school-session-title-row">
                      <h3>{session.name}</h3>

                      {session.is_current && (
                        <span className="school-current-tag">
                          {t.current}
                        </span>
                      )}
                    </div>

                    <div className="school-session-dates">
                      <span>{formatDate(session.start_date)}</span>
                      <i>→</i>
                      <span>{formatDate(session.end_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="school-session-actions">
                  <span
                    className={
                      session.is_active === false
                        ? "school-status-pill inactive"
                        : "school-status-pill"
                    }
                  >
                    {session.is_active === false ? t.inactive : t.active}
                  </span>

                  {!session.is_current && session.is_active !== false && (
                    <button
                      className="school-icon-btn"
                      title={t.setCurrent}
                      onClick={() => makeCurrent(session)}
                      disabled={saving}
                    >
                      <Icon name="check" />
                    </button>
                  )}

                  <button
                    className="school-icon-btn"
                    title={t.edit}
                    onClick={() => openEditSession(session)}
                    disabled={saving}
                  >
                    <Icon name="edit" />
                  </button>

                  <button
                    className="school-icon-btn"
                    title={
                      session.is_active === false
                        ? t.activate
                        : t.deactivate
                    }
                    onClick={() => toggleSessionStatus(session)}
                    disabled={saving || session.is_current}
                  >
                    <Icon name="power" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {sessionModal && (
        <div
          className="school-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSessionModal(null);
            }
          }}
        >
          <div className="school-modal">
            <div className="school-modal-header">
              <div>
                <span className="school-section-kicker">SESSION</span>
                <h2>
                  {sessionModal === "create"
                    ? t.createSession
                    : t.editSession}
                </h2>
              </div>

              <button
                className="school-icon-btn"
                onClick={() => setSessionModal(null)}
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="school-modal-body">
              <Field
                label={t.sessionName}
                value={sessionForm.name}
                onChange={(value) =>
                  setSessionForm((previous) => ({
                    ...previous,
                    name: value,
                  }))
                }
                disabled={saving}
              />

              <Field
                label={t.startDate}
                type="date"
                value={sessionForm.start_date}
                onChange={(value) =>
                  setSessionForm((previous) => ({
                    ...previous,
                    start_date: value,
                  }))
                }
                disabled={saving}
              />

              <Field
                label={t.endDate}
                type="date"
                value={sessionForm.end_date}
                onChange={(value) =>
                  setSessionForm((previous) => ({
                    ...previous,
                    end_date: value,
                  }))
                }
                disabled={saving}
              />
            </div>

            <div className="school-modal-actions">
              <button
                className="school-btn school-btn-secondary"
                onClick={() => setSessionModal(null)}
                disabled={saving}
              >
                {t.cancel}
              </button>

              <button
                className="school-btn school-btn-primary"
                onClick={saveSession}
                disabled={saving}
              >
                <Icon name="save" />
                {saving ? "..." : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}