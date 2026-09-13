import { useEffect, useMemo, useState } from "react";
import {
  getStudents,
  getStudent,
  getStudentParents,
  updateStudentStatus,
} from "../api/students";
import StudentForm from "../components/students/StudentForm";
import "../student-dashboard.css";

const TEXT = {
  en: {
    title: "Student 360",
    subtitle: "Complete student workspace",
    search: "Search student...",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    refresh: "Refresh",
    addStudent: "Add Student",
    editStudent: "Edit Student",
    loading: "Loading students...",
    loadingStudent: "Loading student...",
    loadingParents: "Loading parents...",
    retry: "Retry",
    noStudents: "No students found",
    noStudentsHint: "Try changing the search or status filter.",
    noSelection: "Select a student",
    noSelectionHint:
      "Choose a student from the list to view the complete profile.",
    overview: "Overview",
    academic: "Academic",
    attendance: "Attendance",
    fees: "Fees",
    exams: "Exams",
    parents: "Parents",
    documents: "Documents",
    communication: "Communication",
    profile: "Profile",
    studentInfo: "Student Information",
    contactInfo: "Contact Information",
    quickActions: "Quick Actions",
    admissionNo: "Admission No.",
    rollNo: "Roll No.",
    dateOfBirth: "Date of Birth",
    gender: "Gender",
    bloodGroup: "Blood Group",
    phone: "Phone",
    email: "Email",
    address: "Address",
    city: "City",
    state: "State",
    country: "Country",
    postalCode: "Postal Code",
    class: "Class",
    section: "Section",
    status: "Status",
    openFees: "Open Fee Management",
    manageParents: "Manage Parents",
    viewDocuments: "View Documents",
    comingSoon: "This workspace will connect to its backend module.",
    noValue: "—",
    noParents: "No parents linked",
    noParentsHint:
      "Parent relationships can be added through the parent management workflow.",
    relationship: "Relationship",
    primary: "Primary",
    emergency: "Emergency",
    activate: "Activate",
    deactivate: "Deactivate",
    confirmActivate: "Activate this student?",
    confirmDeactivate: "Deactivate this student?",
    updateFailed: "Unable to update student status.",
    loadFailed: "Unable to load students.",
    studentLoadFailed: "Unable to load student details.",
    parentLoadFailed: "Unable to load parent details.",
    activeStudent: "Active student",
    inactiveStudent: "Inactive student",
    records: "Records",
    cancel: "Cancel",
  },

  hi: {
    title: "स्टूडेंट 360",
    subtitle: "विद्यार्थी की पूरी जानकारी और कार्यक्षेत्र",
    search: "विद्यार्थी खोजें...",
    all: "सभी",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    refresh: "रिफ्रेश",
    addStudent: "विद्यार्थी जोड़ें",
    editStudent: "विद्यार्थी संपादित करें",
    loading: "विद्यार्थी लोड हो रहे हैं...",
    loadingStudent: "विद्यार्थी की जानकारी लोड हो रही है...",
    loadingParents: "अभिभावक लोड हो रहे हैं...",
    retry: "फिर प्रयास करें",
    noStudents: "कोई विद्यार्थी नहीं मिला",
    noStudentsHint: "सर्च या स्टेटस फ़िल्टर बदलकर देखें।",
    noSelection: "विद्यार्थी चुनें",
    noSelectionHint:
      "पूरी प्रोफ़ाइल देखने के लिए सूची से विद्यार्थी चुनें।",
    overview: "ओवरव्यू",
    academic: "शैक्षणिक",
    attendance: "उपस्थिति",
    fees: "फीस",
    exams: "परीक्षा",
    parents: "अभिभावक",
    documents: "दस्तावेज़",
    communication: "संचार",
    profile: "प्रोफ़ाइल",
    studentInfo: "विद्यार्थी जानकारी",
    contactInfo: "संपर्क जानकारी",
    quickActions: "त्वरित कार्य",
    admissionNo: "प्रवेश संख्या",
    rollNo: "रोल नंबर",
    dateOfBirth: "जन्म तिथि",
    gender: "लिंग",
    bloodGroup: "ब्लड ग्रुप",
    phone: "फोन",
    email: "ईमेल",
    address: "पता",
    city: "शहर",
    state: "राज्य",
    country: "देश",
    postalCode: "पिन कोड",
    class: "कक्षा",
    section: "सेक्शन",
    status: "स्थिति",
    openFees: "फीस मैनेजमेंट खोलें",
    manageParents: "अभिभावक प्रबंधन",
    viewDocuments: "दस्तावेज़ देखें",
    comingSoon: "यह कार्यक्षेत्र संबंधित बैकएंड मॉड्यूल से कनेक्ट होगा।",
    noValue: "—",
    noParents: "कोई अभिभावक लिंक नहीं है",
    noParentsHint:
      "अभिभावक प्रबंधन वर्कफ़्लो से संबंध जोड़े जा सकते हैं।",
    relationship: "संबंध",
    primary: "मुख्य",
    emergency: "आपातकालीन",
    activate: "सक्रिय करें",
    deactivate: "निष्क्रिय करें",
    confirmActivate: "क्या इस विद्यार्थी को सक्रिय करना है?",
    confirmDeactivate: "क्या इस विद्यार्थी को निष्क्रिय करना है?",
    updateFailed: "विद्यार्थी की स्थिति अपडेट नहीं हो सकी।",
    loadFailed: "विद्यार्थियों को लोड नहीं किया जा सका।",
    studentLoadFailed: "विद्यार्थी की जानकारी लोड नहीं हो सकी।",
    parentLoadFailed: "अभिभावक की जानकारी लोड नहीं हो सकी।",
    activeStudent: "सक्रिय विद्यार्थी",
    inactiveStudent: "निष्क्रिय विद्यार्थी",
    records: "रिकॉर्ड",
    cancel: "रद्द करें",
  },
};

