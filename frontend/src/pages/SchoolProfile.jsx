import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  archiveAcademicSession,
  carryForwardAcademicSession,
  closeAcademicSession,
  createSchool,
  cloneAcademicSession,
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
import "../school-logo-upload.css";

const TEXT = {
  EN: {
    title: "School Profile",
    subtitle:
      "Manage school identity, registration, taxation, branding, academic configuration and sessions.",
    refresh: "Refresh",
    edit: "Edit",
    addSchool: "Add School",
    selectSchool: "Select School",
    schools: "Schools",
    switchSchool: "Switch School",
    createSchool: "Create School",
    creating: "Creating...",
    cancel: "Cancel",
    save: "Save Changes",
    saving: "Saving...",
    active: "Active",
    inactive: "Inactive",
    activate: "Activate",
    deactivate: "Deactivate",

    identity: "School Identity",
    contact: "Contact & Address",
    registration: "Registration & Affiliation",
    tax: "Tax & Financial Details",
    leadership: "Leadership",
    branding: "Branding",
    academic: "Academic Configuration",
    sessions: "Academic Sessions",

    schoolName: "School Name",
    schoolCode: "School Code",
    email: "Email",
    phone: "Phone",
    address: "Address",
    city: "City",
    state: "State",
    country: "Country",
    postalCode: "Postal Code",
    website: "Website",

    affiliation: "Affiliation",
    affiliationNumber: "Affiliation Number",
    registrationNumber: "Registration Number",
    recognitionNumber: "Recognition Number",
    udiseCode: "UDISE Code",
    schoolType: "School Type",
    managementType: "Management Type",
    establishedYear: "Established Year",

    panNumber: "PAN Number",
    tanNumber: "TAN Number",
    gstNumber: "GST Number",

    principalName: "Principal Name",
    principalEmail: "Principal Email",
    principalPhone: "Principal Phone",

    logoUrl: "Logo",
    uploadLogo: "Upload Logo",
    changeLogo: "Change Logo",
    removeLogo: "Remove Logo",
    logoHint: "JPG, PNG or WEBP · Max 2 MB",
    logoSelected: "Logo selected. Save changes to apply it.",
    logoInvalidType: "Please select a JPG, PNG or WEBP image.",
    logoTooLarge: "Logo image must be 2 MB or smaller.",
    logoProcessing: "Processing logo...",
    faviconUrl: "Favicon URL",
    primaryColor: "Primary Color",
    secondaryColor: "Secondary Color",
    tagline: "Tagline",

    yearStart: "Academic Year Start Month",
    yearEnd: "Academic Year End Month",
    gradingSystem: "Grading System",
    attendanceType: "Attendance Type",
    workingDays: "Working Days / Week",

    april: "April",
    january: "January",
    february: "February",
    march: "March",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October",
    november: "November",
    december: "December",

    addSession: "Add Session",
    createSession: "Create Academic Session",
    editSession: "Edit Academic Session",
    cloneSession: "Clone Academic Session",
    carryForward: "Carry Forward",
    sessionName: "Session Name",
    startDate: "Start Date",
    endDate: "End Date",
    current: "Current",
    setCurrent: "Set Current",
    closeSession: "Close",
    archiveSession: "Archive",
    closed: "Closed",
    archived: "Archived",
    sessionActive: "Active",
    sessionInactive: "Inactive",
    clone: "Clone",
    create: "Create",
    update: "Update",

    noSchool: "No school found.",
    noSessions: "No academic sessions found.",
    loading: "Loading school information...",
    loadingSessions: "Loading sessions...",
    confirmDeactivate:
      "Are you sure you want to deactivate this school?",
    confirmActivate:
      "Are you sure you want to activate this school?",
    confirmClose:
      "Close this academic session? A closed session cannot be edited or made current.",
    confirmArchive:
      "Archive this academic session? Only closed sessions can be archived.",
    currentSession: "Current Academic Session",
    sessionCount: "Sessions",
    schoolStatus: "School Status",
    notConfigured: "Not configured",
    success: "Changes saved successfully.",
    sessionCreated: "Academic session created successfully.",
    sessionUpdated: "Academic session updated successfully.",
    sessionCurrent: "Academic session is now current.",
    sessionClosed: "Academic session closed successfully.",
    sessionArchived: "Academic session archived successfully.",
    sessionCloned: "Academic session cloned successfully.",
    sessionCarried:
      "Academic session carried forward successfully.",
    error: "Something went wrong.",
    required: "This field is required.",
    invalidDates: "End date must be after start date.",
    noPermission: "You do not have permission to perform this action.",
    academicCycle: "Academic Cycle",
    percentage: "Percentage",
    grade: "Grade",
    cgpa: "CGPA",
    gpa: "GPA",
    custom: "Custom",
    daily: "Daily",
    periodWise: "Period-wise",
    dailyPeriod: "Daily + Period",
    unsavedChanges: "Unsaved changes",
    saveHint: "Save your school configuration when ready.",
    carryInfo: "Existing session relationships will be tracked against the new session.",
    cloneInfo: "A new academic session will be created from the selected source.",
  },

  HI: {
    title: "विद्यालय प्रोफ़ाइल",
    subtitle:
      "विद्यालय की पहचान, पंजीकरण, कर, ब्रांडिंग, शैक्षणिक कॉन्फ़िगरेशन और सत्र प्रबंधित करें।",
    refresh: "रीफ़्रेश",
    edit: "संपादित करें",
    addSchool: "विद्यालय जोड़ें",
    selectSchool: "विद्यालय चुनें",
    schools: "विद्यालय",
    switchSchool: "विद्यालय बदलें",
    createSchool: "विद्यालय बनाएँ",
    creating: "बनाया जा रहा है...",
    cancel: "रद्द करें",
    save: "परिवर्तन सहेजें",
    saving: "सहेजा जा रहा है...",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    activate: "सक्रिय करें",
    deactivate: "निष्क्रिय करें",

    identity: "विद्यालय पहचान",
    contact: "संपर्क एवं पता",
    registration: "पंजीकरण एवं संबद्धता",
    tax: "कर एवं वित्तीय विवरण",
    leadership: "प्रबंधन",
    branding: "ब्रांडिंग",
    academic: "शैक्षणिक कॉन्फ़िगरेशन",
    sessions: "शैक्षणिक सत्र",

    schoolName: "विद्यालय का नाम",
    schoolCode: "विद्यालय कोड",
    email: "ईमेल",
    phone: "फ़ोन",
    address: "पता",
    city: "शहर",
    state: "राज्य",
    country: "देश",
    postalCode: "पिन कोड",
    website: "वेबसाइट",

    affiliation: "संबद्धता",
    affiliationNumber: "संबद्धता संख्या",
    registrationNumber: "पंजीकरण संख्या",
    recognitionNumber: "मान्यता संख्या",
    udiseCode: "UDISE कोड",
    schoolType: "विद्यालय प्रकार",
    managementType: "प्रबंधन प्रकार",
    establishedYear: "स्थापना वर्ष",

    panNumber: "PAN नंबर",
    tanNumber: "TAN नंबर",
    gstNumber: "GST नंबर",

    principalName: "प्रधानाचार्य का नाम",
    principalEmail: "प्रधानाचार्य ईमेल",
    principalPhone: "प्रधानाचार्य फ़ोन",

    logoUrl: "लोगो",
    uploadLogo: "लोगो अपलोड करें",
    changeLogo: "लोगो बदलें",
    removeLogo: "लोगो हटाएँ",
    logoHint: "JPG, PNG या WEBP · अधिकतम 2 MB",
    logoSelected: "लोगो चुना गया है। लागू करने के लिए परिवर्तन सहेजें।",
    logoInvalidType: "कृपया JPG, PNG या WEBP इमेज चुनें।",
    logoTooLarge: "लोगो इमेज 2 MB या उससे छोटी होनी चाहिए।",
    logoProcessing: "लोगो प्रोसेस हो रहा है...",
    faviconUrl: "Favicon URL",
    primaryColor: "प्राथमिक रंग",
    secondaryColor: "द्वितीयक रंग",
    tagline: "टैगलाइन",

    yearStart: "शैक्षणिक वर्ष प्रारंभ माह",
    yearEnd: "शैक्षणिक वर्ष समाप्ति माह",
    gradingSystem: "ग्रेडिंग सिस्टम",
    attendanceType: "उपस्थिति प्रकार",
    workingDays: "प्रति सप्ताह कार्य दिवस",

    january: "जनवरी",
    february: "फ़रवरी",
    march: "मार्च",
    april: "अप्रैल",
    may: "मई",
    june: "जून",
    july: "जुलाई",
    august: "अगस्त",
    september: "सितंबर",
    october: "अक्टूबर",
    november: "नवंबर",
    december: "दिसंबर",

    addSession: "सत्र जोड़ें",
    createSession: "शैक्षणिक सत्र बनाएँ",
    editSession: "शैक्षणिक सत्र संपादित करें",
    cloneSession: "शैक्षणिक सत्र क्लोन करें",
    carryForward: "आगे ले जाएँ",
    sessionName: "सत्र का नाम",
    startDate: "प्रारंभ तिथि",
    endDate: "समाप्ति तिथि",
    current: "वर्तमान",
    setCurrent: "वर्तमान बनाएँ",
    closeSession: "बंद करें",
    archiveSession: "आर्काइव करें",
    closed: "बंद",
    archived: "आर्काइव",
    sessionActive: "सक्रिय",
    sessionInactive: "निष्क्रिय",
    clone: "क्लोन",
    create: "बनाएँ",
    update: "अपडेट",

    noSchool: "कोई विद्यालय नहीं मिला।",
    noSessions: "कोई शैक्षणिक सत्र नहीं मिला।",
    loading: "विद्यालय की जानकारी लोड हो रही है...",
    loadingSessions: "सत्र लोड हो रहे हैं...",
    confirmDeactivate:
      "क्या आप इस विद्यालय को निष्क्रिय करना चाहते हैं?",
    confirmActivate:
      "क्या आप इस विद्यालय को सक्रिय करना चाहते हैं?",
    confirmClose:
      "क्या आप इस शैक्षणिक सत्र को बंद करना चाहते हैं? बंद सत्र को संपादित या वर्तमान नहीं बनाया जा सकता।",
    confirmArchive:
      "क्या आप इस शैक्षणिक सत्र को आर्काइव करना चाहते हैं?",
    currentSession: "वर्तमान शैक्षणिक सत्र",
    sessionCount: "सत्र",
    schoolStatus: "विद्यालय स्थिति",
    notConfigured: "कॉन्फ़िगर नहीं है",
    success: "परिवर्तन सफलतापूर्वक सहेजे गए।",
    sessionCreated: "शैक्षणिक सत्र सफलतापूर्वक बनाया गया।",
    sessionUpdated: "शैक्षणिक सत्र सफलतापूर्वक अपडेट किया गया।",
    sessionCurrent: "शैक्षणिक सत्र अब वर्तमान है।",
    sessionClosed: "शैक्षणिक सत्र सफलतापूर्वक बंद किया गया।",
    sessionArchived: "शैक्षणिक सत्र सफलतापूर्वक आर्काइव किया गया।",
    sessionCloned: "शैक्षणिक सत्र सफलतापूर्वक क्लोन किया गया।",
    sessionCarried:
      "शैक्षणिक सत्र सफलतापूर्वक आगे ले जाया गया।",
    error: "कुछ गलत हो गया।",
    required: "यह फ़ील्ड आवश्यक है।",
    invalidDates: "समाप्ति तिथि प्रारंभ तिथि के बाद होनी चाहिए।",
    noPermission:
      "आपको यह कार्य करने की अनुमति नहीं है।",
    academicCycle: "शैक्षणिक चक्र",
    percentage: "प्रतिशत",
    grade: "ग्रेड",
    cgpa: "CGPA",
    gpa: "GPA",
    custom: "कस्टम",
    daily: "दैनिक",
    periodWise: "पीरियड के अनुसार",
    dailyPeriod: "दैनिक + पीरियड",
    unsavedChanges: "परिवर्तन सहेजे नहीं गए हैं",
    saveHint: "तैयार होने पर विद्यालय की कॉन्फ़िगरेशन सहेजें।",
    carryInfo: "नए सत्र के साथ मौजूदा सत्र संबंधों को दर्ज रखा जाएगा।",
    cloneInfo: "चयनित स्रोत से एक नया शैक्षणिक सत्र बनाया जाएगा।",
  },
};

