import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getSchools, getAcademicSessions, getCurrentAcademicSession } from "../api/school";
import {
  getStudents,
  createStudent,
  getStudent,
  getStudentParents,
  updateStudentStatus,
  bulkUpdateStudentStatus,
} from "../api/students";
import StudentForm from "../components/students/StudentForm";
import StudentFeeSummary from "../components/students/StudentFeeSummary";
import StudentSessionImport from "../components/students/StudentSessionImport";
import "../student-dashboard.css";

const TEXT = {
  en: {
    title: "Students",
    subtitle: "Complete student workspace",
    search: "Search student...",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    refresh: "Refresh",
    addStudent: "Add Student",
    sessionImport: "Import from Session",
    bulkImport: "Bulk Import",
    bulkExport: "Export CSV",
    importTitle: "Bulk Import Students",
    importHelp: "Upload a CSV file. Required columns: admission_number, first_name. Optional columns include roll_number, middle_name, last_name, date_of_birth, gender, blood_group, phone, email, address, city, state, country, postal_code, class_name, section, enrollment_number, government_id_number, house, category, religion, previous_school, admission_date.",
    chooseCsv: "Choose CSV",
    downloadTemplate: "Download template",
    previewRows: "Preview rows",
    importRows: "Import valid rows",
    importingRows: "Importing…",
    importSummary: "Import summary",
    importNoFile: "Choose a CSV file first.",
    importRequired: "Each row must include admission_number and first_name.",
    importComplete: "Bulk import finished. Review the row results below.",
    close: "Close",
    row: "Row",
    result: "Result",
    success: "Imported",
    failed: "Failed",
    duplicate: "Duplicate admission number in this file or current session",
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
    scopeFailed: "Unable to resolve the school and current academic session.",
    studentLoadFailed: "Unable to load student details.",
    parentLoadFailed: "Unable to load parent details.",
    activeStudent: "Active student",
    inactiveStudent: "Inactive student",
    records: "Records",
    cancel: "Cancel",
    selectAll: "Select all",
    selected: "selected",
    activateSelected: "Activate selected",
    deactivateSelected: "Deactivate selected",
    confirmBulkActivate: "Activate selected students?",
    confirmBulkDeactivate: "Deactivate selected students?",
    bulkUpdateFailed: "Unable to update selected students.",
    bulkUpdating: "Updating...",
  },

  hi: {
    title: "विद्यार्थी",
    subtitle: "विद्यार्थी की पूरी जानकारी और कार्यक्षेत्र",
    search: "विद्यार्थी खोजें...",
    all: "सभी",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    refresh: "रिफ्रेश",
    addStudent: "विद्यार्थी जोड़ें",
    sessionImport: "दूसरे सेशन से इम्पोर्ट",
    bulkImport: "बल्क इम्पोर्ट",
    bulkExport: "CSV एक्सपोर्ट",
    importTitle: "विद्यार्थियों का बल्क इम्पोर्ट",
    importHelp: "CSV फ़ाइल अपलोड करें। जरूरी कॉलम: admission_number, first_name. बाकी कॉलम वैकल्पिक हैं।",
    chooseCsv: "CSV चुनें",
    downloadTemplate: "टेम्पलेट डाउनलोड",
    previewRows: "पंक्तियाँ देखें",
    importRows: "सही पंक्तियाँ इम्पोर्ट करें",
    importingRows: "इम्पोर्ट हो रहा है…",
    importSummary: "इम्पोर्ट सारांश",
    importNoFile: "पहले CSV फ़ाइल चुनें।",
    importRequired: "हर पंक्ति में admission_number और first_name जरूरी हैं।",
    importComplete: "बल्क इम्पोर्ट पूरा हुआ। नीचे परिणाम देखें।",
    close: "बंद करें",
    row: "पंक्ति",
    result: "परिणाम",
    success: "इम्पोर्ट हुआ",
    failed: "असफल",
    duplicate: "इस फ़ाइल या मौजूदा सत्र में admission number दोहराया गया है",
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
    scopeFailed: "स्कूल और वर्तमान शैक्षणिक सत्र की जानकारी नहीं मिल सकी।",
    studentLoadFailed: "विद्यार्थी की जानकारी लोड नहीं हो सकी।",
    parentLoadFailed: "अभिभावक की जानकारी लोड नहीं हो सकी।",
    activeStudent: "सक्रिय विद्यार्थी",
    inactiveStudent: "निष्क्रिय विद्यार्थी",
    records: "रिकॉर्ड",
    cancel: "रद्द करें",
    selectAll: "सभी चुनें",
    selected: "चयनित",
    activateSelected: "चयनित सक्रिय करें",
    deactivateSelected: "चयनित निष्क्रिय करें",
    confirmBulkActivate: "क्या चयनित विद्यार्थियों को सक्रिय करना है?",
    confirmBulkDeactivate: "क्या चयनित विद्यार्थियों को निष्क्रिय करना है?",
    bulkUpdateFailed: "चयनित विद्यार्थियों की स्थिति अपडेट नहीं हो सकी।",
    bulkUpdating: "अपडेट हो रहा है...",
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


function unwrapResponse(value) {
  let result = value;
  for (let i = 0; i < 4; i += 1) {
    if (result && !Array.isArray(result) && result.data !== undefined &&
        !idFrom(result, ["id", "school_id", "schoolId", "academic_session_id", "session_id"])) {
      result = result.data;
    } else {
      break;
    }
  }
  return result;
}

function toArray(value) {
  const result = unwrapResponse(value);
  if (Array.isArray(result)) return result;
  const candidates = [
    result?.items, result?.results, result?.schools, result?.sessions,
    result?.data, result?.records, result?.students, result?.payload,
    result?.payload?.items, result?.data?.items, result?.data?.results,
    result?.data?.schools, result?.data?.sessions,
  ];
  return candidates.find(Array.isArray) || [];
}

function idFrom(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function sameId(first, second) {
  return first !== undefined && first !== null && second !== undefined && second !== null && String(first) === String(second);
}

function unwrapPayload(value) {
  let result = value;
  for (let i = 0; i < 3; i += 1) {
    if (result && !Array.isArray(result) && result.data && !idFrom(result, ["id", "academic_session_id", "session_id"])) {
      result = result.data;
    } else {
      break;
    }
  }
  return result;
}

async function resolveStudentScope(user) {
  const userSchoolId = idFrom(user, ["school_id", "schoolId", "schoolID"]) ||
    idFrom(user?.school, ["id", "school_id", "schoolId"]);
  let school = user?.school && typeof user.school === "object" ? user.school : null;
  let schools = [];
  let schoolId = userSchoolId;

  try {
    schools = toArray(await getSchools());
  } catch (error) {
    console.warn("Students: unable to fetch schools list; will use explicit account assignment if available.", error);
  }

  if (schoolId) {
    school = schools.find((item) => sameId(idFrom(item, ["id", "school_id", "schoolId"]), schoolId)) || school;
  } else {
    const associatedId = idFrom(user?.school, ["id", "school_id", "schoolId"]);
    const associatedName = String(user?.school_name || user?.schoolName || user?.school?.name || "").trim().toLowerCase();
    school = schools.find((item) => sameId(idFrom(item, ["id", "school_id", "schoolId"]), associatedId)) ||
      (associatedName ? schools.find((item) => String(item?.name || item?.school_name || "").trim().toLowerCase() === associatedName) : null) ||
      (schools.length === 1 ? schools[0] : null);
    schoolId = idFrom(school, ["id", "school_id", "schoolId"]);
    // Keep the same configured default-school fallback already used by Accounts.jsx.
    if (!schoolId) {
      schoolId = 1;
      school = schools.find((item) => sameId(idFrom(item, ["id", "school_id", "schoolId"]), schoolId)) || school;
    }
  }

  if (!schoolId) {
    throw new Error("School ID could not be resolved. Check the logged-in user's school assignment and Schools API response. Existing student records have not been deleted.");
  }

  let session = null;
  try {
    session = unwrapResponse(await getCurrentAcademicSession(schoolId));
    if (Array.isArray(session)) session = session[0] || null;
  } catch (error) {
    console.warn("Students: current-session endpoint failed; checking session list.", error);
  }

  let sessionId = idFrom(session, ["id", "academic_session_id", "academicSessionId", "session_id", "sessionId"]);
  if (!sessionId) {
    const sessions = toArray(await getAcademicSessions(schoolId));
    session = sessions.find((item) => item?.is_current === true || item?.isCurrent === true || item?.current === true || String(item?.status || "").toLowerCase() === "current") ||
      sessions.find((item) => /2026\s*[-–/]\s*(2027|27)/.test(String(item?.name || item?.session_name || item?.academic_year || item?.label || ""))) ||
      (sessions.length === 1 ? sessions[0] : null);
    sessionId = idFrom(session, ["id", "academic_session_id", "academicSessionId", "session_id", "sessionId"]);
  }

  if (!sessionId) throw new Error("Academic session could not be resolved for this school. Check the current session in School Profile.");

  return {
    schoolId,
    sessionId,
    schoolName: school?.name || school?.school_name || user?.school_name || "School",
    sessionName: session?.name || session?.session_name || session?.academic_year || session?.label || "Current academic session",
  };
}

export default function StudentDashboard() {
  const language =
    localStorage.getItem("edusphere-language") === "hi"
      ? "hi"
      : "en";

  const text = TEXT[language];
  const { user, loading: authLoading } = useAuth();

  const [scope, setScope] = useState(null);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [scopeError, setScopeError] = useState("");
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
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showSessionImport, setShowSessionImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImportRows, setBulkImportRows] = useState([]);
  const [bulkImportResults, setBulkImportResults] = useState([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportError, setBulkImportError] = useState("");

  async function loadStudents(preferredStudentId = null) {
    setLoadingStudents(true);
    setStudentsError("");

    if (!scope?.schoolId || !scope?.sessionId) {
      setLoadingStudents(false);
      setStudentsError(scopeError || text.scopeFailed);
      return;
    }

    try {
      const data = await getStudents({
        schoolId: scope.schoolId,
        academicSessionId: scope.sessionId,
        page: 1,
        pageSize: 100,
      });

      const responseList = toArray(data);

      // Enforce the selected academic session in the UI as a safety check.
      // The API request above also sends academic_session_id; never display a
      // record explicitly tagged to a different session under this session label.
      const list = responseList.filter((student) => {
        const studentSessionId = idFrom(student, [
          "academic_session_id",
          "academicSessionId",
          "session_id",
          "sessionId",
        ]);
        return studentSessionId !== null && sameId(studentSessionId, scope.sessionId);
      });

      if (responseList.length > 0 && list.length === 0) {
        console.error(
          "Student session mismatch: API returned students, but none belong to selected session.",
          { selectedSessionId: scope.sessionId, returnedSessionIds: responseList.map((student) => idFrom(student, ["academic_session_id", "academicSessionId", "session_id", "sessionId"])) }
        );
      }

      setStudents(list);

      if (preferredStudentId) {
        const exists = list.some(
          (student) => sameId(student.id, preferredStudentId),
        );

        if (exists) {
          setSelectedStudentId(preferredStudentId);
          return;
        }
      }

      if (selectedStudentId) {
        const exists = list.some(
          (student) => sameId(student.id, selectedStudentId),
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
    let cancelled = false;

    if (authLoading) {
      setScopeLoading(true);
      return () => { cancelled = true; };
    }

    setScopeLoading(true);
    setScopeError("");
    setScope(null);

    resolveStudentScope(user)
      .then((resolvedScope) => {
        if (!cancelled) {
          setScope(resolvedScope);
          setScopeError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setScope(null);
          setScopeError(error?.message || text.scopeFailed);
          setStudentsError(error?.message || text.scopeFailed);
          setLoadingStudents(false);
        }
      })
      .finally(() => {
        if (!cancelled) setScopeLoading(false);
      });

    return () => { cancelled = true; };
  }, [authLoading, user, text.scopeFailed]);

  useEffect(() => {
    if (scope) loadStudents();
  }, [scope]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudent(selectedStudentId);
    } else {
      setSelectedStudent(null);
      setParents([]);
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

  function toggleStudentSelection(studentId) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredStudents.map((student) => student.id);

    setSelectedStudentIds((current) => {
      const allVisibleSelected =
        visibleIds.length > 0 &&
        visibleIds.every((id) => current.includes(id));

      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function clearStudentSelection() {
    setSelectedStudentIds([]);
  }

  async function handleBulkStatusChange(nextStatus) {
    if (bulkUpdating || selectedStudentIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      nextStatus
        ? text.confirmBulkActivate
        : text.confirmBulkDeactivate
    );

    if (!confirmed) {
      return;
    }

    setBulkUpdating(true);

    try {
      await bulkUpdateStudentStatus({
        student_ids: selectedStudentIds,
        is_active: nextStatus,
      });

      setStudents((current) =>
        current.map((student) =>
          selectedStudentIds.includes(student.id)
            ? {
                ...student,
                is_active: nextStatus,
                status: nextStatus ? "active" : "inactive",
              }
            : student
        )
      );

      if (
        selectedStudent &&
        selectedStudentIds.includes(selectedStudent.id)
      ) {
        setSelectedStudent((current) =>
          current
            ? {
                ...current,
                is_active: nextStatus,
                status: nextStatus ? "active" : "inactive",
              }
            : current
        );
      }

      clearStudentSelection();
    } catch (error) {
      console.error("Bulk student status update error:", error);
      window.alert(text.bulkUpdateFailed);
    } finally {
      setBulkUpdating(false);
    }
  }

  function parseStudentCsv(textValue) {
    const lines = String(textValue || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];
    const parseLine = (line) => {
      const cells = [];
      let value = "";
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; }
        else if (char === '"') quoted = !quoted;
        else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
        else value += char;
      }
      cells.push(value.trim());
      return cells;
    };
    const headers = parseLine(lines[0]).map((header) => header.trim().toLowerCase().replace(/[\s-]+/g, "_"));
    return lines.slice(1).map((line, index) => {
      const cells = parseLine(line);
      const row = { _rowNumber: index + 2 };
      headers.forEach((header, i) => { if (header) row[header] = cells[i] ?? ""; });
      return row;
    });
  }

  function downloadStudentCsvTemplate() {
    const headers = ["admission_number","first_name","middle_name","last_name","roll_number","class_name","section","enrollment_number","date_of_birth","gender","blood_group","phone","email","address","city","state","country","postal_code","admission_date","government_id_number","house","category","religion","previous_school"];
    const blob = new Blob([headers.join(",") + "\r\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "edusphere-student-import-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportStudentsCsv() {
    const headers = ["admission_number","first_name","middle_name","last_name","roll_number","class_name","section","date_of_birth","gender","blood_group","phone","email","address","city","state","country","postal_code","status"];
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredStudents.map((student) => headers.map((key) => escape(student[key])).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `students-${scope?.sessionName || "session"}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function readBulkImportFile(file) {
    setBulkImportError("");
    setBulkImportResults([]);
    setBulkImportFile(file || null);
    if (!file) { setBulkImportRows([]); return; }
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setBulkImportError("Please choose a .csv file. Excel files must be saved as CSV first.");
      setBulkImportRows([]);
      return;
    }
    try {
      const parsed = parseStudentCsv(await file.text());
      if (!parsed.length) throw new Error("CSV is empty or has no data rows.");
      const seen = new Set();
      const existing = new Set(students.map((student) => String(student.admission_number || "").trim().toLowerCase()));
      const checked = parsed.map((row) => {
        const admission = String(row.admission_number || row.admission_no || row.sr_no || "").trim().toLowerCase();
        const name = String(row.first_name || row.name || "").trim();
        let error = "";
        if (!admission || !name) error = text.importRequired;
        else if (existing.has(admission) || seen.has(admission)) error = text.duplicate;
        if (admission) seen.add(admission);
        return { ...row, admission_number: row.admission_number || row.admission_no || row.sr_no || "", first_name: row.first_name || row.name || "", _error: error };
      });
      setBulkImportRows(checked);
    } catch (error) {
      setBulkImportRows([]);
      setBulkImportError(error.message || "Unable to read CSV.");
    }
  }

  async function runBulkImport() {
    if (!scope?.schoolId || !scope?.sessionId || bulkImporting) return;
    const validRows = bulkImportRows.filter((row) => !row._error);
    if (!bulkImportFile) { setBulkImportError(text.importNoFile); return; }
    if (!validRows.length) { setBulkImportError(text.importRequired); return; }
    if (!window.confirm(`Import ${validRows.length} student(s) into ${scope.sessionName}? Existing records will not be overwritten.`)) return;
    setBulkImporting(true);
    setBulkImportError("");
    const results = [];
    for (const row of validRows) {
      const payload = {
        school_id: scope.schoolId,
        academic_session_id: scope.sessionId,
        admission_number: String(row.admission_number).trim(),
        first_name: String(row.first_name).trim(),
        middle_name: row.middle_name || null,
        last_name: row.last_name || null,
        roll_number: row.roll_number || null,
        class_name: row.class_name || null,
        section: row.section || null,
        enrollment_number: row.enrollment_number || null,
        date_of_birth: row.date_of_birth || null,
        gender: row.gender || null,
        blood_group: row.blood_group || null,
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        city: row.city || null,
        state: row.state || null,
        country: row.country || "India",
        postal_code: row.postal_code || null,
        admission_date: row.admission_date || null,
        government_id_number: row.government_id_number || null,
        house: row.house || null,
        category: row.category || null,
        religion: row.religion || null,
        previous_school: row.previous_school || null,
        status: "active",
        is_active: true,
      };
      try {
        await createStudent(payload);
        results.push({ row: row._rowNumber, admission: payload.admission_number, status: "success", message: text.success });
      } catch (error) {
        results.push({ row: row._rowNumber, admission: payload.admission_number, status: "failed", message: error.message || text.failed });
      }
    }
    setBulkImportResults(results);
    setBulkImporting(false);
    await loadStudents();
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
        { is_active: nextStatus },
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
      <section className="student-command-bar" aria-label="Student dashboard summary">
        <div className="student-command-brand">
          <div className="student-command-mark">E</div>
          <div className="student-command-brand-copy">
            <strong>EDUSPHERE</strong>
            <span>{scope?.schoolName || "School"}</span>
          </div>
        </div>
        <div className="student-command-metric student-command-session">
          <span>ACADEMIC SESSION</span>
          <strong>{scope?.sessionName || "—"}</strong>
        </div>
        <div className="student-command-metric">
          <span>TOTAL STUDENTS</span>
          <strong>{students.length}</strong>
        </div>
        <div className="student-command-metric">
          <span>ACTIVE</span>
          <strong>{students.filter((item) => item.is_active !== false && String(item.status || "active").toLowerCase() !== "inactive").length}</strong>
        </div>
        <div className="student-command-metric">
          <span>INACTIVE</span>
          <strong>{students.filter((item) => item.is_active === false || String(item.status || "").toLowerCase() === "inactive").length}</strong>
        </div>
        <div className="student-command-selected" title={fullName || "No student selected"}>
          <span>SELECTED STUDENT</span>
          <strong>{fullName || "Select a student"}</strong>
          <small>{selectedStudent?.admission_number || "Choose from records below"}</small>
        </div>
      </section>
      <header className="student-page-header">
        <div className="student-page-heading-compact">
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>

        <div className="student-page-header-actions">
          <button type="button" className="student-secondary-button" onClick={() => setShowSessionImport(true)} disabled={scopeLoading || !scope?.schoolId || !scope?.sessionId}>⇄ {text.sessionImport}</button>
          <button type="button" className="student-secondary-button" onClick={() => { setShowBulkImport(true); setBulkImportError(""); setBulkImportResults([]); }} disabled={scopeLoading || !scope?.schoolId || !scope?.sessionId}>⇧ {text.bulkImport}</button>
          <button type="button" className="student-secondary-button" onClick={exportStudentsCsv} disabled={!filteredStudents.length}>↓ {text.bulkExport}</button>
          <button
            type="button"
            className="student-secondary-button"
            onClick={() => loadStudents()}
            disabled={loadingStudents || scopeLoading || !scope}
          >
            ↻ {text.refresh}
          </button>

          <button
            type="button"
            className="student-primary-button"
            onClick={openCreateForm}
            disabled={scopeLoading || !scope?.schoolId || !scope?.sessionId}
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
              schoolId={scope?.schoolId}
              academicSessionId={scope?.sessionId}
              onSuccess={handleStudentSaved}
              onCancel={closeStudentForm}
            />
          </div>
        </div>
      )}

      {showSessionImport && scope && (
        <StudentSessionImport
          scope={scope}
          language={language}
          onClose={() => setShowSessionImport(false)}
          onComplete={async () => { setShowSessionImport(false); await loadStudents(selectedStudentId); }}
        />
      )}

      {showBulkImport && (
        <div className="student-form-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !bulkImporting) setShowBulkImport(false); }}>
          <section className="student-form-modal student-bulk-import-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-import-title">
            <header className="student-bulk-import-header">
              <div><span className="student-page-eyebrow">EDUSPHERE · STUDENTS</span><h2 id="bulk-import-title">{text.importTitle}</h2><p>{text.importHelp}</p></div>
              <button type="button" className="student-secondary-button" onClick={() => setShowBulkImport(false)} disabled={bulkImporting} aria-label={text.close}>×</button>
            </header>
            <div className="student-bulk-import-body">
              <div className="student-bulk-import-actions">
                <label className="student-secondary-button student-csv-picker">{text.chooseCsv}<input type="file" accept=".csv,text/csv" onChange={(event) => readBulkImportFile(event.target.files?.[0])} disabled={bulkImporting} /></label>
                <button type="button" className="student-secondary-button" onClick={downloadStudentCsvTemplate}>{text.downloadTemplate}</button>
                {bulkImportFile && <span className="student-csv-file-name">{bulkImportFile.name}</span>}
              </div>
              {bulkImportError && <div className="student-form-error" role="alert">{bulkImportError}</div>}
              {bulkImportRows.length > 0 && <>
                <div className="student-import-stats"><span>{bulkImportRows.length} {text.previewRows}</span><span>{bulkImportRows.filter((row) => !row._error).length} valid</span><span>{bulkImportRows.filter((row) => row._error).length} skipped</span></div>
                <div className="student-import-table-wrap"><table className="student-import-table"><thead><tr><th>{text.row}</th><th>Admission No.</th><th>Name</th><th>Class</th><th>Section</th><th>{text.result}</th></tr></thead><tbody>{bulkImportRows.map((row) => <tr key={row._rowNumber}><td>{row._rowNumber}</td><td>{row.admission_number}</td><td>{[row.first_name,row.middle_name,row.last_name].filter(Boolean).join(" ")}</td><td>{row.class_name || "—"}</td><td>{row.section || "—"}</td><td>{row._error ? <span className="student-import-error">{row._error}</span> : <span className="student-import-valid">Ready</span>}</td></tr>)}</tbody></table></div>
              </>}
              {bulkImportResults.length > 0 && <div className="student-import-results"><h3>{text.importSummary}</h3><p>{bulkImportResults.filter((item) => item.status === "success").length} {text.success} · {bulkImportResults.filter((item) => item.status === "failed").length} {text.failed}</p><div className="student-import-results-list">{bulkImportResults.map((item) => <div key={`${item.row}-${item.admission}`}><span>Row {item.row} · {item.admission}</span><strong className={item.status === "success" ? "student-import-valid" : "student-import-error"}>{item.message}</strong></div>)}</div></div>}
            </div>
            <footer className="student-bulk-import-footer"><button type="button" className="student-secondary-button" onClick={() => setShowBulkImport(false)} disabled={bulkImporting}>{text.close}</button><button type="button" className="student-primary-button" onClick={runBulkImport} disabled={bulkImporting || !bulkImportRows.some((row) => !row._error)}>{bulkImporting ? text.importingRows : text.importRows}</button></footer>
          </section>
        </div>
      )}

      {selectedStudentIds.length > 0 && (
        <section className="student-bulk-toolbar" aria-label="Bulk student actions">
          <div><strong>{selectedStudentIds.length} student(s) selected</strong><span>Apply actions to the selected records in this session.</span></div>
          <button type="button" className="student-secondary-button" onClick={() => setSelectedStudentIds([])} disabled={bulkUpdating}>Clear selection</button>
          <button type="button" className="student-secondary-button" onClick={() => handleBulkStatusChange(true)} disabled={bulkUpdating}>{bulkUpdating ? "Updating…" : "Activate selected"}</button>
          <button type="button" className="student-secondary-button" onClick={() => handleBulkStatusChange(false)} disabled={bulkUpdating}>{bulkUpdating ? "Updating…" : "Deactivate selected"}</button>
          <button type="button" className="student-secondary-button" onClick={exportStudentsCsv} disabled={!filteredStudents.length}>Export filtered CSV</button>
        </section>
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

          <div className="student-bulk-toolbar">
            <button
              type="button"
              className="student-filter"
              onClick={toggleSelectAllVisible}
              disabled={
                bulkUpdating || filteredStudents.length === 0
              }
            >
              {text.selectAll}
            </button>

            {selectedStudentIds.length > 0 && (
              <>
                <span className="student-bulk-count">
                  {selectedStudentIds.length} {text.selected}
                </span>

                <button
                  type="button"
                  className="student-filter"
                  onClick={() => handleBulkStatusChange(true)}
                  disabled={bulkUpdating}
                >
                  {bulkUpdating ? text.bulkUpdating : text.activateSelected}
                </button>

                <button
                  type="button"
                  className="student-filter danger"
                  onClick={() => handleBulkStatusChange(false)}
                  disabled={bulkUpdating}
                >
                  {bulkUpdating ? text.bulkUpdating : text.deactivateSelected}
                </button>

                <button
                  type="button"
                  className="student-filter"
                  onClick={clearStudentSelection}
                  disabled={bulkUpdating}
                >
                  {text.cancel}
                </button>
              </>
            )}
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
                  sameId(student.id, selectedStudentId);

                const name = getFullName(student);

                return (
                  <div
                    key={student.id}
                    className={
                      selected
                        ? "student-list-item selected"
                        : "student-list-item"
                    }
                  >
                    <input
                      type="checkbox"
                      className="student-select-checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() =>
                        toggleStudentSelection(student.id)
                      }
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`${text.selectAll}: ${name || text.noValue}`}
                    />

                    <button
                      type="button"
                      className="student-list-item-main"
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
                  </div>
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
                  <StudentFeeSummary
                    student={selectedStudent}
                    schoolId={scope?.schoolId}
                    academicSessionId={scope?.sessionId}
                  />
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