const TABS = [
  { key: "overview", icon: "◈" },
  { key: "academic", icon: "▣" },
  { key: "attendance", icon: "✓" },
  { key: "fees", icon: "₹" },
  { key: "exams", icon: "◇" },
  { key: "parents", icon: "♧" },
  { key: "documents", icon: "▤" },
  { key: "communication", icon: "✉" },
];

function getFullName(student) {
  if (!student) {
    return "";
  }

  return [
    student.first_name,
    student.middle_name,
    student.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getInitials(student) {
  const first = student?.first_name?.trim()?.[0] || "";
  const last = student?.last_name?.trim()?.[0] || "";

  return `${first}${last}`.toUpperCase() || "?";
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function InfoItem({ label, value }) {
  return (
    <div className="student-info-item">
      <span className="student-info-label">{label}</span>
      <strong className="student-info-value">{value || "—"}</strong>
    </div>
  );
}

function WorkspacePlaceholder({ title, text }) {
  return (
    <section className="student-workspace-card">
      <div className="student-workspace-card-header">
        <div>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      </div>

      <div className="student-module-empty">
        <div className="student-module-empty-icon">◇</div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </section>
  );
}

export default function StudentDashboard() {
  const language =
    localStorage.getItem("edusphere-language") === "hi"
      ? "hi"
      : "en";

  const text = TEXT[language];

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [parents, setParents] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);

  const [studentsError, setStudentsError] = useState("");
  const [studentError, setStudentError] = useState("");
  const [parentError, setParentError] = useState("");

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  async function loadStudents(preferredStudentId = null) {
    setLoadingStudents(true);
    setStudentsError("");

    try {
      const data = await getStudents({
        schoolId: 1,
        academicSessionId: 1,
        page: 1,
        pageSize: 100,
      });

      const list = Array.isArray(data) ? data : [];

      setStudents(list);

      if (preferredStudentId) {
        const exists = list.some(
          (student) => student.id === preferredStudentId,
        );

        if (exists) {
          setSelectedStudentId(preferredStudentId);
          return;
        }
      }

      if (selectedStudentId) {
        const exists = list.some(
          (student) => student.id === selectedStudentId,
        );

        if (exists) {
          return;
        }
      }

      setSelectedStudentId(list[0]?.id ?? null);
    } catch (error) {
      console.error("Student list error:", error);
      setStudentsError(text.loadFailed);
    } finally {
      setLoadingStudents(false);
    }
  }

  async function loadStudent(studentId) {
    if (!studentId) {
      setSelectedStudent(null);
      setParents([]);
      return;
    }

    setLoadingStudent(true);
    setStudentError("");
    setParentError("");
    setParents([]);

    try {
      const student = await getStudent(studentId);

      setSelectedStudent(student);

      setLoadingParents(true);

      try {
        const parentData = await getStudentParents(studentId);

        setParents(
          Array.isArray(parentData) ? parentData : [],
        );
      } catch (error) {
        console.error("Parent loading error:", error);
        setParentError(text.parentLoadFailed);
      } finally {
        setLoadingParents(false);
      }
    } catch (error) {
      console.error("Student detail error:", error);
      setStudentError(text.studentLoadFailed);
      setSelectedStudent(null);
    } finally {
      setLoadingStudent(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudent(selectedStudentId);
    }
  }, [selectedStudentId]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      let matchesStatus = true;

      if (statusFilter === "active") {
        matchesStatus = student.is_active === true;
      }

      if (statusFilter === "inactive") {
        matchesStatus = student.is_active === false;
      }

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        student.admission_number,
        student.roll_number,
        student.first_name,
        student.middle_name,
        student.last_name,
        student.phone,
        student.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [students, search, statusFilter]);

  function openCreateForm() {
    setEditingStudent(null);
    setShowStudentForm(true);
  }

  function openEditForm() {
    if (!selectedStudent) {
      return;
    }

    setEditingStudent(selectedStudent);
    setShowStudentForm(true);
  }

  async function handleStudentSaved(savedStudent) {
    setShowStudentForm(false);
    setEditingStudent(null);

    const savedId = savedStudent?.id ?? null;

    await loadStudents(savedId);

    if (savedId) {
      setSelectedStudentId(savedId);
    }
  }

  function closeStudentForm() {
    if (showStudentForm) {
      setShowStudentForm(false);
      setEditingStudent(null);
    }
  }

  async function handleStatusChange() {
    if (!selectedStudent || statusUpdating) {
      return;
    }

    const nextStatus = !selectedStudent.is_active;

    const confirmed = window.confirm(
      nextStatus
        ? text.confirmActivate
        : text.confirmDeactivate,
    );

    if (!confirmed) {
      return;
    }

    setStatusUpdating(true);

    try {
      const updated = await updateStudentStatus(
        selectedStudent.id,
        nextStatus,
      );

      const nextStudent = updated || {
        ...selectedStudent,
        is_active: nextStatus,
        status: nextStatus ? "active" : "inactive",
      };

      setSelectedStudent(nextStudent);

      setStudents((current) =>
        current.map((student) => {
          if (student.id !== selectedStudent.id) {
            return student;
          }

          return {
            ...student,
            ...nextStudent,
            is_active: nextStatus,
            status: nextStatus ? "active" : "inactive",
          };
        }),
      );
    } catch (error) {
      console.error("Student status update error:", error);
      window.alert(text.updateFailed);
    } finally {
      setStatusUpdating(false);
    }
  }

  function openFees() {
    window.history.pushState({}, "", "/fees");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function selectStudent(studentId) {
    setSelectedStudentId(studentId);
    setActiveTab("overview");
    setShowStudentForm(false);
    setEditingStudent(null);
  }

  const fullName = getFullName(selectedStudent);

  return (
    <main className="student-dashboard-page">
      <header className="student-page-header">
        <div>
          <div className="student-page-eyebrow">EDUSPHERE</div>

          <h1>{text.title}</h1>

          <p>{text.subtitle}</p>
        </div>

        <div className="student-page-header-actions">
          <button
            type="button"
            className="student-secondary-button"
            onClick={loadStudents}
            disabled={loadingStudents}
          >
            ↻ {text.refresh}
          </button>

          <button
            type="button"
            className="student-primary-button"
            onClick={openCreateForm}
          >
            + {text.addStudent}
          </button>
        </div>
      </header>

      {showStudentForm && (
        <div className="student-form-overlay">
          <div className="student-form-modal">
            <StudentForm
              student={editingStudent}
              onSuccess={handleStudentSaved}
              onCancel={closeStudentForm}
            />
          </div>
        </div>
      )}

      <section className="student-dashboard-layout">
        <aside className="student-list-panel">
          <div className="student-list-header">
            <div>
              <h2>{text.records}</h2>
              <span>{students.length}</span>
            </div>
          </div>

          <div className="student-search-box">
            <span>⌕</span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={text.search}
            />
          </div>

          <div className="student-status-filter">
            <button
              type="button"
              className={
                statusFilter === "all"
                  ? "student-filter active"
                  : "student-filter"
              }
              onClick={() => setStatusFilter("all")}
            >
              {text.all}
            </button>

            <button
              type="button"
              className={
                statusFilter === "active"
                  ? "student-filter active"
                  : "student-filter"
              }
              onClick={() => setStatusFilter("active")}
            >
              {text.active}
            </button>

            <button
              type="button"
              className={
                statusFilter === "inactive"
                  ? "student-filter active"
                  : "student-filter"
              }
              onClick={() => setStatusFilter("inactive")}
            >
              {text.inactive}
            </button>
          </div>

          <div className="student-list">
            {loadingStudents && (
              <div className="student-list-state">
                <span className="student-spinner" />
                <p>{text.loading}</p>
              </div>
            )}

            {!loadingStudents && studentsError && (
              <div className="student-list-state">
                <strong>{studentsError}</strong>

                <button
                  type="button"
                  onClick={loadStudents}
                >
                  {text.retry}
                </button>
              </div>
            )}

            {!loadingStudents &&
              !studentsError &&
              filteredStudents.length === 0 && (
                <div className="student-list-state">
                  <strong>{text.noStudents}</strong>
                  <p>{text.noStudentsHint}</p>
                </div>
              )}

            {!loadingStudents &&
              !studentsError &&
              filteredStudents.length > 0 &&
              filteredStudents.map((student) => {
                const selected =
                  student.id === selectedStudentId;

                const name = getFullName(student);

                return (
                  <button
                    type="button"
                    key={student.id}
                    className={
                      selected
                        ? "student-list-item selected"
                        : "student-list-item"
                    }
                    onClick={() =>
                      selectStudent(student.id)
                    }
                  >
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt={name}
                        className="student-list-avatar"
                      />
                    ) : (
                      <span className="student-list-avatar student-list-avatar-fallback">
                        {getInitials(student)}
                      </span>
                    )}

                    <span className="student-list-content">
                      <strong>
                        {name || text.noValue}
                      </strong>

                      <small>
                        {student.admission_number ||
                          text.noValue}
                      </small>

                      <small>
                        {student.roll_number
                          ? `${text.rollNo}: ${student.roll_number}`
                          : text.noValue}
                      </small>
                    </span>

                    <span
                      className={
                        student.is_active
                          ? "student-status-dot active"
                          : "student-status-dot inactive"
                      }
                    />
                  </button>
                );
              })}
          </div>
        </aside>

        <section className="student-detail-panel">
          {!selectedStudentId && (
            <div className="student-detail-empty">
              <div className="student-detail-empty-icon">
                ◈
              </div>

              <h2>{text.noSelection}</h2>

              <p>{text.noSelectionHint}</p>

              <button
                type="button"
                className="student-primary-button"
                onClick={openCreateForm}
              >
                + {text.addStudent}
              </button>
            </div>
          )}

          {selectedStudentId && loadingStudent && (
            <div className="student-detail-empty">
              <span className="student-spinner" />
              <h2>{text.loadingStudent}</h2>
            </div>
          )}

          {selectedStudentId &&
            !loadingStudent &&
            studentError && (
              <div className="student-detail-empty">
                <h2>{studentError}</h2>

                <button
                  type="button"
                  className="student-primary-button"
                  onClick={() =>
                    loadStudent(selectedStudentId)
                  }
                >
                  {text.retry}
                </button>
              </div>
            )}

          {selectedStudentId &&
            !loadingStudent &&
            !studentError &&
            selectedStudent && (
              <>
                <section className="student-profile-hero">
                  <div className="student-profile-main">
                    {selectedStudent.photo_url ? (
                      <img
                        src={selectedStudent.photo_url}
                        alt={fullName}
                        className="student-profile-photo"
                      />
                    ) : (
                      <div className="student-profile-photo student-profile-photo-fallback">
                        {getInitials(selectedStudent)}
                      </div>
                    )}

                    <div className="student-profile-heading">
                      <span className="student-profile-label">
                        {text.profile}
                      </span>

                      <h2>
                        {fullName || text.noValue}
                      </h2>

                      <div className="student-profile-meta">
                        <span>
                          {text.admissionNo}:{" "}
                          {selectedStudent.admission_number ||
                            text.noValue}
                        </span>

                        <span>
                          {text.rollNo}:{" "}
                          {selectedStudent.roll_number ||
                            text.noValue}
                        </span>
                      </div>

                      <span
                        className={
                          selectedStudent.is_active
                            ? "student-status-badge active"
                            : "student-status-badge inactive"
                        }
                      >
                        {selectedStudent.is_active
                          ? text.activeStudent
                          : text.inactiveStudent}
                      </span>
                    </div>
                  </div>

                  <div className="student-profile-actions">
                    <button
                      type="button"
                      className="student-secondary-button"
                      onClick={openEditForm}
                    >
                      ✎ {text.editStudent}
                    </button>

                    <button
                      type="button"
                      className={
                        selectedStudent.is_active
                          ? "student-secondary-button danger"
                          : "student-primary-button"
                      }
                      onClick={handleStatusChange}
                      disabled={statusUpdating}
                    >
                      {statusUpdating
                        ? "..."
                        : selectedStudent.is_active
                          ? text.deactivate
                          : text.activate}
                    </button>
                  </div>
                </section>

                <nav
                  className="student-tabs"
                  aria-label={text.title}
                >
                  {TABS.map((tab) => (
                    <button
                      type="button"
                      key={tab.key}
                      className={
                        activeTab === tab.key
                          ? "student-tab active"
                          : "student-tab"
                      }
                      onClick={() =>
                        setActiveTab(tab.key)
                      }
                    >
                      <span>{tab.icon}</span>
                      {text[tab.key]}
                    </button>
                  ))}
                </nav>

                {activeTab === "overview" && (
                  <div className="student-workspace">
                    <section className="student-workspace-card">
                      <div className="student-workspace-card-header">
                        <div>
                          <h3>{text.studentInfo}</h3>
                          <p>{text.profile}</p>
                        </div>
                      </div>

                      <div className="student-info-grid">
                        <InfoItem
                          label={text.admissionNo}
                          value={
                            selectedStudent.admission_number
                          }
                        />

                        <InfoItem
                          label={text.rollNo}
                          value={
                            selectedStudent.roll_number
                          }
                        />

                        <InfoItem
                          label={text.dateOfBirth}
                          value={formatDate(
                            selectedStudent.date_of_birth,
                          )}
                        />

                        <InfoItem
                          label={text.gender}
                          value={selectedStudent.gender}
                        />

                        <InfoItem
                          label={text.bloodGroup}
                          value={
                            selectedStudent.blood_group
                          }
                        />

                        <InfoItem
                          label={text.class}
                          value={
                            selectedStudent.class_name
                          }
                        />

                        <InfoItem
                          label={text.section}
                          value={
                            selectedStudent.section
                          }
                        />

                        <InfoItem
                          label={text.status}
                          value={
                            selectedStudent.is_active
                              ? text.active
                              : text.inactive
                          }
                        />
                      </div>
                    </section>

                    <section className="student-workspace-card">
                      <div className="student-workspace-card-header">
                        <div>
                          <h3>{text.contactInfo}</h3>
                          <p>{text.profile}</p>
                        </div>
                      </div>

                      <div className="student-info-grid">
                        <InfoItem
                          label={text.phone}
                          value={selectedStudent.phone}
                        />

                        <InfoItem
                          label={text.email}
                          value={selectedStudent.email}
                        />

                        <InfoItem
                          label={text.address}
                          value={selectedStudent.address}
                        />

                        <InfoItem
                          label={text.city}
                          value={selectedStudent.city}
                        />

                        <InfoItem
                          label={text.state}
                          value={selectedStudent.state}
                        />

                        <InfoItem
                          label={text.country}
                          value={selectedStudent.country}
                        />

                        <InfoItem
                          label={text.postalCode}
                          value={
                            selectedStudent.postal_code
                          }
                        />
                      </div>
                    </section>

                    <section className="student-workspace-card">
                      <div className="student-workspace-card-header">
                        <div>
                          <h3>{text.quickActions}</h3>
                          <p>{text.title}</p>
                        </div>
                      </div>

                      <div className="student-quick-actions">
                        <button
                          type="button"
                          onClick={openFees}
                          className="student-quick-action"
                        >
                          <span className="student-quick-action-icon">
                            ₹
                          </span>

                          <span>
                            <strong>
                              {text.openFees}
                            </strong>
                            <small>{text.fees}</small>
                          </span>

                          <span>→</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveTab("parents")
                          }
                          className="student-quick-action"
                        >
                          <span className="student-quick-action-icon">
                            ♧
                          </span>

                          <span>
                            <strong>
                              {text.manageParents}
                            </strong>
                            <small>{text.parents}</small>
                          </span>

                          <span>→</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveTab("documents")
                          }
                          className="student-quick-action"
                        >
                          <span className="student-quick-action-icon">
                            ▤
                          </span>

                          <span>
                            <strong>
                              {text.viewDocuments}
                            </strong>
                            <small>{text.documents}</small>
                          </span>

                          <span>→</span>
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === "parents" && (
                  <section className="student-workspace-card">
                    <div className="student-workspace-card-header">
                      <div>
                        <h3>{text.parents}</h3>
                        <p>{text.contactInfo}</p>
                      </div>
                    </div>

                    {loadingParents && (
                      <div className="student-module-empty">
                        <span className="student-spinner" />
                        <span>
                          {text.loadingParents}
                        </span>
                      </div>
                    )}

                    {!loadingParents && parentError && (
                      <div className="student-module-empty">
                        <strong>{parentError}</strong>

                        <button
                          type="button"
                          onClick={() =>
                            loadStudent(selectedStudent.id)
                          }
                        >
                          {text.retry}
                        </button>
                      </div>
                    )}

                    {!loadingParents &&
                      !parentError &&
                      parents.length === 0 && (
                        <div className="student-module-empty">
                          <div className="student-module-empty-icon">
                            ♧
                          </div>

                          <strong>
                            {text.noParents}
                          </strong>

                          <span>
                            {text.noParentsHint}
                          </span>
                        </div>
                      )}

                    {!loadingParents &&
                      !parentError &&
                      parents.length > 0 && (
                        <div className="student-parent-grid">
                          {parents.map((link) => {
                            const parent =
                              link.parent || link;

                            const parentName =
                              [
                                parent.first_name,
                                parent.middle_name,
                                parent.last_name,
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                              link.parent_name ||
                              text.parents;

                            return (
                              <article
                                className="student-parent-card"
                                key={link.id}
                              >
                                <div className="student-parent-avatar">
                                  {getInitials(parent)}
                                </div>

                                <div className="student-parent-content">
                                  <h4>{parentName}</h4>

                                  <span>
                                    {text.relationship}:{" "}
                                    {link.relationship_type ||
                                      text.noValue}
                                  </span>

                                  {link.is_primary && (
                                    <small>
                                      {text.primary}
                                    </small>
                                  )}

                                  {link.is_emergency_contact && (
                                    <small>
                                      {text.emergency}
                                    </small>
                                  )}

                                  {parent.phone && (
                                    <span>
                                      {text.phone}:{" "}
                                      {parent.phone}
                                    </span>
                                  )}

                                  {parent.email && (
                                    <span>
                                      {text.email}:{" "}
                                      {parent.email}
                                    </span>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                  </section>
                )}

                {activeTab === "fees" && (
                  <section className="student-workspace-card">
                    <div className="student-workspace-card-header">
                      <div>
                        <h3>{text.fees}</h3>
                        <p>{text.openFees}</p>
                      </div>
                    </div>

                    <div className="student-module-empty">
                      <div className="student-module-empty-icon">
                        ₹
                      </div>

                      <strong>{text.openFees}</strong>

                      <span>{text.comingSoon}</span>

                      <button
                        type="button"
                        className="student-primary-button"
                        onClick={openFees}
                      >
                        {text.openFees} →
                      </button>
                    </div>
                  </section>
                )}

                {activeTab === "academic" && (
                  <WorkspacePlaceholder
                    title={text.academic}
                    text={text.comingSoon}
                  />
                )}

                {activeTab === "attendance" && (
                  <WorkspacePlaceholder
                    title={text.attendance}
                    text={text.comingSoon}
                  />
                )}

                {activeTab === "exams" && (
                  <WorkspacePlaceholder
                    title={text.exams}
                    text={text.comingSoon}
                  />
                )}

                {activeTab === "documents" && (
                  <WorkspacePlaceholder
                    title={text.documents}
                    text={text.comingSoon}
                  />
                )}

                {activeTab === "communication" && (
                  <WorkspacePlaceholder
                    title={text.communication}
                    text={text.comingSoon}
                  />
                )}
              </>
            )}
        </section>
      </section>
    </main>
  );
}