const MONTHS = [
  [1, "January", "जनवरी"],
  [2, "February", "फ़रवरी"],
  [3, "March", "मार्च"],
  [4, "April", "अप्रैल"],
  [5, "May", "मई"],
  [6, "June", "जून"],
  [7, "July", "जुलाई"],
  [8, "August", "अगस्त"],
  [9, "September", "सितंबर"],
  [10, "October", "अक्टूबर"],
  [11, "November", "नवंबर"],
  [12, "December", "दिसंबर"],
];

const EMPTY_SCHOOL = {
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  postal_code: "",
  website: "",
  affiliation: "",
  affiliation_number: "",
  registration_number: "",
  recognition_number: "",
  udise_code: "",
  school_type: "",
  management_type: "",
  established_year: "",
  pan_number: "",
  tan_number: "",
  gst_number: "",
  principal_name: "",
  principal_email: "",
  principal_phone: "",
  logo_url: "",
  favicon_url: "",
  primary_color: "",
  secondary_color: "",
  tagline: "",
  academic_year_start_month: 4,
  academic_year_end_month: 3,
  grading_system: "",
  attendance_type: "",
  working_days_per_week: "",
};

const EMPTY_SESSION = {
  name: "",
  start_date: "",
  end_date: "",
};

function unwrap(value) {
  return value?.data?.data ?? value?.data ?? value;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    fallback
  );
}

function normalizeSchool(school) {
  return {
    ...EMPTY_SCHOOL,
    ...school,
    established_year:
      school?.established_year ?? "",
    working_days_per_week:
      school?.working_days_per_week ?? "",
    academic_year_start_month:
      school?.academic_year_start_month ?? 4,
    academic_year_end_month:
      school?.academic_year_end_month ?? 3,
  };
}

function normalizeSession(session) {
  return {
    ...session,
    start_date: session?.start_date
      ? String(session.start_date).slice(0, 10)
      : "",
    end_date: session?.end_date
      ? String(session.end_date).slice(0, 10)
      : "",
  };
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}) {
  return (
    <label className="sp-field">
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  children,
}) {
  return (
    <label className="sp-field">
      <span>{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
      >
        {children}
      </select>
    </label>
  );
}

async function processLogoFile(file) {
  if (!file) return "";

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("LOGO_INVALID_TYPE");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("LOGO_TOO_LARGE");
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = sourceUrl;
    });

    const maxDimension = 512;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("LOGO_PROCESSING_FAILED");

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const outputType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
    return canvas.toDataURL(outputType, file.type === "image/jpeg" ? 0.88 : undefined);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function Section({
  title,
  children,
  editing,
  onEdit,
  editLabel,
}) {
  return (
    <section className="sp-section">
      <div className="sp-section-header">
        <div>
          <h2>{title}</h2>
        </div>

        {onEdit && (
          <button
            type="button"
            className="sp-btn sp-btn-secondary"
            onClick={onEdit}
          >
            {editing ? "✓" : "✎"} {editLabel}
          </button>
        )}
      </div>

      <div className="sp-grid">{children}</div>
    </section>
  );
}

