
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getSchools, getAcademicSessions, getCurrentAcademicSession } from "../api/school";
import {
  Wallet,
  Layers3,
  ClipboardList,
  CreditCard,
  ReceiptText,
  AlertCircle,
  Search,
  ArrowRight,
  Plus,
  RefreshCw,
  Printer,
  RotateCcw,
  IndianRupee,
  CheckCircle2,
  X,
} from "lucide-react";

import { listFeeStructures } from "../api/feeStructures";
import {
  listStudentFeePlans,
  getStudentFeePlan,
} from "../api/studentFeePlans";
import {
  listFeePayments,
  createFeePayment,
  getFeePaymentReceipt,
  reverseFeePayment,
} from "../api/feePayments";

import "../fee-management.css";

function createPaymentIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return `fee-${globalThis.crypto.randomUUID()}`;
  }
  return `fee-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const TEXT = {
  en: {
    kicker: "FINANCE · SCHOOL CORE",
    title: "Fee Management",
    subtitle:
      "Manage fee structures, student fee plans, collections and receipts.",
    overview: "Overview",
    structures: "Fee Structures",
    plans: "Student Fee Plans",
    payments: "Payments",
    receipts: "Receipts",
    recovery: "Recovery",
    totalStructures: "Total Structures",
    activeStructures: "Active Structures",
    totalPlans: "Student Fee Plans",
    pendingRecovery: "Payments Recorded",
    search: "Search structures, students or receipts...",
    refresh: "Refresh",
    createStructure: "Create Structure",
    createPlan: "Create Student Plan",
    active: "Active",
    inactive: "Inactive",
    noStructures: "No fee structures found.",
    noPlans: "No student fee plans found.",
    noPayments: "No payments found.",
    loading: "Loading fee management...",
    failed: "Unable to load fee management data.",
    feeHead: "Fee Head",
    frequency: "Frequency",
    amount: "Amount",
    class: "Class",
    status: "Status",
    gross: "Gross",
    net: "Net Payable",
    installments: "Installments",
    workspace: "Workspace",
    view: "View",
    configuration: "Configuration",
    studentBilling: "Student Billing",
    recordPayment: "Record Payment",
    paymentHistory: "Payment History",
    selectPlan: "Select Student Fee Plan",
    selectPlanFirst: "Select a student fee plan",
    paymentAmount: "Payment Amount (₹)",
    paymentDate: "Payment Date",
    paymentMode: "Payment Mode",
    reference: "Reference Number",
    remarks: "Remarks",
    savePayment: "Save Payment",
    saving: "Saving payment...",
    cash: "Cash",
    upi: "UPI",
    bank: "Bank Transfer",
    card: "Card",
    cheque: "Cheque",
    other: "Other",
    student: "Student",
    receiptNo: "Receipt Number",
    date: "Date",
    mode: "Mode",
    print: "Print Receipt",
    openReceipt: "View Receipt",
    noReceipt: "Select a payment to view its receipt.",
    paid: "Amount Paid",
    balance: "Outstanding Balance",
    planAmount: "Plan Amount",
    reversal: "Reverse Payment",
    reversalReason: "Reason for reversal",
    confirmReverse: "Confirm Reversal",
    cancel: "Cancel",
    reversed: "Reversed",
    completed: "Completed",
    reverseWarning:
      "Reversal will mark this payment as reversed. Enter a clear reason.",
    paymentSuccess: "Payment recorded successfully.",
    reversalSuccess: "Payment reversed successfully.",
    invalidAmount: "Enter a valid payment amount greater than zero.",
    choosePlan: "Please select a student fee plan.",
    error: "Something went wrong.",
    noActivePlans: "No student fee plans are available.",
    choosePayment: "Select a payment from the history.",
    receivedBy: "Received By",
    transaction: "Accounting Transaction",
    all: "All",
    receipt: "Fee Receipt",
    admissionNo: "Admission No.",
    className: "Class",
    referenceLabel: "Reference",
    note: "Note",
    recoveryText: "Outstanding balances can be reviewed through student fee plans.",
    comingSoon: "This section is not connected to a dedicated recovery workflow yet.",
  },
  hi: {
    kicker: "वित्त · स्कूल कोर",
    title: "फीस प्रबंधन",
    subtitle: "फीस स्ट्रक्चर, स्टूडेंट प्लान, पेमेंट और रसीदें मैनेज करें।",
    overview: "ओवरव्यू",
    structures: "फीस स्ट्रक्चर",
    plans: "स्टूडेंट फीस प्लान",
    payments: "पेमेंट्स",
    receipts: "रसीदें",
    recovery: "रिकवरी",
    totalStructures: "कुल स्ट्रक्चर",
    activeStructures: "सक्रिय स्ट्रक्चर",
    totalPlans: "स्टूडेंट फीस प्लान",
    pendingRecovery: "दर्ज पेमेंट",
    search: "स्ट्रक्चर, स्टूडेंट या रसीद खोजें...",
    refresh: "रीफ्रेश",
    createStructure: "स्ट्रक्चर बनाएं",
    createPlan: "स्टूडेंट प्लान बनाएं",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    noStructures: "कोई फीस स्ट्रक्चर नहीं मिला।",
    noPlans: "कोई स्टूडेंट फीस प्लान नहीं मिला।",
    noPayments: "कोई पेमेंट नहीं मिला।",
    loading: "फीस प्रबंधन लोड हो रहा है...",
    failed: "फीस प्रबंधन डेटा लोड नहीं हो सका।",
    feeHead: "फीस हेड",
    frequency: "फ्रीक्वेंसी",
    amount: "राशि",
    class: "कक्षा",
    status: "स्थिति",
    gross: "कुल राशि",
    net: "देय राशि",
    installments: "किश्तें",
    workspace: "वर्कस्पेस",
    view: "देखें",
    configuration: "कॉन्फिगरेशन",
    studentBilling: "स्टूडेंट बिलिंग",
    recordPayment: "पेमेंट दर्ज करें",
    paymentHistory: "पेमेंट हिस्ट्री",
    selectPlan: "स्टूडेंट फीस प्लान चुनें",
    selectPlanFirst: "स्टूडेंट फीस प्लान चुनें",
    paymentAmount: "पेमेंट राशि (₹)",
    paymentDate: "पेमेंट की तारीख",
    paymentMode: "पेमेंट का माध्यम",
    reference: "रेफरेंस नंबर",
    remarks: "विवरण",
    savePayment: "पेमेंट सेव करें",
    saving: "पेमेंट सेव हो रहा है...",
    cash: "नकद",
    upi: "UPI",
    bank: "बैंक ट्रांसफर",
    card: "कार्ड",
    cheque: "चेक",
    other: "अन्य",
    student: "स्टूडेंट",
    receiptNo: "रसीद नंबर",
    date: "तारीख",
    mode: "माध्यम",
    print: "रसीद प्रिंट करें",
    openReceipt: "रसीद देखें",
    noReceipt: "रसीद देखने के लिए पेमेंट चुनें।",
    paid: "जमा राशि",
    balance: "बाकी राशि",
    planAmount: "प्लान राशि",
    reversal: "पेमेंट रिवर्स करें",
    reversalReason: "रिवर्स करने का कारण",
    confirmReverse: "रिवर्सल कन्फर्म करें",
    cancel: "रद्द करें",
    reversed: "रिवर्स किया गया",
    completed: "पूरा",
    reverseWarning: "पेमेंट रिवर्स करने का कारण स्पष्ट रूप से लिखें।",
    paymentSuccess: "पेमेंट सफलतापूर्वक दर्ज हुआ।",
    reversalSuccess: "पेमेंट सफलतापूर्वक रिवर्स हुआ।",
    invalidAmount: "शून्य से अधिक सही पेमेंट राशि दर्ज करें।",
    choosePlan: "कृपया स्टूडेंट फीस प्लान चुनें।",
    error: "कुछ गलत हो गया।",
    noActivePlans: "कोई स्टूडेंट फीस प्लान उपलब्ध नहीं है।",
    choosePayment: "हिस्ट्री से पेमेंट चुनें।",
    receivedBy: "पेमेंट लेने वाला",
    transaction: "अकाउंटिंग ट्रांजैक्शन",
    all: "सभी",
    receipt: "फीस रसीद",
    admissionNo: "प्रवेश संख्या",
    className: "कक्षा",
    referenceLabel: "रेफरेंस",
    note: "नोट",
    recoveryText: "स्टूडेंट फीस प्लान में बाकी फीस देख सकते हैं।",
    comingSoon: "रिकवरी का अलग वर्कफ्लो अभी कनेक्ट नहीं है।",
  },
};


function unwrapScope(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function scopeArray(response) {
  const value = unwrapScope(response);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function scopeId(value, keys) {
  for (const key of keys) {
    const candidate = value?.[key];
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      const number = Number(candidate);
      if (Number.isFinite(number) && number > 0) return number;
    }
  }
  return null;
}

async function resolveFeeScope(user) {
  const userSchoolId = scopeId(user, ["school_id", "schoolId"]) ||
    scopeId(user?.school, ["id", "school_id", "schoolId"]);
  let schools = [];
  try { schools = scopeArray(await getSchools()); } catch { /* use user assignment or configured default */ }

  let schoolId = userSchoolId;
  let school = user?.school && typeof user.school === "object" ? user.school : null;
  if (schoolId) {
    school = schools.find((item) => scopeId(item, ["id", "school_id", "schoolId"]) === schoolId) || school;
  } else {
    school = schools.find((item) => scopeId(item, ["id", "school_id", "schoolId"]) === scopeId(user?.school, ["id", "school_id", "schoolId"])) ||
      (schools.length === 1 ? schools[0] : null);
    schoolId = scopeId(school, ["id", "school_id", "schoolId"]);
    // Match the existing Accounts/Dashboard configured default for admin accounts.
    if (!schoolId) {
      schoolId = 1;
      school = schools.find((item) => scopeId(item, ["id", "school_id", "schoolId"]) === schoolId) || null;
    }
  }
  if (!schoolId) throw new Error("School could not be identified for fee management.");

  let session = null;
  try {
    session = unwrapScope(await getCurrentAcademicSession(schoolId));
    if (session?.data && !scopeId(session, ["id", "academic_session_id", "session_id"])) session = session.data;
    if (Array.isArray(session)) session = session[0] || null;
  } catch { /* fall back to session list */ }

  let sessionId = scopeId(session, ["id", "academic_session_id", "session_id"]);
  if (!sessionId) {
    const sessions = scopeArray(await getAcademicSessions(schoolId));
    const current = sessions.find((item) => item?.is_current === true || item?.isCurrent === true || item?.current === true || String(item?.status || "").toLowerCase() === "current");
    const yearSession = sessions.find((item) => /2026\s*[-–/]\s*2027|2026\s*[-–/]\s*27/.test(String(item?.name || item?.session_name || item?.academic_year || item?.label || "")));
    session = current || yearSession || (sessions.length === 1 ? sessions[0] : null);
    sessionId = scopeId(session, ["id", "academic_session_id", "session_id"]);
  }
  if (!sessionId) throw new Error("Academic session ID could not be resolved. Set the current session in School Settings.");
  return { schoolId, sessionId };
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFrequency(value) {
  if (!value) return "—";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getListData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function getStudentName(plan) {
  if (plan?.student_name) return plan.student_name;

  if (plan?.student) {
    const parts = [
      plan.student.first_name,
      plan.student.middle_name,
      plan.student.last_name,
    ].filter(Boolean);

    if (parts.length) return parts.join(" ");
    if (plan.student.name) return plan.student.name;
  }

  if (plan?.student_id) return `Student #${plan.student_id}`;
  return "—";
}

