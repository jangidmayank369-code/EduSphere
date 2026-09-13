import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getStudents,
  getStudent,
  updateStudentStatus,
} from "../api/students";

import "../student-dashboard.css";

const TEXT = {
  EN: {
    title: "Student 360",
    subtitle:
      "Complete student profile, academics, attendance, fees and records.",
    students: "Students",
    search: "Search students...",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    noStudents: "No students found.",
    selectStudent: "Select a student",
    selectStudentDesc:
      "Choose a student from the list to view their complete school profile.",
    overview: "Overview",
    academic: "Academic",
    attendance: "Attendance",
    fees: "Fees",
    exams: "Exams",
    parents: "Parents",
    documents: "Documents",
    communication: "Communication",
    admissionNo: "Admission No.",
    rollNo: "Roll No.",
    class: "Class",
    section: "Section",
    dob: "Date of Birth",
    gender: "Gender",
    bloodGroup: "Blood Group",
    phone: "Phone",
    email: "Email",
    address: "Address",
    status: "Status",
    session: "Academic Session",
    studentInfo: "Student Information",
    contact: "Contact Information",
    feePlan: "Fee Management",
    feePlanDesc:
      "Manage student fee plan, installments and payments.",
    openFees: "Open Fees",
    attendanceDesc:
      "Attendance history and patterns.",
    viewAttendance: "View Attendance",
    academicDesc:
      "Class, section and academic mapping.",
    viewAcademic: "View Academic",
    examDesc:
      "Examinations, marks and results.",
    viewExams: "View Exams",
    parentsDesc:
      "Parents, guardians and emergency contacts.",
    viewParents: "View Parents",
    documentsDesc:
      "Student documents and verification.",
    viewDocuments: "View Documents",
    communicationDesc:
      "Student communication and notices.",
    viewCommunication: "View Communication",
    deactivate: "Deactivate",
    activate: "Activate",
    loading: "Loading students...",
    loadingStudent: "Loading student...",
    failed: "Unable to load student data.",
    notAvailable: "Not available",
  },

  HI: {
    title: "स्टूडेंट 360",
    subtitle:
      "विद्यार्थी की प्रोफाइल, अकादमिक, उपस्थिति, फीस और रिकॉर्ड एक जगह।",
    students: "विद्यार्थी",
    search: "विद्यार्थी खोजें...",
    all: "सभी",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    noStudents: "कोई विद्यार्थी नहीं मिला।",
    selectStudent: "विद्यार्थी चुनें",
    selectStudentDesc:
      "पूरी स्कूल प्रोफाइल देखने के लिए विद्यार्थी चुनें।",
    overview: "ओवरव्यू",
    academic: "अकादमिक",
    attendance: "उपस्थिति",
    fees: "फीस",
    exams: "परीक्षा",
    parents: "अभिभावक",
    documents: "दस्तावेज़",
    communication: "संचार",
    admissionNo: "प्रवेश संख्या",
    rollNo: "रोल नंबर",
    class: "कक्षा",
    section: "सेक्शन",
    dob: "जन्म तिथि",
    gender: "लिंग",
    bloodGroup: "ब्लड ग्रुप",
    phone: "फोन",
    email: "ईमेल",
    address: "पता",
    status: "स्थिति",
    session: "अकादमिक सत्र",
    studentInfo: "विद्यार्थी जानकारी",
    contact: "संपर्क जानकारी",
    feePlan: "फीस मैनेजमेंट",
    feePlanDesc:
      "विद्यार्थी फीस प्लान, किस्तें और भुगतान प्रबंधित करें।",
    openFees: "फीस खोलें",
    attendanceDesc:
      "उपस्थिति इतिहास और पैटर्न।",
    viewAttendance: "उपस्थिति देखें",
    academicDesc:
      "कक्षा, सेक्शन और अकादमिक मैपिंग।",
    viewAcademic: "अकादमिक देखें",
    examDesc:
      "परीक्षा, अंक और परिणाम।",
    viewExams: "परीक्षा देखें",
    parentsDesc:
      "अभिभावक, संरक्षक और आपातकालीन संपर्क।",
    viewParents: "अभिभावक देखें",
    documentsDesc:
      "विद्यार्थी दस्तावेज़ और सत्यापन।",
    viewDocuments: "दस्तावेज़ देखें",
    communicationDesc:
      "विद्यार्थी से संबंधित संचार और सूचनाएं।",
    viewCommunication: "संचार देखें",
    deactivate: "निष्क्रिय करें",
    activate: "सक्रिय करें",
    loading: "विद्यार्थी लोड हो रहे हैं...",
    loadingStudent: "विद्यार्थी लोड हो रहा है...",
    failed: "विद्यार्थी डेटा लोड नहीं हो सका।",
    notAvailable: "उपलब्ध नहीं",
  },
};