export default function SchoolProfile() {
  const { hasPermission } = useAuth();

  const canSchoolView = hasPermission("SCHOOL_VIEW");
  const canSchoolCreate = hasPermission("SCHOOL_CREATE");
  const canSchoolUpdate = hasPermission("SCHOOL_UPDATE");
  const canSchoolStatus = hasPermission("SCHOOL_STATUS_UPDATE");
  const canSessionView = hasPermission("ACADEMIC_SESSION_VIEW");
  const canSessionCreate = hasPermission("ACADEMIC_SESSION_CREATE");
  const canSessionUpdate = hasPermission("ACADEMIC_SESSION_UPDATE");
  const canSessionStatus = hasPermission("ACADEMIC_SESSION_STATUS_UPDATE");
  const canSessionCurrent = hasPermission("ACADEMIC_SESSION_SET_CURRENT");
  const canSessionClose = hasPermission("ACADEMIC_SESSION_CLOSE");
  const canSessionArchive = hasPermission("ACADEMIC_SESSION_ARCHIVE");
  const canSessionClone = hasPermission("ACADEMIC_SESSION_CLONE");
  const canSessionCarryForward = hasPermission("ACADEMIC_SESSION_CARRY_FORWARD");

  const [language, setLanguage] = useState(
    () =>
      localStorage.getItem("edusphere-language") ||
      "EN"
  );

  const t = TEXT[language] || TEXT.EN;
  const logoInputRef = useRef(null);

  const [school, setSchool] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolForm, setSchoolForm] =
    useState(EMPTY_SCHOOL);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] =
    useState(false);

  const [editing, setEditing] = useState(false);
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoProcessing, setLogoProcessing] = useState(false);

  const [sessionModal, setSessionModal] =
    useState(null);

  const [sessionForm, setSessionForm] =
    useState(EMPTY_SESSION);

  const [sessionSaving, setSessionSaving] =
    useState(false);

  const [sessionMode, setSessionMode] =
    useState("create");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const currentSession = useMemo(
    () =>
      sessions.find(
        (session) => session.is_current
      ) || null,
    [sessions]
  );

  useEffect(() => {
    const handler = () => {
      setLanguage(
        localStorage.getItem("edusphere-language") ||
          "EN"
      );
    };

    window.addEventListener(
      "edusphere-language-change",
      handler
    );

    return () =>
      window.removeEventListener(
        "edusphere-language-change",
        handler
      );
  }, []);

  const loadSessions = useCallback(
    async (schoolId) => {
      if (!schoolId || !canSessionView) return;

      setSessionsLoading(true);

      try {
        const response =
          await getAcademicSessions(
            schoolId,
            {
              page: 1,
              page_size: 100,
            }
          );

        const data = unwrap(response);

        const items = Array.isArray(data)
          ? data
          : data?.items || [];

        setSessions(
          items.map(normalizeSession)
        );
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            t.error
          )
        );
      } finally {
        setSessionsLoading(false);
      }
    },
    [canSessionView, t.error]
  );

  const loadData = useCallback(async () => {
    if (!canSchoolView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getSchools({
        page: 1,
        page_size: 100,
      });

      const data = unwrap(response);

      const items = Array.isArray(data)
        ? data
        : data?.items || [];

      const normalizedItems = items.map(normalizeSchool);
      setSchools(normalizedItems);

      if (!normalizedItems.length) {
        setSchool(null);
        setSchoolForm({ ...EMPTY_SCHOOL });
        setSessions([]);
        return;
      }

      const storedSchoolId = Number(
        localStorage.getItem("edusphere-selected-school-id") || 0
      );

      const selected =
        normalizedItems.find((item) => item.id === storedSchoolId) ||
        normalizedItems.find((item) => item.is_active) ||
        normalizedItems[0];

      setSchool(selected);
      setSchoolForm(selected);
      localStorage.setItem(
        "edusphere-selected-school-id",
        String(selected.id)
      );
      window.dispatchEvent(
        new CustomEvent("edusphere-school-change", {
          detail: { schoolId: selected.id, school: selected },
        })
      );

      await loadSessions(selected.id);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t.error
        )
      );
    } finally {
      setLoading(false);
    }
  }, [canSchoolView, loadSessions, t.error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSchoolChange(event) {
    const schoolId = Number(event.target.value);
    if (!schoolId) return;

    const selected = schools.find(
      (item) => Number(item.id) === schoolId
    );

    if (!selected) return;

    setError("");
    setMessage("");
    setEditing(false);
    setCreatingSchool(false);
    setSchool(selected);
    setSchoolForm(selected);
    setSessions([]);
    localStorage.setItem(
      "edusphere-selected-school-id",
      String(selected.id)
    );
    window.dispatchEvent(
      new CustomEvent("edusphere-school-change", {
        detail: { schoolId: selected.id, school: selected },
      })
    );

    await loadSessions(selected.id);
  }

  function updateSchoolField(field, value) {
    setSchoolForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleLogoSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setMessage("");
    setLogoProcessing(true);

    try {
      const logoDataUrl = await processLogoFile(file);
      updateSchoolField("logo_url", logoDataUrl);
    } catch (err) {
      if (err?.message === "LOGO_INVALID_TYPE") {
        setError(t.logoInvalidType);
      } else if (err?.message === "LOGO_TOO_LARGE") {
        setError(t.logoTooLarge);
      } else {
        setError(t.logoProcessing);
      }
    } finally {
      setLogoProcessing(false);
    }
  }

  function removeLogo() {
    setError("");
    setMessage("");
    updateSchoolField("logo_url", "");
  }

  async function saveSchoolChanges() {
    if (creatingSchool) {
      await createNewSchool();
      return;
    }

    if (!school || !canSchoolUpdate) {
      setError(t.noPermission);
      return;
    }

    if (!schoolForm.name.trim()) {
      setError(t.required);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name: schoolForm.name.trim(),
        email: schoolForm.email || null,
        phone: schoolForm.phone || null,
        address: schoolForm.address || null,
        city: schoolForm.city || null,
        state: schoolForm.state || null,
        country:
          schoolForm.country || "India",
        postal_code:
          schoolForm.postal_code || null,
        website:
          schoolForm.website || null,

        affiliation:
          schoolForm.affiliation || null,
        affiliation_number:
          schoolForm.affiliation_number || null,
        registration_number:
          schoolForm.registration_number || null,
        recognition_number:
          schoolForm.recognition_number || null,
        udise_code:
          schoolForm.udise_code || null,
        school_type:
          schoolForm.school_type || null,
        management_type:
          schoolForm.management_type || null,
        established_year:
          schoolForm.established_year === ""
            ? null
            : Number(
                schoolForm.established_year
              ),

        pan_number:
          schoolForm.pan_number || null,
        tan_number:
          schoolForm.tan_number || null,
        gst_number:
          schoolForm.gst_number || null,

        principal_name:
          schoolForm.principal_name || null,
        principal_email:
          schoolForm.principal_email || null,
        principal_phone:
          schoolForm.principal_phone || null,

        logo_url:
          schoolForm.logo_url || null,
        favicon_url:
          schoolForm.favicon_url || null,
        primary_color:
          schoolForm.primary_color || null,
        secondary_color:
          schoolForm.secondary_color || null,
        tagline:
          schoolForm.tagline || null,

        academic_year_start_month:
          Number(
            schoolForm.academic_year_start_month
          ),
        academic_year_end_month:
          Number(
            schoolForm.academic_year_end_month
          ),
        grading_system:
          schoolForm.grading_system || null,
        attendance_type:
          schoolForm.attendance_type || null,
        working_days_per_week:
          schoolForm.working_days_per_week === ""
            ? null
            : Number(
                schoolForm.working_days_per_week
              ),
      };

      const response = await updateSchool(
        school.id,
        payload
      );

      const updated = normalizeSchool(
        unwrap(response)
      );

      setSchool(updated);
      setSchoolForm(updated);
      setEditing(false);
      setMessage(t.success);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t.error
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function startCreateSchool() {
    if (!canSchoolCreate) {
      setError(t.noPermission);
      return;
    }

    setError("");
    setMessage("");
    setCreatingSchool(true);
    setEditing(true);
    setSchool(null);
    setSchoolForm({ ...EMPTY_SCHOOL });
    setSessions([]);
  }

  async function createNewSchool() {
    if (!canSchoolCreate) {
      setError(t.noPermission);
      return;
    }

    const name = schoolForm.name.trim();
    const code = schoolForm.code.trim();

    if (!name || !code) {
      setError(t.required);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name,
        code,
        email: schoolForm.email || null,
        phone: schoolForm.phone || null,
        address: schoolForm.address || null,
        city: schoolForm.city || null,
        state: schoolForm.state || null,
        country: schoolForm.country || "India",
        postal_code: schoolForm.postal_code || null,
        website: schoolForm.website || null,
        affiliation: schoolForm.affiliation || null,
        affiliation_number: schoolForm.affiliation_number || null,
        registration_number: schoolForm.registration_number || null,
        recognition_number: schoolForm.recognition_number || null,
        udise_code: schoolForm.udise_code || null,
        school_type: schoolForm.school_type || null,
        management_type: schoolForm.management_type || null,
        established_year:
          schoolForm.established_year === ""
            ? null
            : Number(schoolForm.established_year),
        pan_number: schoolForm.pan_number || null,
        tan_number: schoolForm.tan_number || null,
        gst_number: schoolForm.gst_number || null,
        principal_name: schoolForm.principal_name || null,
        principal_email: schoolForm.principal_email || null,
        principal_phone: schoolForm.principal_phone || null,
        logo_url: schoolForm.logo_url || null,
        favicon_url: schoolForm.favicon_url || null,
        primary_color: schoolForm.primary_color || null,
        secondary_color: schoolForm.secondary_color || null,
        tagline: schoolForm.tagline || null,
        academic_year_start_month: Number(
          schoolForm.academic_year_start_month || 4
        ),
        academic_year_end_month: Number(
          schoolForm.academic_year_end_month || 3
        ),
        grading_system: schoolForm.grading_system || null,
        attendance_type: schoolForm.attendance_type || null,
        working_days_per_week:
          schoolForm.working_days_per_week === ""
            ? null
            : Number(schoolForm.working_days_per_week),
      };

      const response = await createSchool(payload);
      const created = normalizeSchool(unwrap(response));

      setSchool(created);
      setSchoolForm(created);
      setSchools((previous) => {
        const withoutCreated = previous.filter(
          (item) => Number(item.id) !== Number(created.id)
        );
        return [...withoutCreated, created];
      });
      localStorage.setItem(
        "edusphere-selected-school-id",
        String(created.id)
      );
      window.dispatchEvent(
        new CustomEvent("edusphere-school-change", {
          detail: { schoolId: created.id, school: created },
        })
      );
      setCreatingSchool(false);
      setEditing(false);
      setMessage(t.success);
      await loadSessions(created.id);
    } catch (err) {
      setError(getErrorMessage(err, t.error));
    } finally {
      setSaving(false);
    }
  }

  function cancelSchoolEdit() {
    if (school) {
      setSchoolForm(
        normalizeSchool(school)
      );
    }

    setEditing(false);
    setError("");
  }

  async function toggleSchoolStatus() {
    if (!school || !canSchoolStatus) {
      setError(t.noPermission);
      return;
    }

    const nextStatus = !school.is_active;

    const confirmed = window.confirm(
      nextStatus
        ? t.confirmActivate
        : t.confirmDeactivate
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response =
        await updateSchoolStatus(
          school.id,
          nextStatus
        );

      const updated = normalizeSchool(
        unwrap(response)
      );

      setSchool(updated);
      setSchoolForm(updated);
      setMessage(t.success);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t.error
        )
      );
    }
  }

  function openCreateSession() {
    if (!canSessionCreate) {
      setError(t.noPermission);
      return;
    }
    setSessionMode("create");
    setSessionForm(EMPTY_SESSION);
    setSessionModal({
      mode: "create",
      id: null,
    });
    setError("");
  }

  function openEditSession(session) {
    if (!canSessionUpdate) {
      setError(t.noPermission);
      return;
    }
    setSessionMode("edit");
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
  }

  function openCloneSession(session) {
    if (!canSessionClone) {
      setError(t.noPermission);
      return;
    }
    setSessionMode("clone");
    setSessionForm({
      name: `${session.name} - Copy`,
      start_date: "",
      end_date: "",
    });

    setSessionModal({
      mode: "clone",
      id: session.id,
    });

    setError("");
  }

  function openCarryForward(session) {
    if (!canSessionCarryForward) {
      setError(t.noPermission);
      return;
    }
    setSessionMode("carry-forward");
    setSessionForm({
      name: "",
      start_date: "",
      end_date: "",
    });

    setSessionModal({
      mode: "carry-forward",
      id: session.id,
    });

    setError("");
  }

  function closeSessionModal() {
    setSessionModal(null);
    setSessionForm(EMPTY_SESSION);
    setSessionMode("create");
  }

  function updateSessionField(
    field,
    value
  ) {
    setSessionForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveSession() {
    if (!school) return;

    const name =
      sessionForm.name.trim();

    if (
      !name ||
      !sessionForm.start_date ||
      !sessionForm.end_date
    ) {
      setError(t.required);
      return;
    }

    if (
      sessionForm.end_date <=
      sessionForm.start_date
    ) {
      setError(t.invalidDates);
      return;
    }

    setSessionSaving(true);
    setError("");
    setMessage("");

    try {
      if (sessionMode === "create") {
        await createAcademicSession(
          school.id,
          {
            name,
            start_date:
              sessionForm.start_date,
            end_date:
              sessionForm.end_date,
          }
        );

        setMessage(
          t.sessionCreated
        );
      } else if (
        sessionMode === "edit"
      ) {
        await updateAcademicSession(
          sessionModal.id,
          {
            name,
            start_date:
              sessionForm.start_date,
            end_date:
              sessionForm.end_date,
          }
        );

        setMessage(
          t.sessionUpdated
        );
      } else if (
        sessionMode === "clone"
      ) {
        await cloneAcademicSession(
          sessionModal.id,
          {
            name,
            start_date:
              sessionForm.start_date,
            end_date:
              sessionForm.end_date,
            carry_forward: false,
          }
        );

        setMessage(
          t.sessionCloned
        );
      } else if (
        sessionMode ===
        "carry-forward"
      ) {
        await carryForwardAcademicSession(
          sessionModal.id,
          {
            name,
            start_date:
              sessionForm.start_date,
            end_date:
              sessionForm.end_date,
            carry_forward: true,
          }
        );

        setMessage(
          t.sessionCarried
        );
      }

      closeSessionModal();
      await loadSessions(school.id);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t.error
        )
      );
    } finally {
      setSessionSaving(false);
    }
  }

  async function makeCurrent(session) {
    if (!school || !canSessionCurrent) {
      setError(t.noPermission);
      return;
    }

    if (
      session.is_current ||
      session.is_closed ||
      session.is_archived ||
      !session.is_active
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await setCurrentAcademicSession(
        session.id
      );

      setMessage(
        t.sessionCurrent
      );

      await loadSessions(
        school.id
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t.error
        )
      );
    }
  }

  async function toggleSessionStatus(
    session
  ) {
    if (!canSessionStatus) {
      setError(t.noPermission);
      return;
    }
    const nextStatus =
      !session.is_active;

    setError("");
    setMessage("");

    try {
      await updateAcademicSessionStatus(
        session.id,
        nextStatus
      );

      await loadSessions(
        school.id
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t.error
        )
      );
    }
  }

  async function handleCloseSession(
    session
  ) {
    if (!canSessionClose) {
      setError(t.noPermission);
      return;
    }
    const confirmed =
      window.confirm(
        t.confirmClose
      );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await closeAcademicSession(
        session.id
      );

      setMessage(
        t.sessionClosed
      );

      await loadSessions(
        school.id
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t.error
        )
      );
    }
  }

  async function handleArchiveSession(
    session
  ) {
    if (!canSessionArchive) {
      setError(t.noPermission);
      return;
    }
    const confirmed =
      window.confirm(
        t.confirmArchive
      );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await archiveAcademicSession(
        session.id
      );

      setMessage(
        t.sessionArchived
      );

      await loadSessions(
        school.id
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t.error
        )
      );
    }
  }

  if (!canSchoolView) {
    return (
      <div className="school-profile-page">
        <div className="sp-empty">
          <div className="sp-empty-icon">🔒</div>
          <h2>{t.noPermission}</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="school-profile-page">
        <div className="sp-loading">
          <div className="sp-spinner" />
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!school) {
    if (creatingSchool) {
      return (
        <div className="school-profile-page">
          <div className="sp-hero">
            <div className="sp-hero-left">
              <div className="sp-logo"><span>🏫</span></div>
              <div>
                <div className="sp-eyebrow">EDUSPHERE</div>
                <h1>{t.createSchool}</h1>
                <p>{t.subtitle}</p>
              </div>
            </div>
            <div className="sp-hero-actions">
              <button
                type="button"
                className="sp-btn sp-btn-secondary"
                onClick={() => {
                  setCreatingSchool(false);
                  setEditing(false);
                  setSchoolForm({ ...EMPTY_SCHOOL });
                  setError("");
                  setMessage("");
                }}
                disabled={saving}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="sp-btn sp-btn-primary"
                onClick={createNewSchool}
                disabled={saving}
              >
                {saving ? t.creating : `✓ ${t.createSchool}`}
              </button>
            </div>
          </div>

          {message && (
            <div className="sp-alert sp-alert-success"><span>✓</span><span>{message}</span></div>
          )}
          {error && (
            <div className="sp-alert sp-alert-error"><span>!</span><span>{error}</span></div>
          )}

          <Section title={t.identity} editing onEdit={undefined} editLabel={t.edit}>
            <Field label={`${t.schoolName} *`} value={schoolForm.name}
              onChange={(value) => updateSchoolField("name", value)} disabled={!canSchoolCreate} />
            <Field label={`${t.schoolCode} *`} value={schoolForm.code}
              onChange={(value) => updateSchoolField("code", value.toUpperCase())} disabled={!canSchoolCreate} />
            <Field label={t.schoolType} value={schoolForm.school_type}
              onChange={(value) => updateSchoolField("school_type", value)} disabled={!canSchoolCreate} />
            <Field label={t.managementType} value={schoolForm.management_type}
              onChange={(value) => updateSchoolField("management_type", value)} disabled={!canSchoolCreate} />
            <Field label={t.establishedYear} type="number" value={schoolForm.established_year}
              onChange={(value) => updateSchoolField("established_year", value)} disabled={!canSchoolCreate} />
          </Section>

          <Section title={t.contact} editing onEdit={undefined} editLabel={t.edit}>
            <Field label={t.email} type="email" value={schoolForm.email}
              onChange={(value) => updateSchoolField("email", value)} disabled={!canSchoolCreate} />
            <Field label={t.phone} value={schoolForm.phone}
              onChange={(value) => updateSchoolField("phone", value)} disabled={!canSchoolCreate} />
            <Field label={t.website} value={schoolForm.website}
              onChange={(value) => updateSchoolField("website", value)} disabled={!canSchoolCreate} />
            <Field label={t.city} value={schoolForm.city}
              onChange={(value) => updateSchoolField("city", value)} disabled={!canSchoolCreate} />
            <Field label={t.state} value={schoolForm.state}
              onChange={(value) => updateSchoolField("state", value)} disabled={!canSchoolCreate} />
            <Field label={t.country} value={schoolForm.country}
              onChange={(value) => updateSchoolField("country", value)} disabled={!canSchoolCreate} />
            <Field label={t.postalCode} value={schoolForm.postal_code}
              onChange={(value) => updateSchoolField("postal_code", value)} disabled={!canSchoolCreate} />
            <label className="sp-field sp-field-wide"><span>{t.address}</span>
              <textarea value={schoolForm.address} onChange={(e) => updateSchoolField("address", e.target.value)} disabled={!canSchoolCreate} rows={3} />
            </label>
          </Section>

          <Section title={t.registration} editing onEdit={undefined} editLabel={t.edit}>
            <Field label={t.affiliation} value={schoolForm.affiliation} onChange={(v) => updateSchoolField("affiliation", v)} disabled={!canSchoolCreate} />
            <Field label={t.affiliationNumber} value={schoolForm.affiliation_number} onChange={(v) => updateSchoolField("affiliation_number", v)} disabled={!canSchoolCreate} />
            <Field label={t.registrationNumber} value={schoolForm.registration_number} onChange={(v) => updateSchoolField("registration_number", v)} disabled={!canSchoolCreate} />
            <Field label={t.recognitionNumber} value={schoolForm.recognition_number} onChange={(v) => updateSchoolField("recognition_number", v)} disabled={!canSchoolCreate} />
            <Field label={t.udiseCode} value={schoolForm.udise_code} onChange={(v) => updateSchoolField("udise_code", v)} disabled={!canSchoolCreate} />
          </Section>

          <Section title={t.tax} editing onEdit={undefined} editLabel={t.edit}>
            <Field label={t.panNumber} value={schoolForm.pan_number} onChange={(v) => updateSchoolField("pan_number", v)} disabled={!canSchoolCreate} />
            <Field label={t.tanNumber} value={schoolForm.tan_number} onChange={(v) => updateSchoolField("tan_number", v)} disabled={!canSchoolCreate} />
            <Field label={t.gstNumber} value={schoolForm.gst_number} onChange={(v) => updateSchoolField("gst_number", v)} disabled={!canSchoolCreate} />
          </Section>

          <Section title={t.leadership} editing onEdit={undefined} editLabel={t.edit}>
            <Field label={t.principalName} value={schoolForm.principal_name} onChange={(v) => updateSchoolField("principal_name", v)} disabled={!canSchoolCreate} />
            <Field label={t.principalEmail} type="email" value={schoolForm.principal_email} onChange={(v) => updateSchoolField("principal_email", v)} disabled={!canSchoolCreate} />
            <Field label={t.principalPhone} value={schoolForm.principal_phone} onChange={(v) => updateSchoolField("principal_phone", v)} disabled={!canSchoolCreate} />
          </Section>

          <Section title={t.academic} editing onEdit={undefined} editLabel={t.edit}>
            <SelectField label={t.yearStart} value={schoolForm.academic_year_start_month} onChange={(v) => updateSchoolField("academic_year_start_month", Number(v))} disabled={!canSchoolCreate}>
              {MONTHS.map(([number, en, hi]) => <option key={number} value={number}>{language === "HI" ? hi : en}</option>)}
            </SelectField>
            <SelectField label={t.yearEnd} value={schoolForm.academic_year_end_month} onChange={(v) => updateSchoolField("academic_year_end_month", Number(v))} disabled={!canSchoolCreate}>
              {MONTHS.map(([number, en, hi]) => <option key={number} value={number}>{language === "HI" ? hi : en}</option>)}
            </SelectField>
            <Field label={t.gradingSystem} value={schoolForm.grading_system} onChange={(v) => updateSchoolField("grading_system", v)} disabled={!canSchoolCreate} />
            <Field label={t.attendanceType} value={schoolForm.attendance_type} onChange={(v) => updateSchoolField("attendance_type", v)} disabled={!canSchoolCreate} />
            <Field label={t.workingDays} type="number" value={schoolForm.working_days_per_week} onChange={(v) => updateSchoolField("working_days_per_week", v)} disabled={!canSchoolCreate} />
          </Section>
        </div>
      );
    }

    return (
      <div className="school-profile-page">
        <div className="sp-empty">
          <div className="sp-empty-icon">🏫</div>
          <h2>{t.noSchool}</h2>
          {canSchoolCreate ? (
            <>
              <p>{t.subtitle}</p>
              <button type="button" className="sp-btn sp-btn-primary" onClick={startCreateSchool}>
                + {t.addSchool}
              </button>
            </>
          ) : (
            <p>{t.noPermission}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="school-profile-page">
      {/* ================================================================
          HEADER
      ================================================================ */}

      <div className="sp-hero">
        <div className="sp-hero-left">
          <div className="sp-logo">
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt={school.name}
              />
            ) : (
              <span>🏫</span>
            )}
          </div>

          <div>
            <div className="sp-eyebrow">
              {school.code}
            </div>

            <h1>{school.name}</h1>

            <p>
              {school.tagline ||
                t.subtitle}
            </p>

            <div className="sp-status-row">
              <span
                className={`sp-status ${
                  school.is_active
                    ? "sp-status-active"
                    : "sp-status-inactive"
                }`}
              >
                <span className="sp-status-dot" />
                {school.is_active
                  ? t.active
                  : t.inactive}
              </span>

              {currentSession && (
                <span className="sp-current-badge">
                  {currentSession.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="sp-hero-actions">
          {schools.length > 0 && !creatingSchool && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: "220px",
                padding: "8px 10px",
                border: "1px solid #d8def0",
                borderRadius: "12px",
                background: "#ffffff",
              }}
              title={t.switchSchool}
            >
              <span
                aria-hidden="true"
                style={{ fontSize: "18px" }}
              >
                🏫
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#68708d",
                    marginBottom: "2px",
                  }}
                >
                  {t.selectSchool}
                </span>
                <select
                  value={school?.id ?? ""}
                  onChange={handleSchoolChange}
                  style={{
                    width: "100%",
                    border: 0,
                    outline: 0,
                    background: "transparent",
                    color: "#18203d",
                    fontWeight: 800,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                  aria-label={t.selectSchool}
                >
                  {schools.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </span>
            </label>
          )}

          {canSchoolCreate && !creatingSchool && (
            <button
              type="button"
              className="sp-btn sp-btn-secondary"
              onClick={startCreateSchool}
            >
              + {t.addSchool}
            </button>
          )}

          {!editing ? (
            canSchoolUpdate && (
            <button
              type="button"
              className="sp-btn sp-btn-primary"
              onClick={() =>
                setEditing(true)
              }
            >
              ✎ {t.edit}
            </button>
            )
          ) : (
            <>
              <button
                type="button"
                className="sp-btn sp-btn-secondary"
                onClick={
                  cancelSchoolEdit
                }
                disabled={saving}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                className="sp-btn sp-btn-primary"
                onClick={
                  saveSchoolChanges
                }
                disabled={saving}
              >
                {saving
                  ? t.saving
                  : `✓ ${t.save}`}
              </button>
            </>
          )}

          <button
            type="button"
            className="sp-btn sp-btn-secondary"
            onClick={loadData}
            disabled={loading}
          >
            ↻ {t.refresh}
          </button>

          {canSchoolStatus && (
          <button
            type="button"
            className={`sp-btn ${
              school.is_active
                ? "sp-btn-danger"
                : "sp-btn-success"
            }`}
            onClick={
              toggleSchoolStatus
            }
          >
            {school.is_active
              ? t.deactivate
              : t.activate}
          </button>
          )}
        </div>
      </div>

      {/* ================================================================
          ALERTS
      ================================================================ */}

      {message && (
        <div className="sp-alert sp-alert-success">
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="sp-alert sp-alert-error">
          <span>!</span>
          <span>{error}</span>
        </div>
      )}

      {/* ================================================================
          STATS
      ================================================================ */}

      <div className="sp-stats">
        <div className="sp-stat-card">
          <span className="sp-stat-icon">
            🏫
          </span>
          <div>
            <strong>
              {school.is_active
                ? t.active
                : t.inactive}
            </strong>
            <small>
              {t.schoolStatus}
            </small>
          </div>
        </div>

        <div className="sp-stat-card">
          <span className="sp-stat-icon">
            📚
          </span>
          <div>
            <strong>
              {sessions.length}
            </strong>
            <small>
              {t.sessionCount}
            </small>
          </div>
        </div>

        <div className="sp-stat-card">
          <span className="sp-stat-icon">
            ⭐
          </span>
          <div>
            <strong>
              {currentSession?.name ||
                "—"}
            </strong>
            <small>
              {t.currentSession}
            </small>
          </div>
        </div>

        <div className="sp-stat-card">
          <span className="sp-stat-icon">
            📅
          </span>
          <div>
            <strong>
              {school.academic_year_start_month ||
                4}
              /
              {school.academic_year_end_month ||
                3}
            </strong>
            <small>{t.academicCycle}</small>
          </div>
        </div>
      </div>

      {/* ================================================================
          SCHOOL IDENTITY
      ================================================================ */}

      <Section
        title={t.identity}
        editing={editing}
        onEdit={canSchoolUpdate ? () => setEditing(true) : undefined}
        editLabel={t.edit}
      >
        <Field
          label={t.schoolName}
          value={schoolForm.name}
          onChange={(value) =>
            updateSchoolField(
              "name",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.schoolCode}
          value={schoolForm.code}
          onChange={() => {}}
          disabled
        />

        <Field
          label={t.schoolType}
          value={schoolForm.school_type}
          onChange={(value) =>
            updateSchoolField(
              "school_type",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.managementType}
          value={
            schoolForm.management_type
          }
          onChange={(value) =>
            updateSchoolField(
              "management_type",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.establishedYear}
          type="number"
          value={
            schoolForm.established_year
          }
          onChange={(value) =>
            updateSchoolField(
              "established_year",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />
      </Section>

      {/* ================================================================
          CONTACT
      ================================================================ */}

      <Section
        title={t.contact}
        editing={editing}
        onEdit={canSchoolUpdate ? () => setEditing(true) : undefined}
        editLabel={t.edit}
      >
        <Field
          label={t.email}
          type="email"
          value={schoolForm.email}
          onChange={(value) =>
            updateSchoolField(
              "email",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.phone}
          value={schoolForm.phone}
          onChange={(value) =>
            updateSchoolField(
              "phone",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.website}
          value={schoolForm.website}
          onChange={(value) =>
            updateSchoolField(
              "website",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.city}
          value={schoolForm.city}
          onChange={(value) =>
            updateSchoolField(
              "city",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.state}
          value={schoolForm.state}
          onChange={(value) =>
            updateSchoolField(
              "state",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.country}
          value={schoolForm.country}
          onChange={(value) =>
            updateSchoolField(
              "country",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.postalCode}
          value={
            schoolForm.postal_code
          }
          onChange={(value) =>
            updateSchoolField(
              "postal_code",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <label className="sp-field sp-field-wide">
          <span>{t.address}</span>
          <textarea
            value={
              schoolForm.address
            }
            onChange={(event) =>
              updateSchoolField(
                "address",
                event.target.value
              )
            }
            disabled={!editing || !canSchoolUpdate}
            rows={3}
          />
        </label>
      </Section>

      {/* ================================================================
          REGISTRATION
      ================================================================ */}

      <Section
        title={t.registration}
        editing={editing}
        onEdit={canSchoolUpdate ? () => setEditing(true) : undefined}
        editLabel={t.edit}
      >
        <Field
          label={t.affiliation}
          value={
            schoolForm.affiliation
          }
          onChange={(value) =>
            updateSchoolField(
              "affiliation",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={
            t.affiliationNumber
          }
          value={
            schoolForm.affiliation_number
          }
          onChange={(value) =>
            updateSchoolField(
              "affiliation_number",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={
            t.registrationNumber
          }
          value={
            schoolForm.registration_number
          }
          onChange={(value) =>
            updateSchoolField(
              "registration_number",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={
            t.recognitionNumber
          }
          value={
            schoolForm.recognition_number
          }
          onChange={(value) =>
            updateSchoolField(
              "recognition_number",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.udiseCode}
          value={
            schoolForm.udise_code
          }
          onChange={(value) =>
            updateSchoolField(
              "udise_code",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />
      </Section>

      {/* ================================================================
          TAX
      ================================================================ */}

      <Section
        title={t.tax}
        editing={editing}
        onEdit={canSchoolUpdate ? () => setEditing(true) : undefined}
        editLabel={t.edit}
      >
        <Field
          label={t.panNumber}
          value={
            schoolForm.pan_number
          }
          onChange={(value) =>
            updateSchoolField(
              "pan_number",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.tanNumber}
          value={
            schoolForm.tan_number
          }
          onChange={(value) =>
            updateSchoolField(
              "tan_number",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.gstNumber}
          value={
            schoolForm.gst_number
          }
          onChange={(value) =>
            updateSchoolField(
              "gst_number",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />
      </Section>

      {/* ================================================================
          LEADERSHIP
      ================================================================ */}

      <Section
        title={t.leadership}
        editing={editing}
        onEdit={canSchoolUpdate ? () => setEditing(true) : undefined}
        editLabel={t.edit}
      >
        <Field
          label={t.principalName}
          value={
            schoolForm.principal_name
          }
          onChange={(value) =>
            updateSchoolField(
              "principal_name",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.principalEmail}
          type="email"
          value={
            schoolForm.principal_email
          }
          onChange={(value) =>
            updateSchoolField(
              "principal_email",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.principalPhone}
          value={
            schoolForm.principal_phone
          }
          onChange={(value) =>
            updateSchoolField(
              "principal_phone",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />
      </Section>

      {/* ================================================================
          BRANDING
      ================================================================ */}

      <Section
        title={t.branding}
        editing={editing}
        onEdit={canSchoolUpdate ? () => setEditing(true) : undefined}
        editLabel={t.edit}
      >
        <div className="sp-logo-uploader sp-field sp-field-wide">
          <span>{t.logoUrl}</span>

          <div className="sp-logo-upload-card">
            <div className="sp-logo-upload-preview">
              {schoolForm.logo_url ? (
                <img
                  src={schoolForm.logo_url}
                  alt={`${schoolForm.name || "School"} logo`}
                />
              ) : (
                <span>🏫</span>
              )}
            </div>

            <div className="sp-logo-upload-content">
              <strong>
                {schoolForm.logo_url ? t.changeLogo : t.uploadLogo}
              </strong>
              <p>{t.logoHint}</p>

              {logoProcessing && (
                <span className="sp-logo-upload-status">{t.logoProcessing}</span>
              )}

              {!logoProcessing && editing && schoolForm.logo_url && (
                <span className="sp-logo-upload-status">{t.logoSelected}</span>
              )}

              <div className="sp-logo-upload-actions">
                <button
                  type="button"
                  className="sp-btn sp-btn-primary sp-btn-small"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={!editing || logoProcessing || saving}
                >
                  📷 {schoolForm.logo_url ? t.changeLogo : t.uploadLogo}
                </button>

                {schoolForm.logo_url && (
                  <button
                    type="button"
                    className="sp-btn sp-btn-secondary sp-btn-small"
                    onClick={removeLogo}
                    disabled={!editing || logoProcessing || saving}
                  >
                    ✕ {t.removeLogo}
                  </button>
                )}
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoSelect}
                disabled={!editing || logoProcessing || saving}
                className="sp-logo-file-input"
                aria-label={t.uploadLogo}
              />
            </div>
          </div>
        </div>

        <Field
          label={t.faviconUrl}
          value={
            schoolForm.favicon_url
          }
          onChange={(value) =>
            updateSchoolField(
              "favicon_url",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />

        <Field
          label={t.primaryColor}
          value={
            schoolForm.primary_color
          }
          onChange={(value) =>
            updateSchoolField(
              "primary_color",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
          placeholder="#1E40AF"
        />

        <Field
          label={t.secondaryColor}
          value={
            schoolForm.secondary_color
          }
          onChange={(value) =>
            updateSchoolField(
              "secondary_color",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
          placeholder="#64748B"
        />

        <Field
          label={t.tagline}
          value={
            schoolForm.tagline
          }
          onChange={(value) =>
            updateSchoolField(
              "tagline",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />
      </Section>

      {/* ================================================================
          ACADEMIC CONFIGURATION
      ================================================================ */}

      <Section
        title={t.academic}
        editing={editing}
        onEdit={canSchoolUpdate ? () => setEditing(true) : undefined}
        editLabel={t.edit}
      >
        <SelectField
          label={t.yearStart}
          value={
            schoolForm.academic_year_start_month
          }
          onChange={(value) =>
            updateSchoolField(
              "academic_year_start_month",
              Number(value)
            )
          }
          disabled={!editing || !canSchoolUpdate}
        >
          {MONTHS.map(
            ([number, en, hi]) => (
              <option
                key={number}
                value={number}
              >
                {language === "HI"
                  ? hi
                  : en}
              </option>
            )
          )}
        </SelectField>

        <SelectField
          label={t.yearEnd}
          value={
            schoolForm.academic_year_end_month
          }
          onChange={(value) =>
            updateSchoolField(
              "academic_year_end_month",
              Number(value)
            )
          }
          disabled={!editing || !canSchoolUpdate}
        >
          {MONTHS.map(
            ([number, en, hi]) => (
              <option
                key={number}
                value={number}
              >
                {language === "HI"
                  ? hi
                  : en}
              </option>
            )
          )}
        </SelectField>

        <SelectField
          label={t.gradingSystem}
          value={
            schoolForm.grading_system
          }
          onChange={(value) =>
            updateSchoolField(
              "grading_system",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        >
          <option value="">
            {t.notConfigured}
          </option>
          <option value="percentage">
            {t.percentage}
          </option>
          <option value="grade">
            {t.grade}
          </option>
          <option value="cgpa">
            {t.cgpa}
          </option>
          <option value="gpa">
            {t.gpa}
          </option>
          <option value="custom">
            {t.custom}
          </option>
        </SelectField>

        <SelectField
          label={t.attendanceType}
          value={
            schoolForm.attendance_type
          }
          onChange={(value) =>
            updateSchoolField(
              "attendance_type",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        >
          <option value="">
            {t.notConfigured}
          </option>
          <option value="daily">
            {t.daily}
          </option>
          <option value="period">
            {t.periodWise}
          </option>
          <option value="both">
            {t.dailyPeriod}
          </option>
        </SelectField>

        <Field
          label={t.workingDays}
          type="number"
          value={
            schoolForm.working_days_per_week
          }
          onChange={(value) =>
            updateSchoolField(
              "working_days_per_week",
              value
            )
          }
          disabled={!editing || !canSchoolUpdate}
        />
      </Section>

      {/* ================================================================
          ACADEMIC SESSIONS
      ================================================================ */}

      <section className="sp-section sp-session-section">
        <div className="sp-section-header">
          <div>
            <h2>{t.sessions}</h2>

            <p className="sp-section-subtitle">
              {currentSession
                ? `${t.currentSession}: ${currentSession.name}`
                : t.noSessions}
            </p>
          </div>

          <button
            type="button"
            className="sp-btn sp-btn-primary"
            onClick={
              openCreateSession
            }
            disabled={!school.is_active || !canSessionCreate}
          >
            + {t.addSession}
          </button>
        </div>

        {sessionsLoading ? (
          <div className="sp-session-loading">
            <div className="sp-spinner" />
            {t.loadingSessions}
          </div>
        ) : sessions.length === 0 ? (
          <div className="sp-empty sp-empty-small">
            <div className="sp-empty-icon">
              📚
            </div>

            <p>{t.noSessions}</p>
          </div>
        ) : (
          <div className="sp-session-list">
            {sessions.map(
              (session) => (
                <div
                  key={session.id}
                  className={`sp-session-card ${
                    session.is_current
                      ? "sp-session-current"
                      : ""
                  } ${
                    session.is_archived
                      ? "sp-session-archived"
                      : ""
                  }`}
                >
                  <div className="sp-session-main">
                    <div className="sp-session-title-row">
                      <h3>
                        {session.name}
                      </h3>

                      {session.is_current && (
                        <span className="sp-session-badge sp-badge-current">
                          ✓ {t.current}
                        </span>
                      )}

                      {session.is_closed && (
                        <span className="sp-session-badge sp-badge-closed">
                          {t.closed}
                        </span>
                      )}

                      {session.is_archived && (
                        <span className="sp-session-badge sp-badge-archived">
                          {t.archived}
                        </span>
                      )}
                    </div>

                    <div className="sp-session-meta">
                      <span>
                        📅{" "}
                        {session.start_date}
                      </span>

                      <span>→</span>

                      <span>
                        📅{" "}
                        {session.end_date}
                      </span>

                      <span
                        className={
                          session.is_active
                            ? "sp-text-success"
                            : "sp-text-muted"
                        }
                      >
                        ●{" "}
                        {session.is_active
                          ? t.sessionActive
                          : t.sessionInactive}
                      </span>
                    </div>

                    {(session.cloned_from_session_id ||
                      session.carried_forward_from_session_id) && (
                      <div className="sp-session-origin">
                        {session.carried_forward_from_session_id
                          ? `↗ ${t.carryForward}`
                          : `⧉ ${t.clone}`}
                      </div>
                    )}
                  </div>

                  <div className="sp-session-actions">
                    {canSessionCurrent &&
                      !session.is_current &&
                      !session.is_closed &&
                      !session.is_archived &&
                      session.is_active && (
                        <button
                          type="button"
                          className="sp-btn sp-btn-primary sp-btn-small"
                          onClick={() =>
                            makeCurrent(
                              session
                            )
                          }
                        >
                          ⭐{" "}
                          {t.setCurrent}
                        </button>
                      )}

                    {canSessionUpdate &&
                      !session.is_archived &&
                      !session.is_closed && (
                        <button
                          type="button"
                          className="sp-btn sp-btn-secondary sp-btn-small"
                          onClick={() =>
                            openEditSession(
                              session
                            )
                          }
                        >
                          ✎ {t.edit}
                        </button>
                      )}

                    {canSessionClone &&
                      !session.is_archived &&
                      !session.is_closed && (
                        <button
                          type="button"
                          className="sp-btn sp-btn-secondary sp-btn-small"
                          onClick={() =>
                            openCloneSession(
                              session
                            )
                          }
                        >
                          ⧉ {t.clone}
                        </button>
                      )}

                    {canSessionCarryForward &&
                      !session.is_archived &&
                      !session.is_closed && (
                        <button
                          type="button"
                          className="sp-btn sp-btn-secondary sp-btn-small"
                          onClick={() =>
                            openCarryForward(
                              session
                            )
                          }
                        >
                          ↗{" "}
                          {t.carryForward}
                        </button>
                      )}

                    {canSessionClose &&
                      !session.is_archived &&
                      !session.is_closed &&
                      !session.is_current && (
                        <button
                          type="button"
                          className="sp-btn sp-btn-warning sp-btn-small"
                          onClick={() =>
                            handleCloseSession(
                              session
                            )
                          }
                        >
                          🔒{" "}
                          {t.closeSession}
                        </button>
                      )}

                    {canSessionArchive &&
                      session.is_closed &&
                      !session.is_archived && (
                        <button
                          type="button"
                          className="sp-btn sp-btn-danger sp-btn-small"
                          onClick={() =>
                            handleArchiveSession(
                              session
                            )
                          }
                        >
                          🗄{" "}
                          {t.archiveSession}
                        </button>
                      )}

                    {canSessionStatus &&
                      !session.is_current &&
                      !session.is_archived &&
                      !session.is_closed && (
                        <button
                          type="button"
                          className="sp-btn sp-btn-secondary sp-btn-small"
                          onClick={() =>
                            toggleSessionStatus(
                              session
                            )
                          }
                        >
                          {session.is_active
                            ? t.deactivate
                            : t.activate}
                        </button>
                      )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* ================================================================
          SAVE BAR
      ================================================================ */}

      {editing && (
        <div className="sp-save-bar">
          <div>
            <strong>
              {t.unsavedChanges}
            </strong>

            <span>
              {t.saveHint}
            </span>
          </div>

          <div className="sp-save-actions">
            <button
              type="button"
              className="sp-btn sp-btn-secondary"
              onClick={
                cancelSchoolEdit
              }
              disabled={saving}
            >
              {t.cancel}
            </button>

            <button
              type="button"
              className="sp-btn sp-btn-primary"
              onClick={
                saveSchoolChanges
              }
              disabled={saving}
            >
              {saving
                ? t.saving
                : `✓ ${t.save}`}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          SESSION MODAL
      ================================================================ */}

      {sessionModal && (
        <div
          className="sp-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeSessionModal();
            }
          }}
        >
          <div className="sp-modal">
            <div className="sp-modal-header">
              <div>
                <span className="sp-modal-eyebrow">
                  {sessionMode === "create"
                    ? t.createSession
                    : sessionMode === "edit"
                    ? t.editSession
                    : sessionMode === "clone"
                    ? t.cloneSession
                    : t.carryForward}
                </span>

                <h2>
                  {sessionMode === "create"
                    ? t.createSession
                    : sessionMode === "edit"
                    ? t.editSession
                    : sessionMode === "clone"
                    ? t.cloneSession
                    : t.carryForward}
                </h2>
              </div>

              <button
                type="button"
                className="sp-modal-close"
                onClick={
                  closeSessionModal
                }
                disabled={sessionSaving}
              >
                ×
              </button>
            </div>

            <div className="sp-modal-body">
              <Field
                label={t.sessionName}
                value={
                  sessionForm.name
                }
                onChange={(value) =>
                  updateSessionField(
                    "name",
                    value
                  )
                }
                disabled={sessionSaving}
              />

              <Field
                label={t.startDate}
                type="date"
                value={
                  sessionForm.start_date
                }
                onChange={(value) =>
                  updateSessionField(
                    "start_date",
                    value
                  )
                }
                disabled={sessionSaving}
              />

              <Field
                label={t.endDate}
                type="date"
                value={
                  sessionForm.end_date
                }
                onChange={(value) =>
                  updateSessionField(
                    "end_date",
                    value
                  )
                }
                disabled={sessionSaving}
              />

              {sessionMode ===
                "carry-forward" && (
                <div className="sp-modal-info">
                  <span>↗</span>
                  <div>
                    <strong>
                      {t.carryForward}
                    </strong>
                    <p>
                      {t.carryInfo}
                    </p>
                  </div>
                </div>
              )}

              {sessionMode ===
                "clone" && (
                <div className="sp-modal-info">
                  <span>⧉</span>
                  <div>
                    <strong>
                      {t.clone}
                    </strong>
                    <p>
                      {t.cloneInfo}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="sp-modal-footer">
              <button
                type="button"
                className="sp-btn sp-btn-secondary"
                onClick={
                  closeSessionModal
                }
                disabled={sessionSaving}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                className="sp-btn sp-btn-primary"
                onClick={saveSession}
                disabled={sessionSaving}
              >
                {sessionSaving
                  ? t.saving
                  : sessionMode ===
                    "edit"
                  ? `✓ ${t.update}`
                  : `✓ ${t.create}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}