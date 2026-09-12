import { useEffect, useMemo, useState } from "react";
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

const TEXT = {
  en: {
    title: "School Profile",
    subtitle: "Manage school information and academic sessions.",
    schoolInfo: "School Information",
    academicSessions: "Academic Sessions",
    edit: "Edit",
    save: "Save Changes",
    cancel: "Cancel",
    refresh: "Refresh",
    active: "Active",
    inactive: "Inactive",
    schoolName: "School Name",
    code: "School Code",
    email: "Email",
    phone: "Phone",
    address: "Address",
    city: "City",
    state: "State",
    country: "Country",
    postalCode: "Postal Code",
    website: "Website",
    affiliation: "Affiliation",
    principal: "Principal",
    logoUrl: "Logo URL",
    current: "Current",
    setCurrent: "Set Current",
    addSession: "Add Session",
    editSession: "Edit Session",
    sessionName: "Session Name",
    startDate: "Start Date",
    endDate: "End Date",
    status: "Status",
    actions: "Actions",
    create: "Create",
    noSessions: "No academic sessions found.",
    loading: "Loading...",
    error: "Something went wrong.",
    saved: "Changes saved successfully.",
    sessionCreated: "Academic session created successfully.",
    sessionUpdated: "Academic session updated successfully.",
    currentUpdated: "Current academic session updated.",
    statusUpdated: "Status updated.",
  },
  hi: {
    title: "स्कूल प्रोफ़ाइल",
    subtitle: "स्कूल की जानकारी और शैक्षणिक सत्र प्रबंधित करें।",
    schoolInfo: "स्कूल की जानकारी",
    academicSessions: "शैक्षणिक सत्र",
    edit: "संपादित करें",
    save: "परिवर्तन सहेजें",
    cancel: "रद्द करें",
    refresh: "रिफ्रेश",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    schoolName: "स्कूल का नाम",
    code: "स्कूल कोड",
    email: "ईमेल",
    phone: "फोन",
    address: "पता",
    city: "शहर",
    state: "राज्य",
    country: "देश",
    postalCode: "पिन कोड",
    website: "वेबसाइट",
    affiliation: "मान्यता",
    principal: "प्रधानाचार्य",
    logoUrl: "लोगो URL",
    current: "वर्तमान",
    setCurrent: "वर्तमान करें",
    addSession: "सत्र जोड़ें",
    editSession: "सत्र संपादित करें",
    sessionName: "सत्र का नाम",
    startDate: "आरंभ तिथि",
    endDate: "समाप्ति तिथि",
    status: "स्थिति",
    actions: "कार्य",
    create: "बनाएँ",
    noSessions: "कोई शैक्षणिक सत्र नहीं मिला।",
    loading: "लोड हो रहा है...",
    error: "कुछ गलत हो गया।",
    saved: "परिवर्तन सफलतापूर्वक सहेजे गए।",
    sessionCreated: "शैक्षणिक सत्र सफलतापूर्वक बनाया गया।",
    sessionUpdated: "शैक्षणिक सत्र सफलतापूर्वक अपडेट किया गया।",
    currentUpdated: "वर्तमान शैक्षणिक सत्र अपडेट किया गया।",
    statusUpdated: "स्थिति अपडेट की गई।",
  },
};

const emptySession = {
  name: "",
  start_date: "",
  end_date: "",
};

function unwrap(response) {
  return response?.data ?? response;
}