function getPaymentStatus(payment) {
  return String(payment?.status || "completed").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <div className="fee-stat-card">
      <div className="fee-stat-icon">
        <Icon size={17} strokeWidth={1.8} />
      </div>
      <div className="fee-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, description, active, onClick }) {
  return (
    <button
      type="button"
      className={`fee-module-card ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="fee-module-icon">
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div className="fee-module-content">
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <ArrowRight size={15} />
    </button>
  );
}

export default function FeeManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feeScope, setFeeScope] = useState(null);

  const [language, setLanguage] = useState(
    () => localStorage.getItem("edusphere-language") || "en"
  );

  const [activeTab, setActiveTab] = useState("overview");
  const [structures, setStructures] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedInstallmentId, setSelectedInstallmentId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toLocaleDateString("en-CA")
  );
  const [paymentMode, setPaymentMode] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState(
    () => createPaymentIdempotencyKey()
  );

  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [reversalPayment, setReversalPayment] = useState(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  const t = TEXT[language] || TEXT.en;

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const nextLanguage =
        event?.detail?.language ||
        localStorage.getItem("edusphere-language") ||
        "en";
      setLanguage(nextLanguage === "hi" ? "hi" : "en");
    };

    window.addEventListener("edusphere-language-change", handleLanguageChange);
    return () => {
      window.removeEventListener(
        "edusphere-language-change",
        handleLanguageChange
      );
    };
  }, []);

  async function loadData(showRefresh = false) {
    if (!feeScope) return;
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [structureResult, planResult, paymentResult] =
        await Promise.allSettled([
          listFeeStructures({
            school_id: feeScope.schoolId,
            academic_session_id: feeScope.sessionId,
          }),
          listStudentFeePlans({
            school_id: feeScope.schoolId,
            academic_session_id: feeScope.sessionId,
          }),
          listFeePayments({
            school_id: feeScope.schoolId,
            academic_session_id: feeScope.sessionId,
            limit: 200,
            offset: 0,
          }),
        ]);

      if (structureResult.status === "fulfilled") {
        setStructures(getListData(structureResult.value));
      } else {
        console.error("Fee structures failed:", structureResult.reason);
      }

      if (planResult.status === "fulfilled") {
        setPlans(getListData(planResult.value));
      } else {
        console.error("Fee plans failed:", planResult.reason);
      }

      if (paymentResult.status === "fulfilled") {
        setPayments(getListData(paymentResult.value));
      } else {
        console.error("Fee payments failed:", paymentResult.reason);
      }

      if (
        structureResult.status === "rejected" &&
        planResult.status === "rejected" &&
        paymentResult.status === "rejected"
      ) {
        throw (
          structureResult.reason ||
          planResult.reason ||
          paymentResult.reason
        );
      }
    } catch (err) {
      console.error("Fee Management load failed:", err);
      setError(err?.response?.data?.detail || err?.message || t.failed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function resolveScope() {
      try {
        const scope = await resolveFeeScope(user);
        if (!cancelled) setFeeScope(scope);
      } catch (err) {
        if (!cancelled) {
          setFeeScope(null);
          setError(err?.message || "School could not be identified for fee management.");
          setLoading(false);
        }
      }
    }
    if (user) resolveScope();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (feeScope) loadData();
    // loadData is intentionally called when the resolved school/session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeScope]);

  const activeStructureCount = useMemo(
    () => structures.filter((item) => item?.is_active !== false).length,
    [structures]
  );

  const filteredStructures = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return structures;

    return structures.filter((item) =>
      [
        item?.name,
        item?.fee_head,
        item?.class_name,
        item?.frequency,
        item?.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [structures, search]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return plans;

    return plans.filter((item) =>
      [
        getStudentName(item),
        item?.name,
        item?.status,
        item?.installment_mode,
        item?.student_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [plans, search]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payments;

    return payments.filter((payment) =>
      [
        payment?.receipt_number,
        payment?.student_name,
        payment?.student_id,
        payment?.payment_mode,
        payment?.reference_number,
        payment?.status,
        payment?.amount,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [payments, search]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === String(selectedPlanId)),
    [plans, selectedPlanId]
  );

  const selectedInstallment = useMemo(
    () => (selectedPlan?.installments || []).find(
      (item) => String(item.id) === String(selectedInstallmentId)
    ),
    [selectedPlan, selectedInstallmentId]
  );

  function openStudentPlans() {
    setActiveTab("plans");
    setSearch("");
  }

  function openStructures() {
    setActiveTab("structures");
    setSearch("");
  }

  function handleCreatePlan() {
    navigate("/students");
  }

  async function handleOpenPlan(planId) {
    try {
      const detail = await getStudentFeePlan(planId);
      if (detail?.student_id) {
        navigate(`/students?student=${detail.student_id}`);
      } else {
        setActiveTab("plans");
      }
    } catch (err) {
      console.error("Unable to open fee plan:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to open fee plan."
      );
    }
  }

  function resetPaymentForm() {
    setSelectedPlanId("");
    setSelectedInstallmentId("");
    setPaymentAmount("");
    setPaymentDate(new Date().toLocaleDateString("en-CA"));
    setPaymentMode("cash");
    setReferenceNumber("");
    setRemarks("");
    setPaymentIdempotencyKey(createPaymentIdempotencyKey());
  }

  async function handleCreatePayment(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedPlan) {
      setError(t.choosePlan);
      return;
    }

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t.invalidAmount);
      return;
    }

    if (!selectedPlan.student_id) {
      setError(
        "The selected fee plan does not contain a student_id. Open the plan and verify its student details."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        school_id: feeScope.schoolId,
        academic_session_id: feeScope.sessionId,
        student_id: Number(selectedPlan.student_id),
        student_fee_plan_id: Number(selectedPlan.id),
        installment_id: selectedInstallmentId ? Number(selectedInstallmentId) : null,
        amount: amount.toFixed(2),
        payment_date: paymentDate,
        payment_mode: paymentMode,
        reference_number: referenceNumber.trim() || null,
        remarks: remarks.trim() || null,
        idempotency_key: paymentIdempotencyKey,
      };

      const created = await createFeePayment(payload);
      setNotice(t.paymentSuccess);
      resetPaymentForm();

      await loadData(true);

      if (created?.id) {
        setSelectedPaymentId(created.id);
        setActiveTab("receipts");
        await handleOpenReceipt(created.id);
      } else {
        setActiveTab("payments");
      }
    } catch (err) {
      console.error("Payment creation failed:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t.error
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenReceipt(paymentId) {
    if (!paymentId) {
      setError(t.choosePayment);
      return;
    }

    try {
      setReceiptLoading(true);
      setError("");
      setSelectedPaymentId(paymentId);

      const result = await getFeePaymentReceipt(paymentId, {
        school_id: feeScope.schoolId,
        academic_session_id: feeScope.sessionId,
      });

      setReceipt(result);
      setActiveTab("receipts");
    } catch (err) {
      console.error("Unable to load receipt:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load receipt."
      );
      setReceipt(null);
    } finally {
      setReceiptLoading(false);
    }
  }

  async function handleReversePayment(event) {
    event.preventDefault();
    if (!reversalPayment?.id) return;

    if (!reversalReason.trim()) {
      setError(t.reversalReason);
      return;
    }

    try {
      setReversing(true);
      setError("");

      await reverseFeePayment(
        reversalPayment.id,
        {
          school_id: feeScope.schoolId,
          academic_session_id: feeScope.sessionId,
        },
        { reason: reversalReason.trim() }
      );

      setNotice(t.reversalSuccess);
      setReversalPayment(null);
      setReversalReason("");
      setReceipt(null);

      await loadData(true);
    } catch (err) {
      console.error("Payment reversal failed:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t.error
      );
    } finally {
      setReversing(false);
    }
  }

  function printReceipt() {
    if (!receipt) return;

    const r = receipt.receipt || {};
    const student = receipt.student || {};
    const fee = receipt.fee || {};
    const payment = receipt.payment || {};
    const school = receipt.school || {};

    const rows = [
      [t.receiptNo, r.receipt_number],
      [t.date, formatDate(r.payment_date)],
      [t.student, student.name],
      [t.admissionNo, student.admission_number],
      [t.className, [student.class_name, student.section].filter(Boolean).join(" ")],
      [t.planAmount, formatCurrency(fee.plan_amount)],
      [t.paid, formatCurrency(payment.amount)],
      [t.balance, formatCurrency(fee.outstanding_balance)],
      [t.mode, formatFrequency(payment.payment_mode)],
      [t.referenceLabel, payment.reference_number],
      [t.remarks, payment.remarks],
      [t.receivedBy, payment.received_by],
    ];

    const receiptRows = rows
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(
        ([label, value]) =>
          `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
      )
      .join("");

    const popup = window.open("", "_blank", "width=800,height=900");
    if (!popup) {
      setError("Please allow pop-ups to print the receipt.");
      return;
    }

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(r.receipt_number || t.receipt)}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #172033; padding: 28px; }
            .receipt { max-width: 700px; margin: 0 auto; border: 1px solid #dbe2ea; padding: 28px; }
            h1 { font-size: 22px; margin: 0 0 6px; text-align: center; }
            .subtitle { text-align: center; color: #64748b; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 11px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th { width: 38%; color: #475569; font-weight: 600; }
            .footer { margin-top: 32px; display: flex; justify-content: space-between; color: #64748b; font-size: 12px; }
            @media print { body { padding: 0; } .receipt { border: none; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>${escapeHtml(school.name || "School Fee Receipt")}</h1>
            <div class="subtitle">${escapeHtml(t.receipt)} · ${escapeHtml(r.receipt_number || "")}</div>
            <table>${receiptRows}</table>
            <div class="footer">
              <span>${escapeHtml(t.note)}: Keep this receipt for your records.</span>
              <span>Authorized Signature</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  function renderStructures() {
    return (
      <section className="fee-data-section">
        <div className="fee-section-heading">
          <div>
            <span>{t.configuration}</span>
            <h2>{t.structures}</h2>
          </div>
          <button
            type="button"
            className="fee-primary-btn"
            onClick={openStructures}
          >
            <Plus size={14} />
            {t.createStructure}
          </button>
        </div>

        {filteredStructures.length === 0 ? (
          <div className="fee-empty">
            <Layers3 size={24} />
            <strong>{t.noStructures}</strong>
          </div>
        ) : (
          <div className="fee-table-wrap">
            <table className="fee-table">
              <thead>
                <tr>
                  <th>{t.structures}</th>
                  <th>{t.feeHead}</th>
                  <th>{t.class}</th>
                  <th>{t.frequency}</th>
                  <th>{t.amount}</th>
                  <th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStructures.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name || "—"}</strong>
                      {item.description && <small>{item.description}</small>}
                    </td>
                    <td>{item.fee_head || "—"}</td>
                    <td>{item.class_name || "All Classes"}</td>
                    <td>{formatFrequency(item.frequency)}</td>
                    <td><strong>{formatCurrency(item.amount)}</strong></td>
                    <td>
                      <span className={`fee-status ${item.is_active === false ? "inactive" : ""}`}>
                        {item.is_active === false ? t.inactive : t.active}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderPlans() {
    return (
      <section className="fee-data-section">
        <div className="fee-section-heading">
          <div>
            <span>{t.studentBilling}</span>
            <h2>{t.plans}</h2>
          </div>
          <button
            type="button"
            className="fee-primary-btn"
            onClick={handleCreatePlan}
          >
            <Plus size={14} />
            {t.createPlan}
          </button>
        </div>

        {filteredPlans.length === 0 ? (
          <div className="fee-empty">
            <ClipboardList size={24} />
            <strong>{t.noPlans}</strong>
          </div>
        ) : (
          <div className="fee-plan-grid">
            {filteredPlans.map((plan) => {
              const status = String(plan.status || "active").toLowerCase();

              return (
                <button
                  type="button"
                  className="fee-plan-card"
                  key={plan.id}
                  onClick={() => handleOpenPlan(plan.id)}
                >
                  <div className="fee-plan-top">
                    <div className="fee-plan-avatar">
                      {getStudentName(plan).charAt(0).toUpperCase()}
                    </div>
                    <span className={`fee-status ${status !== "active" ? "inactive" : ""}`}>
                      {status === "active" ? t.active : t.inactive}
                    </span>
                  </div>
                  <div className="fee-plan-name">
                    <strong>{getStudentName(plan)}</strong>
                    <small>{plan.name || `Plan #${plan.id}`}</small>
                  </div>
                  <div className="fee-plan-values">
                    <div>
                      <span>{t.gross}</span>
                      <strong>{formatCurrency(plan.gross_amount)}</strong>
                    </div>
                    <div>
                      <span>{t.net}</span>
                      <strong>{formatCurrency(plan.net_amount)}</strong>
                    </div>
                  </div>
                  <div className="fee-plan-bottom">
                    <span>{formatFrequency(plan.installment_mode)}</span>
                    <span>{plan.installment_count || 1} {t.installments}</span>
                    <ArrowRight size={14} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  function renderPaymentForm() {
    const activePlans = plans.filter(
      (plan) => String(plan.status || "active").toLowerCase() === "active"
    );

    return (
      <section className="fee-data-section">
        <div className="fee-section-heading">
          <div>
            <span>{t.studentBilling}</span>
            <h2>{t.recordPayment}</h2>
          </div>
          <CreditCard size={22} />
        </div>

        {activePlans.length === 0 ? (
          <div className="fee-empty">
            <AlertCircle size={24} />
            <strong>{t.noActivePlans}</strong>
          </div>
        ) : (
          <form className="fee-payment-form" onSubmit={handleCreatePayment}>
            <label>
              <span>{t.selectPlan} *</span>
              <select
                value={selectedPlanId}
                onChange={(event) => {
                  setSelectedPlanId(event.target.value);
                  setSelectedInstallmentId("");
                  setPaymentAmount("");
                }}
                required
              >
                <option value="">{t.selectPlanFirst}</option>
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {getStudentName(plan)} — {plan.name || `Plan #${plan.id}`} — {formatCurrency(plan.net_amount)}
                  </option>
                ))}
              </select>
            </label>

            {selectedPlan && (selectedPlan.installments || []).length > 0 && (
              <label>
                <span>Installment (optional)</span>
                <select
                  value={selectedInstallmentId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setSelectedInstallmentId(id);
                    const item = (selectedPlan.installments || []).find((row) => String(row.id) === String(id));
                    if (item) setPaymentAmount(Number(item.amount || 0).toFixed(2));
                  }}
                >
                  <option value="">Unallocated payment (whole plan)</option>
                  {(selectedPlan.installments || []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || `Installment ${item.installment_number}`} · Due {formatDate(item.due_date)} · {formatCurrency(item.amount)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedPlan && (
              <div className="fee-selected-plan">
                <div>
                  <small>{t.student}</small>
                  <strong>{getStudentName(selectedPlan)}</strong>
                </div>
                <div>
                  <small>{t.planAmount}</small>
                  <strong>{formatCurrency(selectedPlan.net_amount)}</strong>
                </div>
              </div>
            )}

            <div className="fee-payment-fields">
              <label>
                <span>{t.paymentAmount} *</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>

              <label>
                <span>{t.paymentDate} *</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  required
                />
              </label>

              <label>
                <span>{t.paymentMode} *</span>
                <select
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value)}
                  required
                >
                  <option value="cash">{t.cash}</option>
                  <option value="upi">{t.upi}</option>
                  <option value="bank_transfer">{t.bank}</option>
                  <option value="card">{t.card}</option>
                  <option value="cheque">{t.cheque}</option>
                  <option value="other">{t.other}</option>
                </select>
              </label>

              <label>
                <span>{t.reference}</span>
                <input
                  type="text"
                  maxLength={150}
                  value={referenceNumber}
                  onChange={(event) => setReferenceNumber(event.target.value)}
                  placeholder="Transaction / cheque number"
                />
              </label>
            </div>

            <label>
              <span>{t.remarks}</span>
              <textarea
                rows={3}
                maxLength={4000}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Optional payment note"
              />
            </label>

            <button type="submit" className="fee-primary-btn" disabled={saving}>
              <IndianRupee size={15} />
              {saving ? t.saving : t.savePayment}
            </button>
          </form>
        )}
      </section>
    );
  }

  function renderPaymentHistory() {
    return (
      <section className="fee-data-section">
        <div className="fee-section-heading">
          <div>
            <span>{t.workspace}</span>
            <h2>{t.paymentHistory}</h2>
          </div>
          <button
            type="button"
            className="fee-text-btn"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} />
            {t.refresh}
          </button>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="fee-empty">
            <CreditCard size={24} />
            <strong>{t.noPayments}</strong>
          </div>
        ) : (
          <div className="fee-table-wrap">
            <table className="fee-table">
              <thead>
                <tr>
                  <th>{t.receiptNo}</th>
                  <th>{t.student}</th>
                  <th>{t.date}</th>
                  <th>{t.amount}</th>
                  <th>{t.mode}</th>
                  <th>{t.status}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const status = getPaymentStatus(payment);
                  const isReversed = status === "reversed";

                  return (
                    <tr key={payment.id}>
                      <td>
                        <strong>{payment.receipt_number || `#${payment.id}`}</strong>
                      </td>
                      <td>
                        {payment.student_name || `Student #${payment.student_id}`}
                      </td>
                      <td>{formatDate(payment.payment_date)}</td>
                      <td><strong>{formatCurrency(payment.amount)}</strong></td>
                      <td>{formatFrequency(payment.payment_mode)}</td>
                      <td>
                        <span className={`fee-status ${isReversed ? "inactive" : ""}`}>
                          {isReversed ? t.reversed : status}
                        </span>
                      </td>
                      <td>
                        <div className="fee-payment-actions">
                          <button
                            type="button"
                            className="fee-small-btn"
                            onClick={() => handleOpenReceipt(payment.id)}
                          >
                            <ReceiptText size={14} />
                            {t.openReceipt}
                          </button>
                          {!isReversed && (
                            <button
                              type="button"
                              className="fee-small-btn danger"
                              onClick={() => {
                                setReversalPayment(payment);
                                setReversalReason("");
                              }}
                            >
                              <RotateCcw size={14} />
                              {t.reversal}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderReceipt() {
    const r = receipt?.receipt || {};
    const student = receipt?.student || {};
    const fee = receipt?.fee || {};
    const payment = receipt?.payment || {};
    const accounting = receipt?.accounting || {};

    return (
      <section className="fee-data-section">
        <div className="fee-section-heading">
          <div>
            <span>{t.workspace}</span>
            <h2>{t.receipts}</h2>
          </div>
          <button
            type="button"
            className="fee-primary-btn"
            onClick={printReceipt}
            disabled={!receipt}
          >
            <Printer size={15} />
            {t.print}
          </button>
        </div>

        {receiptLoading ? (
          <div className="fee-loading">
            <div className="fee-loader" />
            <span>{t.loading}</span>
          </div>
        ) : !receipt ? (
          <div className="fee-empty">
            <ReceiptText size={24} />
            <strong>{t.noReceipt}</strong>
            <p>{t.paymentHistory}</p>
            <button
              type="button"
              className="fee-primary-btn"
              onClick={() => setActiveTab("payments")}
            >
              {t.payments}
            </button>
          </div>
        ) : (
          <div className="fee-receipt-card">
            <div className="fee-receipt-header">
              <div className="fee-receipt-icon">
                <ReceiptText size={22} />
              </div>
              <div>
                <span>{t.receipt}</span>
                <h3>{r.receipt_number || `Receipt #${r.payment_id || selectedPaymentId}`}</h3>
                <small>{formatDate(r.payment_date)}</small>
              </div>
              <span className={`fee-status ${r.status === "reversed" ? "inactive" : ""}`}>
                {r.status === "reversed" ? t.reversed : t.completed}
              </span>
            </div>

            <div className="fee-receipt-student">
              <div>
                <small>{t.student}</small>
                <strong>{student.name || `Student #${student.student_id || "—"}`}</strong>
              </div>
              <div>
                <small>{t.admissionNo}</small>
                <strong>{student.admission_number || "—"}</strong>
              </div>
              <div>
                <small>{t.className}</small>
                <strong>
                  {[student.class_name, student.section].filter(Boolean).join(" ") || "—"}
                </strong>
              </div>
            </div>

            <div className="fee-receipt-amount">
              <small>{t.paid}</small>
              <strong>{formatCurrency(payment.amount)}</strong>
            </div>

            <div className="fee-receipt-details">
              <div><span>{t.planAmount}</span><strong>{formatCurrency(fee.plan_amount)}</strong></div>
              <div><span>{t.balance}</span><strong>{formatCurrency(fee.outstanding_balance)}</strong></div>
              <div><span>{t.mode}</span><strong>{formatFrequency(payment.payment_mode)}</strong></div>
              <div><span>{t.referenceLabel}</span><strong>{payment.reference_number || "—"}</strong></div>
              <div><span>{t.remarks}</span><strong>{payment.remarks || "—"}</strong></div>
              <div><span>{t.receivedBy}</span><strong>{payment.received_by || "—"}</strong></div>
              <div><span>{t.transaction}</span><strong>{accounting.transaction_id || "—"}</strong></div>
            </div>

            {r.reversal_reason && (
              <div className="fee-alert">
                <AlertCircle size={15} />
                <span>{t.reversalReason}: {r.reversal_reason}</span>
              </div>
            )}

            <div className="fee-receipt-footer">
              <span>{t.note}: Please keep this receipt for your records.</span>
              <span>Authorized Signature</span>
            </div>
          </div>
        )}
      </section>
    );
  }

  function renderOverview() {
    return (
      <>
        <section className="fee-module-grid">
          <ModuleCard
            icon={Layers3}
            title={t.structures}
            description="Configure fee heads, frequencies and amounts."
            active={structures.length > 0}
            onClick={openStructures}
          />
          <ModuleCard
            icon={ClipboardList}
            title={t.plans}
            description="Review student-wise fee plans."
            active={plans.length > 0}
            onClick={openStudentPlans}
          />
          <ModuleCard
            icon={CreditCard}
            title={t.payments}
            description="Record and track fee collections."
            onClick={() => setActiveTab("payments")}
          />
          <ModuleCard
            icon={ReceiptText}
            title={t.receipts}
            description="Open and print payment receipts."
            onClick={() => setActiveTab("receipts")}
          />
          <ModuleCard
            icon={AlertCircle}
            title={t.recovery}
            description="Review student plans for outstanding dues."
            onClick={() => setActiveTab("recovery")}
          />
        </section>

        <div className="fee-overview-columns">
          <section className="fee-data-section">
            <div className="fee-section-heading">
              <div>
                <span>{t.configuration}</span>
                <h2>{t.structures}</h2>
              </div>
              <button type="button" className="fee-text-btn" onClick={openStructures}>
                {t.view} <ArrowRight size={13} />
              </button>
            </div>

            {structures.length === 0 ? (
              <div className="fee-mini-empty">{t.noStructures}</div>
            ) : (
              <div className="fee-mini-list">
                {structures.slice(0, 5).map((item) => (
                  <div className="fee-mini-row" key={item.id}>
                    <div>
                      <strong>{item.name || "—"}</strong>
                      <small>{item.fee_head || "—"} · {formatFrequency(item.frequency)}</small>
                    </div>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="fee-data-section">
            <div className="fee-section-heading">
              <div>
                <span>{t.studentBilling}</span>
                <h2>{t.plans}</h2>
              </div>
              <button type="button" className="fee-text-btn" onClick={openStudentPlans}>
                {t.view} <ArrowRight size={13} />
              </button>
            </div>

            {plans.length === 0 ? (
              <div className="fee-mini-empty">{t.noPlans}</div>
            ) : (
              <div className="fee-mini-list">
                {plans.slice(0, 5).map((plan) => (
                  <button
                    type="button"
                    className="fee-mini-row clickable"
                    key={plan.id}
                    onClick={() => handleOpenPlan(plan.id)}
                  >
                    <div>
                      <strong>{getStudentName(plan)}</strong>
                      <small>{plan.name || `Plan #${plan.id}`}</small>
                    </div>
                    <strong>{formatCurrency(plan.net_amount)}</strong>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  function renderRecovery() {
    const paidByPlan = new Map();
    const paidByInstallment = new Map();
    for (const payment of payments) {
      if (String(payment?.status || "").toLowerCase() !== "posted") continue;
      const planId = Number(payment?.student_fee_plan_id);
      const amount = Number(payment?.amount || 0);
      if (!Number.isInteger(planId) || !Number.isFinite(amount)) continue;
      paidByPlan.set(planId, (paidByPlan.get(planId) || 0) + amount);
      const installmentId = Number(payment?.installment_id);
      if (Number.isInteger(installmentId) && installmentId > 0) {
        paidByInstallment.set(installmentId, (paidByInstallment.get(installmentId) || 0) + amount);
      }
    }

    const recoveryRows = plans
      .filter((plan) => String(plan?.status || "active").toLowerCase() !== "cancelled")
      .map((plan) => {
        const total = Math.max(0, Number(plan?.net_amount ?? plan?.total_amount ?? 0) || 0);
        const paid = Math.max(0, paidByPlan.get(Number(plan.id)) || 0);
        const due = Math.max(0, total - paid);
        const installments = (Array.isArray(plan?.installments) ? plan.installments : []).map((item) => {
          const installmentTotal = Math.max(0, Number(item?.amount || 0));
          const installmentPaid = Math.max(0, paidByInstallment.get(Number(item.id)) || 0);
          return { ...item, installmentTotal, installmentPaid, installmentDue: Math.max(0, installmentTotal - installmentPaid) };
        });
        return { plan, total, paid, due, installments };
      })
      .filter((row) => row.due > 0.009)
      .filter(({ plan }) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [getStudentName(plan), plan?.name, plan?.student_id, plan?.class_name, plan?.status]
          .filter(Boolean).join(" ").toLowerCase().includes(query);
      })
      .sort((a, b) => b.due - a.due);

    const totalDue = recoveryRows.reduce((sum, row) => sum + row.due, 0);
    const installmentCount = recoveryRows.reduce((sum, row) => sum + row.installments.filter((item) => item.installmentDue > 0.009).length, 0);

    return (
      <section className="fee-section">
        <div className="fee-section-heading">
          <div>
            <span className="fee-eyebrow">STUDENT BILLING</span>
            <h2>{t.recovery}</h2>
            <p>Outstanding balances by student fee plan and individual installment.</p>
          </div>
          <button type="button" className="fee-secondary-btn" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw size={15} /> {t.refresh}
          </button>
        </div>

        <div className="fee-stat-grid">
          <StatCard icon={AlertCircle} label="Students / Plans with dues" value={recoveryRows.length} note="Plans with outstanding balances" />
          <StatCard icon={IndianRupee} label="Total outstanding" value={formatCurrency(totalDue)} note="Net plan amount minus posted receipts" />
          <StatCard icon={ClipboardList} label="Installments due" value={installmentCount} note="Based on posted payments allocated to installments" />
        </div>

        {recoveryRows.length === 0 ? (
          <div className="fee-empty">
            <CheckCircle2 size={24} />
            <strong>No outstanding fee plans found</strong>
            <p>Try refreshing or clearing the search filter.</p>
          </div>
        ) : (
          <div className="fee-table-wrap">
            <table className="fee-table">
              <thead><tr><th>Student</th><th>Fee plan / installments</th><th>Total fee</th><th>Paid</th><th>Outstanding</th><th>Action</th></tr></thead>
              <tbody>
                {recoveryRows.map(({ plan, total, paid, due, installments }) => (
                  <Fragment key={`plan-group-${plan.id}`}>
                    <tr key={`plan-${plan.id}`}>
                      <td><strong>{getStudentName(plan)}</strong><small>Student ID: {plan.student_id ?? "—"}</small></td>
                      <td>{plan.name || `Plan #${plan.id}`}<small>{plan.installment_count || installments.length || 1} {t.installments}</small></td>
                      <td>{formatCurrency(total)}</td>
                      <td>{formatCurrency(paid)}</td>
                      <td><strong className="fee-amount-due">{formatCurrency(due)}</strong></td>
                      <td><button type="button" className="fee-primary-btn" onClick={() => { setSelectedPlanId(String(plan.id)); setSelectedInstallmentId(""); setPaymentAmount(due.toFixed(2)); setActiveTab("payments"); setError(""); setNotice(""); }}>Collect plan payment <ArrowRight size={14} /></button></td>
                    </tr>
                    {installments.map((item) => (
                      <tr key={`installment-${item.id}`}>
                        <td><span style={{ paddingLeft: 12, color: "var(--text-secondary, #64748b)" }}>↳ Installment {item.installment_number}</span></td>
                        <td><strong>{item.name || `Installment ${item.installment_number}`}</strong><small>Due date: {formatDate(item.due_date)} · {String(item.status || "pending")}</small></td>
                        <td>{formatCurrency(item.installmentTotal)}</td>
                        <td>{formatCurrency(item.installmentPaid)}</td>
                        <td><strong className={item.installmentDue > 0.009 ? "fee-amount-due" : ""}>{formatCurrency(item.installmentDue)}</strong></td>
                        <td>{item.installmentDue > 0.009 ? <button type="button" className="fee-small-btn" onClick={() => { setSelectedPlanId(String(plan.id)); setSelectedInstallmentId(String(item.id)); setPaymentAmount(item.installmentDue.toFixed(2)); setActiveTab("payments"); setError(""); setNotice(""); }}>Collect installment</button> : <span>Paid</span>}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="fee-muted" style={{ marginTop: 12 }}>
          Installment balances use posted payments whose installment_id matches the installment. Older payments recorded without an installment remain included in the plan-level paid total, but are not automatically assigned to a specific installment.
        </p>
      </section>
    );
  }

  function renderContent() {
    switch (activeTab) {
      case "structures":
        return renderStructures();
      case "plans":
        return renderPlans();
      case "payments":
        return (
          <div className="fee-payment-workspace">
            {renderPaymentForm()}
            {renderPaymentHistory()}
          </div>
        );
      case "receipts":
        return (
          <div className="fee-payment-workspace">
            {renderReceipt()}
            {renderPaymentHistory()}
          </div>
        );
      case "recovery":
        return renderRecovery();
      default:
        return renderOverview();
    }
  }

  return (
    <div className="fee-page">
      <style>{`
        .fee-payment-workspace { display: grid; gap: 22px; }
        .fee-payment-form { display: grid; gap: 16px; }
        .fee-payment-form label { display: grid; gap: 7px; min-width: 0; }
        .fee-payment-form label > span { font-size: 13px; font-weight: 650; color: var(--text-primary, #334155); }
        .fee-payment-form input, .fee-payment-form select, .fee-payment-form textarea {
          box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid var(--border-color, #dbe2ea);
          border-radius: 10px; background: var(--input-bg, #fff); color: var(--text-primary, #172033);
          padding: 11px 12px; font: inherit; font-size: 14px; outline: none;
        }
        .fee-payment-form input:focus, .fee-payment-form select:focus, .fee-payment-form textarea:focus {
          border-color: #5084ed; box-shadow: 0 0 0 3px rgba(80,132,237,.12);
        }
        .fee-payment-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .fee-selected-plan { display: flex; flex-wrap: wrap; gap: 24px; padding: 15px; border-radius: 12px; background: var(--surface-subtle, #f6f8fc); }
        .fee-selected-plan > div { display: grid; gap: 5px; }
        .fee-selected-plan small, .fee-receipt-student small, .fee-receipt-amount small { color: #64748b; font-size: 12px; }
        .fee-selected-plan strong { color: var(--text-primary, #172033); }
        .fee-payment-actions { display: flex; flex-wrap: wrap; gap: 7px; }
        .fee-small-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid #dbe2ea; background: #fff; color: #334155; padding: 7px 9px; border-radius: 8px; cursor: pointer; font-size: 12px; white-space: nowrap; }
        .fee-small-btn.danger { color: #b42318; border-color: #f1c5c2; }
        .fee-receipt-card { max-width: 850px; margin: 0 auto; width: 100%; border: 1px solid var(--border-color, #dbe2ea); border-radius: 16px; padding: 22px; box-sizing: border-box; }
        .fee-receipt-header { display: flex; align-items: center; gap: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 18px; }
        .fee-receipt-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; background: #eef4ff; color: #315fc4; }
        .fee-receipt-header > div:nth-child(2) { flex: 1; min-width: 0; }
        .fee-receipt-header span { font-size: 12px; color: #64748b; }
        .fee-receipt-header h3 { margin: 4px 0; font-size: 18px; overflow-wrap: anywhere; }
        .fee-receipt-header small { color: #64748b; }
        .fee-receipt-student { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding: 20px 0; border-bottom: 1px solid #e2e8f0; }
        .fee-receipt-student > div { display: grid; gap: 6px; min-width: 0; }
        .fee-receipt-student strong { overflow-wrap: anywhere; }
        .fee-receipt-amount { margin: 20px 0; padding: 18px; border-radius: 12px; background: #f0f7ff; display: grid; gap: 6px; }
        .fee-receipt-amount strong { color: #174ea6; font-size: 28px; }
        .fee-receipt-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; }
        .fee-receipt-details > div { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 12px 0; border-bottom: 1px solid #edf0f4; }
        .fee-receipt-details span { color: #64748b; font-size: 13px; }
        .fee-receipt-details strong { text-align: right; font-size: 13px; overflow-wrap: anywhere; }
        .fee-receipt-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-top: 28px; padding-top: 16px; border-top: 1px dashed #cbd5e1; color: #64748b; font-size: 12px; }
        .fee-payment-form .fee-primary-btn { justify-self: start; }
        @media (max-width: 640px) {
          .fee-payment-fields, .fee-receipt-student, .fee-receipt-details { grid-template-columns: 1fr; }
          .fee-receipt-card { padding: 15px; }
          .fee-receipt-header { align-items: flex-start; flex-wrap: wrap; }
          .fee-receipt-amount strong { font-size: 24px; }
          .fee-receipt-footer { flex-direction: column; }
        }
      `}</style>

      <header className="fee-page-header">
        <div>
          <div className="fee-kicker">{t.kicker}</div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <button
          type="button"
          className="fee-refresh-btn"
          onClick={() => loadData(true)}
          disabled={refreshing}
          title={t.refresh}
        >
          <RefreshCw size={15} className={refreshing ? "fee-spin" : ""} />
          <span>{t.refresh}</span>
        </button>
      </header>

      {error && (
        <div className="fee-alert">
          <AlertCircle size={15} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div className="fee-alert" style={{ borderColor: "#b7e4c7", background: "#f0fff4", color: "#166534" }}>
          <CheckCircle2 size={15} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
            style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="fee-stat-grid">
        <StatCard
          icon={Layers3}
          label={t.totalStructures}
          value={structures.length}
          note={t.structures}
        />
        <StatCard
          icon={Wallet}
          label={t.activeStructures}
          value={activeStructureCount}
          note={t.active}
        />
        <StatCard
          icon={ClipboardList}
          label={t.totalPlans}
          value={plans.length}
          note={t.plans}
        />
        <StatCard
          icon={CreditCard}
          label={t.pendingRecovery}
          value={payments.length}
          note={t.paymentHistory}
        />
      </section>

      <section className="fee-workspace">
        <div className="fee-workspace-head">
          <div className="fee-tabs">
            {[
              ["overview", t.overview],
              ["structures", t.structures],
              ["plans", t.plans],
              ["payments", t.payments],
              ["receipts", t.receipts],
              ["recovery", t.recovery],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={activeTab === key ? "active" : ""}
                onClick={() => {
                  setActiveTab(key);
                  setSearch("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="fee-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
            />
          </label>
        </div>

        {loading || !feeScope ? (
          <div className="fee-loading">
            <div className="fee-loader" />
            <span>{t.loading}</span>
          </div>
        ) : (
          <div className="fee-workspace-content">{renderContent()}</div>
        )}
      </section>

      {reversalPayment && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !reversing) {
              setReversalPayment(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "rgba(15,23,42,.48)",
          }}
        >
          <form
            onSubmit={handleReversePayment}
            style={{
              width: "min(100%, 460px)",
              boxSizing: "border-box",
              padding: 22,
              borderRadius: 16,
              background: "#fff",
              color: "#172033",
              boxShadow: "0 20px 60px rgba(0,0,0,.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{t.reversal}</h3>
              <button
                type="button"
                onClick={() => setReversalPayment(null)}
                disabled={reversing}
                aria-label="Close reversal dialog"
                style={{ border: 0, background: "transparent", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
              {t.reverseWarning}
              <br />
              {t.receiptNo}: {reversalPayment.receipt_number || `#${reversalPayment.id}`}
              <br />
              {t.amount}: {formatCurrency(reversalPayment.amount)}
            </p>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 650 }}>{t.reversalReason} *</span>
              <textarea
                rows={4}
                value={reversalReason}
                onChange={(event) => setReversalReason(event.target.value)}
                required
                maxLength={1000}
                placeholder={t.reversalReason}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  border: "1px solid #dbe2ea",
                  borderRadius: 10,
                  font: "inherit",
                }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="fee-refresh-btn"
                onClick={() => setReversalPayment(null)}
                disabled={reversing}
              >
                {t.cancel}
              </button>
              <button type="submit" className="fee-primary-btn" disabled={reversing}>
                <RotateCcw size={14} />
                {reversing ? "..." : t.confirmReverse}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