function getError(error, fallback) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fullName(student) {
  return [
    student?.first_name,
    student?.middle_name,
    student?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

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

    student: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c.7-3.4 3.1-5.2 7-5.2s6.3 1.8 7 5.2" />
      </>
    ),

    academic: (
      <>
        <path d="m3 10 9-6 9 6" />
        <path d="M5 10v8h14v-8" />
        <path d="M9 18v-5h6v5" />
        <path d="M3 21h18" />
      </>
    ),

    attendance: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),

    fees: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5Z" />
        <path d="M4 7h14.5A2.5 2.5 0 0 1 21 9.5v5H17a2.5 2.5 0 0 1 0-5h4" />
        <path d="M17 12h.01" />
      </>
    ),

    exam: (
      <>
        <path d="M6 3h12v18H6z" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </>
    ),

    parents: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.2" />
        <path d="M3 20c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5" />
        <path d="M14.5 15.5c2.7-.3 5.5 1.5 6 4.5" />
      </>
    ),

    document: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5M10 12h5M10 16h5" />
      </>
    ),

    message: (
      <>
        <path d="M4 5h16v11H8l-4 4z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),

    phone: (
      <>
        <path d="M6 3h3l2 5-2 1.5c1 2.1 2.4 3.5 4.5 4.5L15 12l5 2v3c0 2-1.6 3-3.5 3C9.6 20 4 14.4 4 7.5 4 5.6 5 3 6 3Z" />
      </>
    ),

    mail: (
      <>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        />
        <path d="m4 7 8 6 8-6" />
      </>
    ),

    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),

    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),

    power: (
      <>
        <path d="M12 2v10" />
        <path d="M18.4 5.6a8 8 0 1 1-12.8 0" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
  };

  return (
    <svg {...common}>
      {icons[name] || icons.student}
    </svg>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState(
    () =>
      localStorage.getItem(
        "edusphere-language",
      ) || "EN",
  );

  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [student, setStudent] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("overview");

  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const t = TEXT[language] || TEXT.EN;

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const next =
        event.detail === "HI" ||
        event.detail === "EN"
          ? event.detail
          : localStorage.getItem(
              "edusphere-language",
            ) || "EN";

      setLanguage(next);
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

  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      /*
       * students.js expects camelCase parameter names.
       * It converts them to the backend snake_case query
       * parameters internally.
       */
      const list = await getStudents({
        schoolId: 1,
        academicSessionId: 1,
        page: 1,
        pageSize: 100,
      });

      const safeList = Array.isArray(list)
        ? list
        : [];

      setStudents(safeList);

      if (safeList.length > 0) {
        setSelectedId((current) => {
          if (
            current &&
            safeList.some(
              (item) => item.id === current,
            )
          ) {
            return current;
          }

          return safeList[0].id;
        });
      } else {
        setSelectedId(null);
        setStudent(null);
      }
    } catch (err) {
      setError(getError(err, t.failed));
    } finally {
      setLoading(false);
    }
  }

  async function loadStudent(studentId) {
    if (!studentId) return;

    try {
      setStudentLoading(true);
      setError("");

      const data = await getStudent(studentId);

      setStudent(data);
    } catch (err) {
      setError(getError(err, t.failed));
      setStudent(null);
    } finally {
      setStudentLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadStudent(selectedId);
    }
  }, [selectedId]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" &&
          item.is_active !== false) ||
        (filter === "inactive" &&
          item.is_active === false);

      if (!matchesFilter) return false;

      if (!query) return true;

      const name = fullName(item).toLowerCase();

      return (
        name.includes(query) ||
        String(
          item.admission_number || "",
        )
          .toLowerCase()
          .includes(query) ||
        String(item.roll_number || "")
          .toLowerCase()
          .includes(query) ||
        String(item.phone || "")
          .toLowerCase()
          .includes(query) ||
        String(item.email || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [students, search, filter]);

  const activeCount = students.filter(
    (item) => item.is_active !== false,
  ).length;

  const inactiveCount =
    students.length - activeCount;

  async function toggleStatus() {
    if (!student?.id) return;

    try {
      setSaving(true);
      setError("");

      const nextStatus =
        student.is_active === false;

      const updated =
        await updateStudentStatus(
          student.id,
          nextStatus,
        );

      setStudent(updated);

      setStudents((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );
    } catch (err) {
      setError(getError(err, t.failed));
    } finally {
      setSaving(false);
    }
  }

  function openTab(nextTab) {
    setTab(nextTab);

    if (nextTab === "fees") {
      navigate("/fees");
    }
  }

  const studentName = fullName(student);

  return (
    <div className="student-page">
      <header className="student-page-header">
        <div>
          <div className="student-kicker">
            STUDENT CORE · 360
          </div>

          <h1>{t.title}</h1>

          <p>{t.subtitle}</p>
        </div>

        <div className="student-header-stat">
          <strong>{students.length}</strong>
          <span>{t.students}</span>
        </div>
      </header>

      {error && (
        <div className="student-alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <div className="student-workspace">
        <aside className="student-list-panel">
          <div className="student-list-head">
            <div>
              <strong>{t.students}</strong>

              <span>
                {activeCount}{" "}
                {t.active.toLowerCase()}
              </span>
            </div>

            <span className="student-total">
              {students.length}
            </span>
          </div>

          <div className="student-search">
            <Icon name="search" size={17} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={t.search}
            />
          </div>

          <div className="student-filters">
            {[
              [
                "all",
                t.all,
                students.length,
              ],
              [
                "active",
                t.active,
                activeCount,
              ],
              [
                "inactive",
                t.inactive,
                inactiveCount,
              ],
            ].map(
              ([value, label, count]) => (
                <button
                  type="button"
                  key={value}
                  className={
                    filter === value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(value)
                  }
                >
                  {label}
                  <span>{count}</span>
                </button>
              ),
            )}
          </div>

          <div className="student-list">
            {loading ? (
              <div className="student-list-loading">
                {t.loading}
              </div>
            ) : filteredStudents.length ===
              0 ? (
              <div className="student-list-empty">
                {t.noStudents}
              </div>
            ) : (
              filteredStudents.map((item) => {
                const active =
                  item.id === selectedId;

                const name =
                  fullName(item) ||
                  t.notAvailable;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`student-list-item ${
                      active ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(item.id);
                      setTab("overview");
                    }}
                  >
                    <span className="student-list-avatar">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt=""
                        />
                      ) : (
                        <Icon
                          name="student"
                          size={20}
                        />
                      )}
                    </span>

                    <span className="student-list-info">
                      <strong>{name}</strong>

                      <small>
                        {item.admission_number ||
                          "—"}
                      </small>
                    </span>

                    <span
                      className={`student-list-status ${
                        item.is_active === false
                          ? "inactive"
                          : ""
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="student-detail">
          {studentLoading ? (
            <div className="student-detail-loading">
              <div className="student-loader" />
              <span>
                {t.loadingStudent}
              </span>
            </div>
          ) : !student ? (
            <div className="student-detail-empty">
              <div className="student-empty-icon">
                <Icon
                  name="student"
                  size={28}
                />
              </div>

              <h2>{t.selectStudent}</h2>

              <p>{t.selectStudentDesc}</p>
            </div>
          ) : (
            <>
              <section className="student-profile-hero">
                <div className="student-profile-main">
                  <div className="student-profile-photo">
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt={studentName}
                      />
                    ) : (
                      <Icon
                        name="student"
                        size={34}
                      />
                    )}
                  </div>

                  <div className="student-profile-copy">
                    <div className="student-profile-id">
                      {student.admission_number ||
                        "—"}
                    </div>

                    <h2>
                      {studentName ||
                        t.notAvailable}
                    </h2>

                    <div className="student-profile-meta">
                      <span>
                        {t.class}:{" "}
                        {student.class_name ||
                          "—"}
                      </span>

                      <span>
                        {t.section}:{" "}
                        {student.section ||
                          "—"}
                      </span>

                      <span>
                        {t.rollNo}:{" "}
                        {student.roll_number ||
                          "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="student-profile-actions">
                  <button
                    type="button"
                    className="student-action-btn"
                    onClick={() =>
                      document
                        .querySelector(
                          ".student-overview-card",
                        )
                        ?.scrollIntoView({
                          behavior: "smooth",
                        })
                    }
                  >
                    <Icon
                      name="edit"
                      size={16}
                    />
                    {t.overview}
                  </button>

                  <button
                    type="button"
                    className="student-action-btn secondary"
                    onClick={toggleStatus}
                    disabled={saving}
                  >
                    <Icon
                      name="power"
                      size={16}
                    />

                    {student.is_active ===
                    false
                      ? t.activate
                      : t.deactivate}
                  </button>
                </div>
              </section>

              <nav className="student-tabs">
                {[
                  [
                    "overview",
                    t.overview,
                  ],
                  [
                    "academic",
                    t.academic,
                  ],
                  [
                    "attendance",
                    t.attendance,
                  ],
                  ["fees", t.fees],
                  ["exams", t.exams],
                  [
                    "parents",
                    t.parents,
                  ],
                  [
                    "documents",
                    t.documents,
                  ],
                  [
                    "communication",
                    t.communication,
                  ],
                ].map(
                  ([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={
                        tab === value
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        openTab(value)
                      }
                    >
                      {label}
                    </button>
                  ),
                )}
              </nav>

              {tab === "overview" && (
                <>
                  <section className="student-overview-card">
                    <div className="student-section-heading">
                      <div>
                        <span>
                          PROFILE
                        </span>

                        <h3>
                          {t.studentInfo}
                        </h3>
                      </div>
                    </div>

                    <div className="student-info-grid">
                      <Info
                        label={t.admissionNo}
                        value={
                          student.admission_number
                        }
                      />

                      <Info
                        label={t.rollNo}
                        value={
                          student.roll_number
                        }
                      />

                      <Info
                        label={t.class}
                        value={
                          student.class_name
                        }
                      />

                      <Info
                        label={t.section}
                        value={
                          student.section
                        }
                      />

                      <Info
                        label={t.dob}
                        value={formatDate(
                          student.dob ??
                            student.date_of_birth,
                        )}
                      />

                      <Info
                        label={t.gender}
                        value={
                          student.gender
                        }
                      />

                      <Info
                        label={t.bloodGroup}
                        value={
                          student.blood_group
                        }
                      />

                      <Info
                        label={t.session}
                        value={
                          student.academic_session_name
                        }
                      />

                      <Info
                        label={t.status}
                        value={
                          student.is_active ===
                          false
                            ? t.inactive
                            : t.active
                        }
                      />
                    </div>
                  </section>

                  <section className="student-section-heading student-contact-heading">
                    <div>
                      <span>
                        CONTACT
                      </span>

                      <h3>
                        {t.contact}
                      </h3>
                    </div>
                  </section>

                  <div className="student-contact-grid">
                    <ContactCard
                      icon="phone"
                      label={t.phone}
                      value={
                        student.phone
                      }
                    />

                    <ContactCard
                      icon="mail"
                      label={t.email}
                      value={
                        student.email
                      }
                    />

                    <ContactCard
                      icon="location"
                      label={t.address}
                      value={[
                        student.address,
                        student.city,
                        student.state,
                        student.postal_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    />
                  </div>

                  <section className="student-module-grid">
                    <ModuleCard
                      icon="academic"
                      title={t.academic}
                      description={
                        t.academicDesc
                      }
                      action={
                        t.viewAcademic
                      }
                      onClick={() =>
                        setTab(
                          "academic",
                        )
                      }
                    />

                    <ModuleCard
                      icon="attendance"
                      title={
                        t.attendance
                      }
                      description={
                        t.attendanceDesc
                      }
                      action={
                        t.viewAttendance
                      }
                      onClick={() =>
                        setTab(
                          "attendance",
                        )
                      }
                    />

                    <ModuleCard
                      icon="fees"
                      title={
                        t.feePlan
                      }
                      description={
                        t.feePlanDesc
                      }
                      action={
                        t.openFees
                      }
                      onClick={() =>
                        navigate("/fees")
                      }
                    />

                    <ModuleCard
                      icon="exam"
                      title={t.exams}
                      description={
                        t.examDesc
                      }
                      action={
                        t.viewExams
                      }
                      onClick={() =>
                        setTab("exams")
                      }
                    />

                    <ModuleCard
                      icon="parents"
                      title={
                        t.parents
                      }
                      description={
                        t.parentsDesc
                      }
                      action={
                        t.viewParents
                      }
                      onClick={() =>
                        setTab(
                          "parents",
                        )
                      }
                    />

                    <ModuleCard
                      icon="document"
                      title={
                        t.documents
                      }
                      description={
                        t.documentsDesc
                      }
                      action={
                        t.viewDocuments
                      }
                      onClick={() =>
                        setTab(
                          "documents",
                        )
                      }
                    />

                    <ModuleCard
                      icon="message"
                      title={
                        t.communication
                      }
                      description={
                        t.communicationDesc
                      }
                      action={
                        t.viewCommunication
                      }
                      onClick={() =>
                        setTab(
                          "communication",
                        )
                      }
                    />
                  </section>
                </>
              )}

              {tab !== "overview" &&
                tab !== "fees" && (
                  <section className="student-overview-card">
                    <div className="student-section-heading">
                      <div>
                        <span>
                          STUDENT 360
                        </span>

                        <h3>
                          {tab ===
                            "academic" &&
                            t.academic}

                          {tab ===
                            "attendance" &&
                            t.attendance}

                          {tab ===
                            "exams" &&
                            t.exams}

                          {tab ===
                            "parents" &&
                            t.parents}

                          {tab ===
                            "documents" &&
                            t.documents}

                          {tab ===
                            "communication" &&
                            t.communication}
                        </h3>
                      </div>
                    </div>

                    <div className="student-detail-empty">
                      <div className="student-empty-icon">
                        <Icon
                          name={
                            tab ===
                            "academic"
                              ? "academic"
                              : tab ===
                                "attendance"
                              ? "attendance"
                              : tab ===
                                "exams"
                              ? "exam"
                              : tab ===
                                "parents"
                              ? "parents"
                              : tab ===
                                "documents"
                              ? "document"
                              : "message"
                          }
                          size={28}
                        />
                      </div>

                      <h2>
                        {t.notAvailable}
                      </h2>

                      <p>
                        This workspace will
                        use its dedicated
                        backend module when
                        that roadmap module
                        is implemented.
                      </p>
                    </div>
                  </section>
                )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="student-info">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function ContactCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="student-contact-card">
      <span className="student-contact-icon">
        <Icon name={icon} size={17} />
      </span>

      <div>
        <span>{label}</span>
        <strong>{value || "—"}</strong>
      </div>
    </div>
  );
}

function ModuleCard({
  icon,
  title,
  description,
  action,
  onClick,
}) {
  return (
    <button
      type="button"
      className="student-module-card"
      onClick={onClick}
    >
      <span className="student-module-icon">
        <Icon name={icon} size={19} />
      </span>

      <span className="student-module-content">
        <strong>{title}</strong>
        <small>{description}</small>
        <em>{action}</em>
      </span>

      <Icon name="arrow" size={17} />
    </button>
  );
}