export default function SchoolProfile({ language = "en" }) {
  const t = TEXT[language] || TEXT.en;

  const [school, setSchool] = useState(null);
  const [form, setForm] = useState({});
  const [sessions, setSessions] = useState([]);
  const [editing, setEditing] = useState(false);
  const [sessionModal, setSessionModal] = useState(null);
  const [sessionForm, setSessionForm] = useState(emptySession);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const currentSession = useMemo(
    () => sessions.find((item) => item.is_current),
    [sessions],
  );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const schoolsResponse = await getSchools({
        page: 1,
        page_size: 1,
        is_active: true,
      });

      const schools = unwrap(schoolsResponse);
      const firstSchool = Array.isArray(schools) ? schools[0] : null;

      if (!firstSchool) {
        setSchool(null);
        setSessions([]);
        return;
      }

      setSchool(firstSchool);
      setForm(firstSchool);

      const sessionsResponse = await getAcademicSessions(firstSchool.id, {
        page: 1,
        page_size: 100,
      });

      const sessionData = unwrap(sessionsResponse);
      setSessions(Array.isArray(sessionData) ? sessionData : []);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          t.error,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveSchool() {
    if (!school) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || "India",
        postal_code: form.postal_code || null,
        website: form.website || null,
        affiliation: form.affiliation || null,
        principal_name: form.principal_name || null,
        logo_url: form.logo_url || null,
      };

      const response = await updateSchool(school.id, payload);
      const updated = unwrap(response);

      setSchool(updated);
      setForm(updated);
      setEditing(false);
      setMessage(t.saved);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          t.error,
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSchoolStatus() {
    if (!school) return;

    try {
      const response = await updateSchoolStatus(
        school.id,
        !school.is_active,
      );
      const updated = unwrap(response);

      setSchool(updated);
      setForm(updated);
      setMessage(t.statusUpdated);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          t.error,
      );
    }
  }

  function openCreateSession() {
    setSessionForm(emptySession);
    setSessionModal({ mode: "create" });
  }

  function openEditSession(session) {
    setSessionForm({
      name: session.name,
      start_date: session.start_date,
      end_date: session.end_date,
    });
    setSessionModal({
      mode: "edit",
      id: session.id,
    });
  }

  async function saveSession() {
    if (!school) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (sessionModal.mode === "create") {
        await createAcademicSession(school.id, {
          school_id: school.id,
          ...sessionForm,
        });

        setMessage(t.sessionCreated);
      } else {
        await updateAcademicSession(sessionModal.id, sessionForm);
        setMessage(t.sessionUpdated);
      }

      setSessionModal(null);

      const response = await getAcademicSessions(school.id, {
        page: 1,
        page_size: 100,
      });

      const data = unwrap(response);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          t.error,
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeCurrent(sessionId) {
    try {
      await setCurrentAcademicSession(sessionId);

      const response = await getAcademicSessions(school.id, {
        page: 1,
        page_size: 100,
      });

      const data = unwrap(response);
      setSessions(Array.isArray(data) ? data : []);
      setMessage(t.currentUpdated);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          t.error,
      );
    }
  }

  async function toggleSessionStatus(session) {
    try {
      await updateAcademicSessionStatus(
        session.id,
        !session.is_active,
      );

      const response = await getAcademicSessions(school.id, {
        page: 1,
        page_size: 100,
      });

      const data = unwrap(response);
      setSessions(Array.isArray(data) ? data : []);
      setMessage(t.statusUpdated);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          t.error,
      );
    }
  }

  if (loading) {
    return <div className="page-loading">{t.loading}</div>;
  }

  if (!school) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <button onClick={loadData}>{t.refresh}</button>
        </div>

        <div className="empty-state">
          {t.error}: No school profile found.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <div className="page-actions">
          <button
            className="secondary-button"
            onClick={loadData}
          >
            {t.refresh}
          </button>

          {!editing && (
            <button
              className="primary-button"
              onClick={() => setEditing(true)}
            >
              {t.edit}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {message && <div className="alert success-alert">{message}</div>}

      <section className="content-card">
        <div className="card-header">
          <div>
            <h2>{t.schoolInfo}</h2>
            <span className={school.is_active ? "status active" : "status inactive"}>
              {school.is_active ? t.active : t.inactive}
            </span>
          </div>

          <button
            className="secondary-button"
            onClick={toggleSchoolStatus}
          >
            {school.is_active ? t.inactive : t.active}
          </button>
        </div>

        <div className="school-profile-grid">
          <div className="logo-panel">
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt={form.name || "School"}
                className="school-logo"
              />
            ) : (
              <div className="logo-placeholder">
                {form.name?.charAt(0)?.toUpperCase() || "S"}
              </div>
            )}
          </div>

          <div className="form-grid">
            <Field
              label={t.schoolName}
              value={form.name}
              disabled={!editing}
              onChange={(value) => updateField("name", value)}
            />

            <Field
              label={t.code}
              value={form.code}
              disabled
              onChange={() => {}}
            />

            <Field
              label={t.email}
              value={form.email}
              disabled={!editing}
              onChange={(value) => updateField("email", value)}
              type="email"
            />

            <Field
              label={t.phone}
              value={form.phone}
              disabled={!editing}
              onChange={(value) => updateField("phone", value)}
            />

            <Field
              label={t.city}
              value={form.city}
              disabled={!editing}
              onChange={(value) => updateField("city", value)}
            />

            <Field
              label={t.state}
              value={form.state}
              disabled={!editing}
              onChange={(value) => updateField("state", value)}
            />

            <Field
              label={t.country}
              value={form.country}
              disabled={!editing}
              onChange={(value) => updateField("country", value)}
            />

            <Field
              label={t.postalCode}
              value={form.postal_code}
              disabled={!editing}
              onChange={(value) => updateField("postal_code", value)}
            />

            <Field
              label={t.website}
              value={form.website}
              disabled={!editing}
              onChange={(value) => updateField("website", value)}
            />

            <Field
              label={t.affiliation}
              value={form.affiliation}
              disabled={!editing}
              onChange={(value) => updateField("affiliation", value)}
            />

            <Field
              label={t.principal}
              value={form.principal_name}
              disabled={!editing}
              onChange={(value) => updateField("principal_name", value)}
            />

            <Field
              label={t.logoUrl}
              value={form.logo_url}
              disabled={!editing}
              onChange={(value) => updateField("logo_url", value)}
            />

            <div className="field full-width">
              <label>{t.address}</label>
              <textarea
                value={form.address || ""}
                disabled={!editing}
                onChange={(event) =>
                  updateField("address", event.target.value)
                }
                rows={3}
              />
            </div>
          </div>
        </div>

        {editing && (
          <div className="form-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setForm(school);
                setEditing(false);
              }}
            >
              {t.cancel}
            </button>

            <button
              className="primary-button"
              disabled={saving}
              onClick={saveSchool}
            >
              {saving ? t.loading : t.save}
            </button>
          </div>
        )}
      </section>

      <section className="content-card">
        <div className="card-header">
          <div>
            <h2>{t.academicSessions}</h2>

            {currentSession && (
              <p className="current-session">
                {t.current}: <strong>{currentSession.name}</strong>
              </p>
            )}
          </div>

          <button
            className="primary-button"
            onClick={openCreateSession}
          >
            + {t.addSession}
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">{t.noSessions}</div>
        ) : (
          <div className="session-list">
            {sessions.map((session) => (
              <div className="session-row" key={session.id}>
                <div>
                  <div className="session-title">
                    {session.name}

                    {session.is_current && (
                      <span className="current-badge">
                        {t.current}
                      </span>
                    )}
                  </div>

                  <div className="session-dates">
                    {session.start_date} → {session.end_date}
                  </div>
                </div>

                <div className="session-actions">
                  <span
                    className={
                      session.is_active
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    {session.is_active ? t.active : t.inactive}
                  </span>

                  <button
                    className="secondary-button"
                    onClick={() => openEditSession(session)}
                  >
                    {t.edit}
                  </button>

                  {!session.is_current && session.is_active && (
                    <button
                      className="primary-button"
                      onClick={() => makeCurrent(session.id)}
                    >
                      {t.setCurrent}
                    </button>
                  )}

                  {!session.is_current && (
                    <button
                      className="secondary-button"
                      onClick={() => toggleSessionStatus(session)}
                    >
                      {session.is_active ? t.inactive : t.active}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {sessionModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="card-header">
              <h2>
                {sessionModal.mode === "create"
                  ? t.addSession
                  : t.editSession}
              </h2>

              <button
                className="icon-button"
                onClick={() => setSessionModal(null)}
              >
                ×
              </button>
            </div>

            <div className="form-grid">
              <Field
                label={t.sessionName}
                value={sessionForm.name}
                onChange={(value) =>
                  setSessionForm((current) => ({
                    ...current,
                    name: value,
                  }))
                }
              />

              <Field
                label={t.startDate}
                type="date"
                value={sessionForm.start_date}
                onChange={(value) =>
                  setSessionForm((current) => ({
                    ...current,
                    start_date: value,
                  }))
                }
              />

              <Field
                label={t.endDate}
                type="date"
                value={sessionForm.end_date}
                onChange={(value) =>
                  setSessionForm((current) => ({
                    ...current,
                    end_date: value,
                  }))
                }
              />
            </div>

            <div className="form-actions">
              <button
                className="secondary-button"
                onClick={() => setSessionModal(null)}
              >
                {t.cancel}
              </button>

              <button
                className="primary-button"
                disabled={saving}
                onClick={saveSession}
              >
                {saving
                  ? t.loading
                  : sessionModal.mode === "create"
                    ? t.create
                    : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <input
        type={type}
        value={value || ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}