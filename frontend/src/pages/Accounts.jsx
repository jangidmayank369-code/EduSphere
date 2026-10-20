import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import apiClient from "../api/client";
import { createFeePayment, listFeePayments } from "../api/feePayments";
import { listStudentFeePlans } from "../api/studentFeePlans";
import { getStudents } from "../api/students";
import { useAuth } from "../auth/AuthContext";
import { getSchools, getAcademicSessions, getCurrentAcademicSession } from "../api/school";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileDown,
  FileSpreadsheet,
  Filter,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Upload,
  Wallet,
  X,
} from "lucide-react";

const TXN_ENDPOINT = "/accounting-transactions";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];
const INCOME_CATEGORIES = ["Other Income"];
const EXPENSE_CATEGORIES = ["Other", "Staff Salary", "Driver Salary", "Fuel", "Transport", "Maintenance"];

const EMPTY_FORM = {
  transaction_type: "expense",
  transaction_date: new Date().toISOString().slice(0, 10),
  category: "Other",
  amount: "",
  payment_mode: "Cash",
  reference_number: "",
  description: "",
};

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "ledger", label: "Accounts Ledger", icon: Landmark },
  { id: "income", label: "Other Income", icon: ArrowDownLeft },
  { id: "expenses", label: "Other Expenses", icon: ArrowUpRight },
  { id: "fees", label: "Student Fees", icon: Wallet },
  { id: "salary", label: "Salary & Payroll", icon: Banknote },
  { id: "transport", label: "Fuel & Transport", icon: CircleDollarSign },
  { id: "maintenance", label: "Maintenance", icon: ShieldAlert },
  { id: "reports", label: "Reports", icon: FileSpreadsheet },
];

function rowsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  return [];
}

// The backend uses page/page_size for students and fee plans, but offset/limit
// for payments. Fetch every page so the account dashboard never silently
// stops at the first 20/100/500 records.
async function fetchPagedResource(fetcher, params, mode) {
  if (mode === "offset") {
    const pageSize = 500;
    const collected = [];
    for (let offset = 0; ; offset += pageSize) {
      const response = await fetcher({ ...params, limit: pageSize, offset });
      const page = rowsOf(response);
      collected.push(...page);
      if (page.length < pageSize) break;
    }
    return collected;
  }

  const pageSize = 100;
  const first = await fetcher({ ...params, page: 1, page_size: pageSize });
  const collected = [...rowsOf(first)];
  const meta = first?.meta || first?.data?.meta || {};
  const totalPages = Math.max(1, Number(meta.total_pages ?? meta.pages ?? 1) || 1);
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetcher({ ...params, page, page_size: pageSize });
    collected.push(...rowsOf(response));
  }
  return collected;
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `fee-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPeriodRange(period, custom) {
  const today = new Date();
  if (period === "custom") return { from: custom.from || "", to: custom.to || "" };
  if (period === "today") {
    const d = toIsoDate(today);
    return { from: d, to: d };
  }
  if (period === "month") {
    return { from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toIsoDate(today) };
  }
  if (period === "30days") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toIsoDate(from), to: toIsoDate(today) };
  }
  // Match the active 2026–27 academic session used elsewhere in this frontend.
  return { from: "2026-04-01", to: "2027-03-31" };
}

function transactionAmount(row) {
  return Number(row?.amount ?? 0);
}

function transactionType(row) {
  return String(row?.transaction_type || row?.type || "").toLowerCase();
}

function transactionDate(row) {
  return String(row?.transaction_date || row?.date || "").slice(0, 10);
}

function transactionStatus(row) {
  return String(row?.status || "posted").toLowerCase();
}

function transactionSource(row) {
  const source = String(row?.source_type || row?.source_module || "manual").toLowerCase();
  const labels = {
    fee_payment: "Student fee payment",
    fee_payments: "Student fee payment",
    manual: "Manual entry",
    staff_payment: "Salary payment",
    staff_payments: "Salary payment",
    transport_expense: "Fuel / transport",
    transport_expenses: "Fuel / transport",
    maintenance_expense: "Maintenance",
    maintenance_expenses: "Maintenance",
    payroll: "Payroll",
  };
  return labels[source] || source.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
}

function transactionFingerprint(row) {
  const normal = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return [
    normal(row.transaction_date || transactionDate(row)),
    normal(row.transaction_type || transactionType(row)),
    normal(row.category),
    Number(row.amount ?? 0).toFixed(2),
    normal(row.payment_mode),
    normal(row.reference_number),
    normal(row.description),
  ].join("|" );
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows) {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((item) => item !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((item) => item !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function Kpi({ label, value, note, icon: Icon, tone = "blue" }) {
  return (
    <div className={`ac-kpi ac-kpi-${tone}`}>
      <div className="ac-kpi-top">
        <span>{label}</span>
        <span className="ac-kpi-icon"><Icon size={18} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="ac-empty">
      <div className="ac-empty-icon"><Landmark size={24} /></div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function Table({ rows, onVoid }) {
  if (!rows.length) {
    return <EmptyState title="No transactions found" description="Selected filters ke liye koi accounting entry nahi mili." />;
  }
  return (
    <div className="ac-table-scroll">
      <table className="ac-table">
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Category / Details</th><th>Source</th><th>Mode</th><th className="right">Amount</th><th>Status</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const type = transactionType(row);
            const status = transactionStatus(row);
            const isManual = String(row.source_type || "manual").toLowerCase() === "manual";
            return (
              <tr key={row.id}>
                <td className="nowrap">{dateLabel(transactionDate(row))}</td>
                <td><span className={`ac-type ${type === "income" ? "income" : "expense"}`}>{type === "income" ? "Income" : "Expense"}</span></td>
                <td className="ac-detail-cell"><strong>{row.category || "Uncategorised"}</strong><small>{row.description || row.reference_number || "—"}</small></td>
                <td>{transactionSource(row)}</td>
                <td>{row.payment_mode || "—"}</td>
                <td className={`right nowrap amount ${type === "income" ? "positive" : "negative"}`}>{type === "income" ? "+" : "−"}{money(transactionAmount(row))}</td>
                <td><span className={`ac-status ${status === "posted" ? "posted" : "voided"}`}>{status === "posted" ? "Posted" : "Voided"}</span></td>
                <td>{status === "posted" && isManual ? <button type="button" className="ac-text-btn danger" onClick={() => onVoid(row)}>Void</button> : <span className="ac-muted">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function unwrapPayload(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function toArray(response) {
  const value = unwrapPayload(response);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
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

async function resolveAccountsScope(user) {
  // Match Dashboard's school/session resolution so Accounts uses the same scope.
  // The authenticated user may not include school_id for administrator accounts.
  const userSchoolId = idFrom(user, ["school_id", "schoolId"])
    || idFrom(user?.school, ["id", "school_id", "schoolId"]);

  let school = user?.school && typeof user.school === "object" ? user.school : null;
  let schools = [];
  let schoolId = userSchoolId;

  try {
    schools = toArray(await getSchools());
  } catch {
    // If the school-list endpoint is restricted, use an explicit user assignment only.
  }

  if (schoolId) {
    school = schools.find((item) => idFrom(item, ["id", "school_id", "schoolId"]) === schoolId) || school;
  } else {
    const associatedId = idFrom(user?.school, ["id", "school_id", "schoolId"]);
    school = schools.find((item) => idFrom(item, ["id", "school_id", "schoolId"]) === associatedId)
      || (schools.length === 1 ? schools[0] : null);
    schoolId = idFrom(school, ["id", "school_id", "schoolId"]);
    // Dashboard currently uses school ID 1 as its configured default for admin accounts.
    if (!schoolId) {
      schoolId = 1;
      school = schools.find((item) => idFrom(item, ["id", "school_id", "schoolId"]) === schoolId) || null;
    }
  }

  if (!schoolId) throw new Error("Logged-in user ke liye school resolve nahi hua. User profile/school assignment check karo.");

  let session = null;
  try {
    session = unwrapPayload(await getCurrentAcademicSession(schoolId));
    if (session?.data && !idFrom(session, ["id", "academic_session_id", "session_id"])) session = session.data;
    if (Array.isArray(session)) session = session[0] || null;
  } catch {
    // Fall back to the session list below.
  }

  let sessionId = idFrom(session, ["id", "academic_session_id", "session_id"]);
  if (!sessionId) {
    const sessions = toArray(await getAcademicSessions(schoolId));
    const currentSession = sessions.find((item) => item?.is_current === true || item?.isCurrent === true || item?.current === true || String(item?.status || "").toLowerCase() === "current");
    const yearSession = sessions.find((item) => {
      const label = String(item?.name || item?.session_name || item?.academic_year || item?.label || "");
      return /2026\s*[-–/]\s*2027|2026\s*[-–/]\s*27/.test(label);
    });
    session = currentSession || yearSession || (sessions.length === 1 ? sessions[0] : null);
    sessionId = idFrom(session, ["id", "academic_session_id", "session_id"]);
  }

  if (!sessionId) throw new Error("Academic session ID resolve nahi hua. School Settings mein 2026–27 session ko current set karo.");

  const sessionName = session?.name || session?.session_name || session?.academic_year || session?.label || "Selected academic session";
  return { schoolId, sessionId, schoolName: school?.name || school?.school_name || user?.school_name || user?.school?.name || "School", sessionName };
}

export default function Accounts({ initialTab = "overview" } = {}) {
  const { user } = useAuth();
  const [scope, setScope] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [transactions, setTransactions] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [planError, setPlanError] = useState("");
  const [studentsError, setStudentsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [txnError, setTxnError] = useState("");
  const [paymentsError, setPaymentsError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [period, setPeriod] = useState("session");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showFeePaymentForm, setShowFeePaymentForm] = useState(false);
  const [feePaymentForm, setFeePaymentForm] = useState({ planId: "", installmentId: "", amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMode: "cash", referenceNumber: "", remarks: "", idempotencyKey: createIdempotencyKey() });
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [importing, setImporting] = useState(false);
  const [importInputKey, setImportInputKey] = useState(0);
  const [importPreview, setImportPreview] = useState(null);
  const importRef = useRef(null);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setTxnError("");
    setPaymentsError("");
    setPlanError("");
    setStudentsError("");
    setNotice("");

    let activeScope;
    try {
      activeScope = await resolveAccountsScope(user);
      setScope(activeScope);
    } catch (error) {
      setTransactions([]);
      setFeePayments([]);
      setFeePlans([]);
      setStudents([]);
      setTxnError(error?.message || "School/session resolve nahi hua.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { schoolId, sessionId } = activeScope;
    // The accounting endpoint caps each response at 2,000 rows. Walk offsets
    // until the final short page so older transactions do not disappear from
    // totals, reports, exports, or duplicate-import checks.
    const fetchAllTransactions = async () => {
      const pageSize = 2000;
      const collected = [];
      for (let offset = 0; ; offset += pageSize) {
        const response = await apiClient.get(TXN_ENDPOINT, {
          params: {
            school_id: schoolId,
            academic_session_id: sessionId,
            limit: pageSize,
            offset,
          },
        });
        const page = rowsOf(response?.data);
        collected.push(...page);
        if (page.length < pageSize) break;
      }
      // Defensive de-duplication in case concurrent inserts shift offset pages.
      const unique = new Map();
      for (const row of collected) unique.set(String(row.id), row);
      return [...unique.values()];
    };
    const [txnResult, paymentResult, planResult, studentsResult] = await Promise.allSettled([
      fetchAllTransactions(),
      fetchPagedResource(listFeePayments, { school_id: schoolId, academic_session_id: sessionId }, "offset"),
      fetchPagedResource(listStudentFeePlans, { school_id: schoolId, academic_session_id: sessionId, is_active: true }, "page"),
      fetchPagedResource(getStudents, { school_id: schoolId, academic_session_id: sessionId, is_active: true }, "page"),
    ]);

    if (txnResult.status === "fulfilled") {
      setTransactions(txnResult.value);
    } else {
      setTransactions([]);
      setTxnError(txnResult.reason?.response?.data?.detail || txnResult.reason?.message || "Accounting ledger load nahi ho paaya. Backend endpoint connection required hai.");
    }

    if (paymentResult.status === "fulfilled") {
      setFeePayments(paymentResult.value);
    } else {
      setFeePayments([]);
      setPaymentsError(paymentResult.reason?.response?.data?.detail || paymentResult.reason?.message || "Fee collection summary load nahi ho paayi.");
    }
    if (planResult.status === "fulfilled") setFeePlans(planResult.value);
    else { setFeePlans([]); setPlanError(planResult.reason?.response?.data?.detail || planResult.reason?.message || "Fee plans load nahi ho paaye."); }
    if (studentsResult.status === "fulfilled") setStudents(studentsResult.value);
    else { setStudents([]); setStudentsError(studentsResult.reason?.response?.data?.detail || studentsResult.reason?.message || "Student summary load nahi ho paayi."); }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadData(); }, [user]);

  const range = useMemo(() => getPeriodRange(period, customRange), [period, customRange]);

  const rangeTransactions = useMemo(() => transactions.filter((row) => {
    const date = transactionDate(row);
    if (range.from && date && date < range.from) return false;
    if (range.to && date && date > range.to) return false;
    return true;
  }), [transactions, range]);

  const postedTransactions = useMemo(() => rangeTransactions.filter((row) => transactionStatus(row) === "posted"), [rangeTransactions]);
  const totalIncome = useMemo(() => postedTransactions.filter((row) => transactionType(row) === "income").reduce((sum, row) => sum + transactionAmount(row), 0), [postedTransactions]);
  const totalExpenses = useMemo(() => postedTransactions.filter((row) => transactionType(row) === "expense").reduce((sum, row) => sum + transactionAmount(row), 0), [postedTransactions]);
  // Only genuinely posted receipts count toward fee recovery. Reversed, voided,
  // cancelled and draft rows remain visible in history but never reduce balances.
  const postedFeePayments = useMemo(() => feePayments.filter((row) => {
    const status = String(row.status || row.payment_status || "posted").toLowerCase();
    return status === "posted";
  }), [feePayments]);
  const totalFeeCollections = useMemo(() => postedFeePayments.reduce((sum, row) => sum + Number(row.amount ?? row.paid_amount ?? 0), 0), [postedFeePayments]);
  const activeFeePlans = useMemo(() => feePlans.filter((plan) => {
    const status = String(plan.status || "active").toLowerCase();
    return plan.is_active !== false && !["inactive", "archived", "cancelled", "canceled", "voided"].includes(status);
  }), [feePlans]);
  const totalSessionFees = useMemo(() => activeFeePlans.reduce((sum, plan) => sum + Number(plan.net_amount ?? plan.total_amount ?? plan.amount ?? 0), 0), [activeFeePlans]);
  const pendingFeeAmount = Math.max(0, totalSessionFees - totalFeeCollections);
  const feeProgress = totalSessionFees > 0 ? Math.min(100, (totalFeeCollections / totalSessionFees) * 100) : 0;
  const studentFeeStatus = useMemo(() => {
    const paidByPlan = new Map();
    const paidByStudent = new Map();
    postedFeePayments.forEach((payment) => {
      const amount = Number(payment.amount ?? payment.paid_amount ?? 0);
      if (payment.student_fee_plan_id != null) paidByPlan.set(String(payment.student_fee_plan_id), (paidByPlan.get(String(payment.student_fee_plan_id)) || 0) + amount);
      if (payment.student_id != null) paidByStudent.set(String(payment.student_id), (paidByStudent.get(String(payment.student_id)) || 0) + amount);
    });
    const totals = new Map();
    activeFeePlans.forEach((plan) => {
      const studentId = String(plan.student_id ?? "unknown");
      const amount = Number(plan.net_amount ?? plan.total_amount ?? plan.amount ?? 0);
      const paid = paidByPlan.has(String(plan.id)) ? paidByPlan.get(String(plan.id)) : 0;
      const entry = totals.get(studentId) || { studentId, planned: 0, paid: 0 };
      entry.planned += amount;
      entry.paid += paid;
      totals.set(studentId, entry);
    });
    // When legacy payments are not linked to a plan id, use the student's session payment total.
    for (const [studentId, entry] of totals) {
      if (entry.paid === 0 && paidByStudent.has(studentId)) entry.paid = paidByStudent.get(studentId);
    }
    const rows = [...totals.values()].map((item) => ({ ...item, pending: Math.max(0, item.planned - item.paid) }));
    return {
      rows,
      studentsWithPlans: rows.length,
      withPending: rows.filter((item) => item.pending > 0).length,
      fullyPaid: rows.filter((item) => item.planned > 0 && item.pending <= 0).length,
      partial: rows.filter((item) => item.paid > 0 && item.pending > 0).length,
      topPending: rows.filter((item) => item.pending > 0).sort((a, b) => b.pending - a.pending).slice(0, 6),
    };
  }, [postedFeePayments, activeFeePlans]);
  const incomeCount = postedTransactions.filter((row) => transactionType(row) === "income").length;
  const expenseCount = postedTransactions.filter((row) => transactionType(row) === "expense").length;
  const voidedCount = rangeTransactions.filter((row) => transactionStatus(row) !== "posted").length;
  const netBalance = totalIncome - totalExpenses;
  const incomeByCategory = useMemo(() => categoryTotals(postedTransactions.filter((row) => transactionType(row) === "income")), [postedTransactions]);
  const expenseByCategory = useMemo(() => categoryTotals(postedTransactions.filter((row) => transactionType(row) === "expense")), [postedTransactions]);
  const monthlyFlow = useMemo(() => {
    const map = new Map();
    postedTransactions.forEach((row) => {
      const date = transactionDate(row);
      if (!date) return;
      const key = date.slice(0, 7);
      const entry = map.get(key) || { month: key, income: 0, expense: 0 };
      if (transactionType(row) === "income") entry.income += transactionAmount(row);
      else entry.expense += transactionAmount(row);
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [postedTransactions]);

  const visibleTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...rangeTransactions]
      .filter((row) => {
        const type = transactionType(row);
        const category = String(row.category || "").toLowerCase();
        const source = String(row.source_type || row.source_module || "manual").toLowerCase();
        if (typeFilter !== "all" && type !== typeFilter) return false;
        if (sourceFilter !== "all" && source !== sourceFilter) return false;
        if (tab === "income" && type !== "income") return false;
        if (tab === "expenses" && type !== "expense") return false;
        if (tab === "fees" && !(source.includes("fee") || category.includes("student fee"))) return false;
        if (tab === "salary" && !(source.includes("staff") || source.includes("salary") || category.includes("salary") || category.includes("payroll"))) return false;
        if (tab === "transport" && !(source.includes("transport") || source.includes("fuel") || category.includes("fuel") || category.includes("transport"))) return false;
        if (tab === "maintenance" && !(source.includes("maintenance") || category.includes("maintenance"))) return false;
        if (!q) return true;
        return [row.category, row.description, row.reference_number, row.payment_mode, row.source_type, row.id, transactionDate(row)]
          .filter(Boolean).join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => transactionDate(b).localeCompare(transactionDate(a)) || Number(b.id || 0) - Number(a.id || 0));
  }, [rangeTransactions, query, typeFilter, sourceFilter, tab]);

  function categoryTotals(rows) {
    const grouped = new Map();
    rows.forEach((row) => {
      const key = row.category || "Uncategorised";
      grouped.set(key, (grouped.get(key) || 0) + transactionAmount(row));
    });
    return [...grouped.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
  }

  function startCreate(type = "expense") {
    setForm({ ...EMPTY_FORM, transaction_type: type, category: type === "income" ? "Other Income" : "Other" });
    setFormError("");
    setShowForm(true);
  }

  async function saveTransaction(event) {
    event.preventDefault();
    setFormError("");
    const amount = Number(form.amount);
    if (!form.transaction_date) return setFormError("Transaction date required hai.");
    if (!form.category.trim()) return setFormError("Category select karna zaroori hai.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Amount zero se zyada hona chahiye.");
    if (!form.description.trim()) return setFormError("Description/purpose likhna zaroori hai.");
    if (form.transaction_type === "income" && !INCOME_CATEGORIES.includes(form.category)) return setFormError("Income ke liye valid category select karo.");
    if (form.transaction_type === "expense" && !EXPENSE_CATEGORIES.includes(form.category)) return setFormError("Expense ke liye valid category select karo.");

    if (!scope?.schoolId || !scope?.sessionId) return setFormError("School aur academic session load hone do, phir entry save karo.");
    setSaving(true);
    try {
      await apiClient.post(TXN_ENDPOINT, {
        school_id: scope?.schoolId,
        academic_session_id: scope?.sessionId,
        transaction_type: form.transaction_type,
        category: form.category,
        amount,
        transaction_date: form.transaction_date,
        payment_mode: form.payment_mode || null,
        reference_number: form.reference_number.trim() || null,
        description: form.description.trim(),
      });
      setShowForm(false);
      setNotice(`${form.transaction_type === "income" ? "Income" : "Expense"} entry successfully save ho gayi.`);
      setForm(EMPTY_FORM);
      await loadData(true);
    } catch (err) {
      setFormError(err?.response?.data?.detail || err?.message || "Transaction save nahi hua. Backend accounting endpoint verify karo.");
    } finally {
      setSaving(false);
    }
  }

  async function saveStudentFeePayment(event) {
    event.preventDefault();
    setFormError("");
    if (!scope?.schoolId || !scope?.sessionId) return setFormError("School aur academic session load hone do.");
    if (!selectedFeeStudent) return setFormError("Pehle student select karo.");
    const plan = selectedStudentPlans.find((item) => String(item.id) === String(feePaymentForm.planId));
    if (!plan) return setFormError("Student ka fee plan select karo.");
    const amount = Number(feePaymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Payment amount zero se zyada hona chahiye.");
    if (!feePaymentForm.paymentDate) return setFormError("Payment date select karo.");
    setSaving(true);
    try {
      await createFeePayment({
        school_id: scope.schoolId,
        academic_session_id: scope.sessionId,
        student_id: Number(selectedFeeStudent.id),
        student_fee_plan_id: Number(plan.id),
        installment_id: feePaymentForm.installmentId ? Number(feePaymentForm.installmentId) : null,
        amount,
        payment_date: feePaymentForm.paymentDate,
        payment_mode: feePaymentForm.paymentMode,
        reference_number: feePaymentForm.referenceNumber.trim() || null,
        remarks: feePaymentForm.remarks.trim() || null,
        idempotency_key: feePaymentForm.idempotencyKey,
      });
      setShowFeePaymentForm(false);
      setFeePaymentForm({ planId: "", installmentId: "", amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMode: "cash", referenceNumber: "", remarks: "", idempotencyKey: createIdempotencyKey() });
      setNotice("Student fee payment saved. Receipt number payment history mein available hoga, aur accounting entry backend se automatically create hogi.");
      await loadData(true);
    } catch (err) {
      setFormError(err?.response?.data?.detail || err?.message || "Fee payment save nahi hua.");
    } finally {
      setSaving(false);
    }
  }

  function printFeeReceipt(payment) {
    const escapeHtml = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const receiptNo = payment.receipt_number || payment.receipt_no || payment.receipt_id || `#${payment.id}`;
    const plan = selectedStudentPlans.find((item) => String(item.id) === String(payment.student_fee_plan_id));
    const amount = money(payment.amount ?? payment.paid_amount ?? 0);
    const popup = window.open("", "_blank", "width=760,height=760");
    if (!popup) { setNotice("Receipt window browser ne block kar di. Pop-ups allow karke dobara try karo."); return; }
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fee Receipt ${escapeHtml(receiptNo)}</title><style>body{font-family:Arial,sans-serif;color:#172554;margin:0;padding:28px}.receipt{max-width:680px;margin:auto;border:1px solid #cbd5e1;padding:28px;border-radius:12px}.head{text-align:center;border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:20px}.head h1{margin:0;font-size:24px}.head p{margin:6px 0;color:#64748b}.row{display:flex;justify-content:space-between;gap:20px;padding:10px 0;border-bottom:1px solid #e2e8f0}.row span{color:#64748b}.amount{font-size:24px;font-weight:800;color:#047857;margin:20px 0}.foot{margin-top:38px;display:flex;justify-content:space-between;font-size:12px;color:#64748b}.actions{text-align:center;margin:20px}@media print{body{padding:0}.receipt{border:0;border-radius:0}.actions{display:none}}</style></head><body><div class="receipt"><div class="head"><h1>${escapeHtml(scope?.schoolName || "School")}</h1><p>FEE PAYMENT RECEIPT</p><p>${escapeHtml(scope?.sessionName || "Academic Session")}</p></div><div class="row"><span>Receipt Number</span><strong>${escapeHtml(receiptNo)}</strong></div><div class="row"><span>Student Name</span><strong>${escapeHtml(selectedFeeStudent?.name || "—")}</strong></div><div class="row"><span>Admission Number</span><strong>${escapeHtml(selectedFeeStudent?.admissionNo || "—")}</strong></div><div class="row"><span>Class</span><strong>${escapeHtml(selectedFeeStudent?.className || "—")}</strong></div><div class="row"><span>Payment Date</span><strong>${escapeHtml(dateLabel(payment.payment_date || payment.date || payment.created_at))}</strong></div><div class="row"><span>Fee Plan</span><strong>${escapeHtml(plan?.name || plan?.plan_name || (plan ? `Fee Plan #${plan.id}` : `Fee Plan #${payment.student_fee_plan_id || "—"}`))}</strong></div><div class="row"><span>Payment Mode</span><strong>${escapeHtml(payment.payment_mode || payment.mode || "—")}</strong></div><div class="row"><span>Reference</span><strong>${escapeHtml(payment.reference_number || payment.transaction_reference || "—")}</strong></div><div class="amount">Amount Received: ${escapeHtml(amount)}</div><div class="row"><span>Status</span><strong>${escapeHtml(payment.status || "Posted")}</strong></div><div class="row"><span>Remarks</span><strong>${escapeHtml(payment.remarks || payment.description || "—")}</strong></div><div class="foot"><span>Computer generated receipt</span><span>Authorized Signatory: __________________</span></div></div><div class="actions"><button onclick="window.print()">Print Receipt</button></div><script>window.onload=()=>window.print();</script></body></html>`);
    popup.document.close();
  }

  async function voidTransaction() {
    if (!voidTarget || voidReason.trim().length < 5) return;
    if (!scope?.schoolId || !scope?.sessionId) { setNotice("School/session resolve nahi hua; transaction void nahi kiya."); return; }
    setSaving(true);
    setFormError("");
    try {
      await apiClient.post(
        `${TXN_ENDPOINT}/${voidTarget.id}/void`,
        { reason: voidReason.trim() },
        { params: { school_id: scope?.schoolId, academic_session_id: scope?.sessionId } },
      );
      setVoidTarget(null);
      setVoidReason("");
      setNotice("Transaction void ho gaya. Original record history mein rahega.");
      await loadData(true);
    } catch (err) {
      setNotice(err?.response?.data?.detail || err?.message || "Transaction void nahi ho paaya.");
    } finally {
      setSaving(false);
    }
  }

  function exportRows(rows = visibleTransactions) {
    downloadCsv(`edusphere_accounts_${toIsoDate(new Date())}.csv`, [
      ["id", "transaction_date", "transaction_type", "category", "amount", "payment_mode", "reference_number", "description", "source_type", "status"],
      ...rows.map((row) => [row.id, transactionDate(row), transactionType(row), row.category, transactionAmount(row), row.payment_mode, row.reference_number, row.description, row.source_type, transactionStatus(row)]),
    ]);
  }

  function downloadSample() {
    downloadCsv("accounts_import_sample.csv", [
      ["transaction_date", "transaction_type", "category", "amount", "payment_mode", "reference_number", "description"],
      ["2026-10-01", "income", "Other Income", "1500", "UPI", "INC-001", "School event contribution"],
      ["2026-10-02", "expense", "Maintenance", "850", "Cash", "EXP-001", "Classroom fan repair"],
    ]);
  }

  async function importCsv(file) {
    if (!file) return;
    setNotice("");
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error("CSV empty hai ya format valid nahi hai.");
      const required = ["transaction_date", "transaction_type", "category", "amount", "description"];
      const missing = required.filter((key) => !(key in rows[0]));
      if (missing.length) throw new Error(`CSV columns missing: ${missing.join(", ")}`);
      const seenInFile = new Set();
      const existingManualFingerprints = new Set(
        transactions
          .filter((item) => String(item.source_type || "manual").toLowerCase() === "manual")
          .map(transactionFingerprint)
      );
      const previewRows = rows.map((row, index) => {
        const errors = [];
        const type = String(row.transaction_type || "").toLowerCase().trim();
        const amount = Number(row.amount);
        const normalizedRow = {
          ...row,
          transaction_date: String(row.transaction_date || "").trim(),
          transaction_type: type,
          category: String(row.category || "").trim(),
          amount,
          payment_mode: String(row.payment_mode || "").trim(),
          reference_number: String(row.reference_number || "").trim(),
          description: String(row.description || "").trim(),
        };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedRow.transaction_date)) errors.push("date must be YYYY-MM-DD");
        if (!["income", "expense"].includes(type)) errors.push("type must be income or expense");
        if (!normalizedRow.category) errors.push("category is required");
        if (!normalizedRow.description) errors.push("description is required");
        if (!Number.isFinite(amount) || amount <= 0) errors.push("amount must be > 0");
        if (type === "income" && !INCOME_CATEGORIES.includes(normalizedRow.category)) errors.push("unsupported income category");
        if (type === "expense" && !EXPENSE_CATEGORIES.includes(normalizedRow.category)) errors.push("unsupported expense category");
        if (!errors.length) {
          const fingerprint = transactionFingerprint(normalizedRow);
          if (existingManualFingerprints.has(fingerprint)) errors.push("duplicate matches an existing manual transaction");
          else if (seenInFile.has(fingerprint)) errors.push("duplicate row in this CSV");
          seenInFile.add(fingerprint);
        }
        return { line: index + 2, row: normalizedRow, errors };
      });
      setImportPreview({ name: file.name, rows: previewRows });
    } catch (err) {
      setNotice(err?.message || "CSV preview fail ho gaya.");
    } finally {
      setImportInputKey((key) => key + 1);
    }
  }

  async function confirmCsvImport() {
    if (!importPreview) return;
    if (!scope?.schoolId || !scope?.sessionId) { setNotice("School/session resolve nahi hua; CSV import nahi kiya."); return; }
    const validRows = importPreview.rows.filter((item) => item.errors.length === 0);
    if (!validRows.length) { setNotice("CSV mein import karne ke liye valid rows nahi hain."); return; }
    setImporting(true);
    let imported = 0;
    const errors = [];
    for (const item of validRows) {
      try {
        await apiClient.post(TXN_ENDPOINT, {
          school_id: scope?.schoolId,
          academic_session_id: scope?.sessionId,
          transaction_type: item.row.transaction_type,
          category: item.row.category,
          amount: item.row.amount,
          transaction_date: item.row.transaction_date,
          payment_mode: item.row.payment_mode || null,
          reference_number: item.row.reference_number || null,
          description: item.row.description,
        });
        imported += 1;
      } catch (error) {
        errors.push(`Row ${item.line}: ${error?.response?.data?.detail || error?.message || "API error"}`);
      }
    }
    setImporting(false);
    setImportPreview(null);
    const skipped = importPreview.rows.length - validRows.length;
    setNotice(`CSV import result: ${imported} imported, ${skipped} invalid/duplicate rows skipped, ${errors.length} API failures.${errors.length ? ` First issue: ${errors[0]}` : ""}`);
    await loadData(true);
  }

  const maxFlow = Math.max(1, ...monthlyFlow.map((item) => Math.max(item.income, item.expense)));
  const tabHeading = TABS.find((item) => item.id === tab)?.label || "Accounts";
  const showTable = ["ledger", "income", "expenses", "salary", "transport", "maintenance"].includes(tab);
  const feeStudentRows = useMemo(() => {
    const paidByStudent = new Map();
    const plannedByStudent = new Map();
    postedFeePayments.forEach((payment) => {
      const id = String(payment.student_id ?? "");
      if (!id) return;
      paidByStudent.set(id, (paidByStudent.get(id) || 0) + Number(payment.amount ?? payment.paid_amount ?? 0));
    });
    activeFeePlans.forEach((plan) => {
      const id = String(plan.student_id ?? "");
      if (!id) return;
      plannedByStudent.set(id, (plannedByStudent.get(id) || 0) + Number(plan.net_amount ?? plan.total_amount ?? plan.amount ?? 0));
    });
    return students.map((student) => {
      const id = String(student.id);
      const name = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ").trim() || student.name || student.full_name || `Student #${id}`;
      const planned = plannedByStudent.get(id) || 0;
      const paid = paidByStudent.get(id) || 0;
      return { student, id, name, planned, paid, pending: Math.max(0, planned - paid), className: student.class_name || student.classroom_name || student.class || student.grade || "—", admissionNo: student.admission_number || student.admission_no || student.sr_no || student.student_code || "—" };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, activeFeePlans, postedFeePayments]);
  const selectedFeeStudent = feeStudentRows.find((row) => row.id === String(selectedStudentId)) || null;
  const selectedStudentPlans = selectedFeeStudent ? activeFeePlans.filter((plan) => String(plan.student_id) === selectedFeeStudent.id) : [];
  // Keep reversed rows visible in the student's audit/history, but never count
  // them as money received. Dashboard totals continue to use postedFeePayments.
  const selectedStudentPayments = selectedFeeStudent ? feePayments.filter((payment) => String(payment.student_id) === selectedFeeStudent.id).sort((a, b) => String(b.payment_date || b.date || b.created_at || "").localeCompare(String(a.payment_date || a.date || a.created_at || ""))) : [];
  // Reconcile installment balances: explicit installment links first, then
  // allocate legacy/unassigned posted payments to oldest installments in order.
  const selectedInstallmentRows = useMemo(() => {
    if (!selectedFeeStudent) return [];
    const plans = selectedStudentPlans.map((plan) => ({
      plan,
      installments: (plan.installments || []).filter((item) => item.is_active !== false)
        .slice().sort((a, b) => Number(a.installment_number || 0) - Number(b.installment_number || 0) || String(a.due_date || "").localeCompare(String(b.due_date || "")))
        .map((item) => ({ plan, item, due: Math.max(0, Number(item.amount || 0)), paid: 0 }))
    }));
    const flat = plans.flatMap((group) => group.installments);
    const posted = selectedStudentPayments.filter((payment) => !["reversed", "voided", "cancelled", "canceled"].includes(String(payment.status || "posted").toLowerCase()))
      .slice().sort((a, b) => String(a.payment_date || a.date || a.created_at || "").localeCompare(String(b.payment_date || b.date || b.created_at || "")) || Number(a.id || 0) - Number(b.id || 0));
    const unallocated = [];
    for (const payment of posted) {
      let remaining = Math.max(0, Number(payment.amount ?? payment.paid_amount ?? 0));
      if (!remaining) continue;
      const installmentId = payment.installment_id ?? payment.student_fee_installment_id;
      if (installmentId != null) {
        const row = flat.find((candidate) => String(candidate.item.id) === String(installmentId));
        if (row) { const applied = Math.min(remaining, Math.max(0, row.due - row.paid)); row.paid += applied; remaining -= applied; }
      }
      if (remaining > 0) {
        const planId = payment.student_fee_plan_id ?? payment.fee_plan_id;
        const candidates = flat.filter((row) => (planId == null || String(row.plan.id) === String(planId)) && row.due > row.paid);
        if (candidates.length) {
          // Allocate to oldest outstanding installment; any excess stays unallocated.
          for (const row of candidates) { if (remaining <= 0) break; const applied = Math.min(remaining, row.due - row.paid); row.paid += applied; remaining -= applied; }
        }
      }
      if (remaining > 0) unallocated.push({ payment, amount: remaining });
    }
    return flat.map((row) => ({ ...row, paid: Math.min(row.due, row.paid), pending: Math.max(0, row.due - row.paid) }));
  }, [selectedFeeStudent, selectedStudentPlans, selectedStudentPayments]);

  return (
    <AppShell>
      <div className="accounts-page">
        <style>{`
          .accounts-page{--ac-ink:#172554;--ac-muted:#64748b;--ac-line:#e2e8f0;--ac-blue:#2563eb;max-width:1680px;margin:0 auto;padding:clamp(14px,2vw,28px);color:var(--ac-ink);font-family:inherit}
          .accounts-page *{box-sizing:border-box}
          .ac-hero{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:24px 26px;border:1px solid #dbeafe;border-radius:22px;background:linear-gradient(115deg,#eff6ff,#fff 56%,#f5f3ff);margin-bottom:18px}
          .ac-kicker{font-size:10px;font-weight:850;letter-spacing:.14em;color:#2563eb;text-transform:uppercase;margin-bottom:8px}
          .ac-hero h1{font-size:clamp(25px,2.3vw,34px);line-height:1.12;letter-spacing:-.04em;margin:0;color:#172554}
          .ac-hero p{font-size:13px;color:#64748b;margin:9px 0 0;line-height:1.55;max-width:650px}
          .ac-actions{display:flex;gap:8px;flex-wrap:wrap}
          .ac-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 13px;border:1px solid #dbe3ef;border-radius:11px;background:#fff;color:#334155;font-size:12px;font-weight:800;cursor:pointer;min-height:40px;transition:all .16s ease}
          .ac-btn:hover{border-color:#93c5fd;background:#f8fbff;transform:translateY(-1px)}.ac-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
          .ac-btn.primary{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border-color:transparent;box-shadow:0 7px 18px #2563eb22}.ac-btn.primary:hover{background:linear-gradient(135deg,#1d4ed8,#4338ca)}
          .ac-period{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;margin-bottom:16px}
          .ac-period label{display:flex;align-items:center;gap:7px;color:#64748b;font-size:11px;font-weight:800}.ac-period select,.ac-period input{min-height:35px;padding:7px 9px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#334155;font:inherit;font-size:12px;max-width:100%}.ac-period .range{display:flex;gap:6px;align-items:center}
          .ac-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-bottom:17px}.ac-kpi{position:relative;overflow:hidden;border:1px solid #e2e8f0;border-radius:17px;padding:16px 18px;background:#fff;box-shadow:0 5px 18px #0f172a08;min-width:0}.ac-kpi:after{content:"";position:absolute;width:86px;height:86px;right:-27px;bottom:-42px;background:#dbeafe;border-radius:50%;opacity:.8}.ac-kpi-green:after{background:#d1fae5}.ac-kpi-rose:after{background:#ffe4e6}.ac-kpi-purple:after{background:#ede9fe}.ac-kpi-top{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:9px;color:#64748b;font-size:11px;font-weight:800}.ac-kpi-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;color:#2563eb;background:#eff6ff;flex-shrink:0}.ac-kpi-green .ac-kpi-icon{background:#ecfdf5;color:#059669}.ac-kpi-rose .ac-kpi-icon{background:#fff1f2;color:#e11d48}.ac-kpi-purple .ac-kpi-icon{background:#f5f3ff;color:#7c3aed}.ac-kpi>strong{position:relative;z-index:1;display:block;margin-top:11px;font-size:clamp(19px,2vw,27px);letter-spacing:-.045em;line-height:1.2;color:#172554;overflow-wrap:anywhere}.ac-kpi>small{position:relative;z-index:1;display:block;margin-top:7px;color:#94a3b8;font-size:10px;line-height:1.4}
          .ac-workspace{border:1px solid #e2e8f0;border-radius:19px;background:#fff;overflow:hidden;box-shadow:0 6px 22px #0f172a08}.ac-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:13px 15px;background:#fbfcff;border-bottom:1px solid #e8edf7}.ac-tabs{display:flex;gap:5px;flex-wrap:wrap}.ac-tab{display:inline-flex;align-items:center;gap:7px;border:1px solid transparent;background:transparent;color:#64748b;font:inherit;font-size:11px;font-weight:800;border-radius:10px;padding:10px 11px;cursor:pointer;white-space:nowrap}.ac-tab.active{border-color:#dbeafe;background:#fff;color:#1d4ed8;box-shadow:0 3px 10px #1e40af10}.ac-toolbar-actions{display:flex;gap:8px;flex-wrap:wrap}
          .ac-content{padding:18px}.ac-section-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}.ac-alert{display:flex;align-items:flex-start;gap:9px;padding:12px 14px;margin-bottom:12px;border-radius:12px;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;font-size:12px;line-height:1.5}.ac-alert.error{border-color:#fecaca;background:#fef2f2;color:#991b1b}.ac-alert.warn{border-color:#fde68a;background:#fffbeb;color:#92400e}.ac-overview-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:14px;align-items:start}.ac-panel{border:1px solid #e1e7f3;border-radius:15px;padding:17px;background:#fff;min-width:0}.ac-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:13px}.ac-panel h3{margin:0;font-size:14px;letter-spacing:-.015em;color:#172554}.ac-panel-sub{color:#94a3b8;font-size:11px;margin:5px 0 0;line-height:1.5}.ac-muted{color:#94a3b8;font-size:11px}.ac-flow-list{display:flex;flex-direction:column;gap:12px}.ac-flow-row{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:9px;align-items:center}.ac-flow-label{font-size:11px;color:#64748b;font-weight:750}.ac-flow-track{height:9px;border-radius:99px;background:#f1f5f9;overflow:hidden;display:flex}.ac-flow-bar{height:100%;border-radius:99px;min-width:0}.ac-flow-bar.income{background:linear-gradient(90deg,#10b981,#34d399)}.ac-flow-bar.expense{background:linear-gradient(90deg,#f97316,#fb7185)}.ac-flow-value{font-size:11px;font-weight:800;white-space:nowrap}
          .ac-shortcuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ac-shortcut{display:flex;align-items:center;gap:10px;text-align:left;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;min-width:0;transition:all .15s}.ac-shortcut:hover{border-color:#bfdbfe;background:#f8fbff}.ac-shortcut-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#eff6ff;color:#2563eb;flex-shrink:0}.ac-shortcut-icon.green{background:#ecfdf5;color:#059669}.ac-shortcut-icon.orange{background:#fff7ed;color:#ea580c}.ac-shortcut-icon.purple{background:#f5f3ff;color:#7c3aed}.ac-shortcut strong{display:block;color:#172554;font-size:11px}.ac-shortcut small{display:block;color:#94a3b8;font-size:10px;margin-top:4px;line-height:1.4}
          .ac-mini-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:15px}.ac-mini-stat{padding:12px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;min-width:0}.ac-mini-stat span{display:block;color:#64748b;font-size:10px;font-weight:750}.ac-mini-stat strong{display:block;color:#172554;font-size:15px;margin-top:6px;overflow-wrap:anywhere}.ac-mini-stat small{display:block;color:#94a3b8;font-size:10px;margin-top:4px}
          .ac-recent{width:100%;border-collapse:separate;border-spacing:0}.ac-recent th,.ac-recent td{padding:10px 9px;text-align:left;border-bottom:1px solid #eef2f7;font-size:11px;vertical-align:middle}.ac-recent th{background:#f8faff;color:#64748b;text-transform:uppercase;font-size:9px;letter-spacing:.08em;font-weight:850;white-space:nowrap}.ac-recent tr:last-child td{border-bottom:0}.ac-recent td strong{display:block;color:#172554;font-size:11px}.ac-recent td small{display:block;color:#94a3b8;margin-top:3px;font-size:10px}.ac-table-scroll{width:100%;overflow:auto;border:1px solid #e8edf5;border-radius:12px}.ac-table{display:table;width:100%!important;min-width:900px;table-layout:fixed;border-collapse:separate;border-spacing:0}.ac-table{width:100%;min-width:0;table-layout:fixed}.ac-fee-plan-table th:nth-child(1){width:38%}.ac-fee-plan-table th:nth-child(2),.ac-fee-plan-table th:nth-child(3),.ac-fee-plan-table th:nth-child(4){width:16%}.ac-fee-plan-table th:nth-child(5){width:14%}.ac-fee-installment-table th:nth-child(1){width:23%}.ac-fee-installment-table th:nth-child(2){width:17%}.ac-fee-installment-table th:nth-child(3){width:13%}.ac-fee-installment-table th:nth-child(4),.ac-fee-installment-table th:nth-child(5),.ac-fee-installment-table th:nth-child(6){width:12%}.ac-fee-installment-table th:nth-child(7){width:11%}.ac-payment-history-table th:nth-child(1){width:12%}.ac-payment-history-table th:nth-child(2){width:19%}.ac-payment-history-table th:nth-child(3){width:15%}.ac-payment-history-table th:nth-child(4){width:13%}.ac-payment-history-table th:nth-child(5){width:12%}.ac-payment-history-table th:nth-child(6){width:10%}.ac-payment-history-table th:nth-child(7){width:12%}.ac-student-list-table th:nth-child(1){width:17%}.ac-student-list-table th:nth-child(2){width:14%}.ac-student-list-table th:nth-child(3){width:9%}.ac-student-list-table th:nth-child(4),.ac-student-list-table th:nth-child(5),.ac-student-list-table th:nth-child(6){width:11%}.ac-student-list-table th:nth-child(7){width:10%}.ac-student-list-table th:nth-child(8){width:17%}.ac-table-scroll{width:100%;max-width:100%;overflow-x:auto}.ac-table td{overflow-wrap:anywhere;word-break:normal}.ac-table td .ac-btn{white-space:nowrap}
          .ac-table th,.ac-table td{padding:12px 11px;text-align:left;border-bottom:1px solid #eef2f7;vertical-align:middle;font-size:11px;overflow-wrap:anywhere;line-height:1.45}.ac-table th{position:sticky;top:0;background:#f8faff;color:#64748b;text-transform:uppercase;font-size:9px;letter-spacing:.07em;font-weight:850;white-space:nowrap}.ac-table tbody tr:hover{background:#fafcff}.ac-table tbody tr:last-child td{border-bottom:0}.ac-table td strong{display:block;max-width:100%;font-size:11px;line-height:1.4;overflow-wrap:anywhere}.ac-table td small{display:block;max-width:100%;margin-top:4px;color:#94a3b8;font-size:10px;line-height:1.4;overflow-wrap:anywhere}.ac-table td .ac-btn{max-width:100%;white-space:normal}.ac-table .right{text-align:right}.ac-table .nowrap{white-space:nowrap}.ac-detail-cell strong{display:block;font-size:11px;color:#172554}.ac-detail-cell small{display:block;color:#94a3b8;margin-top:4px;font-size:10px;max-width:210px;overflow-wrap:anywhere}.ac-type,.ac-status{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:850;white-space:nowrap}.ac-type.income{color:#047857;background:#d1fae5}.ac-type.expense{color:#be123c;background:#ffe4e6}.ac-status.posted{color:#166534;background:#dcfce7}.ac-status.voided{color:#991b1b;background:#fee2e2}.ac-table .amount{font-weight:850}.ac-table .positive{color:#059669}.ac-table .negative{color:#e11d48}.ac-text-btn{border:0;background:transparent;color:#2563eb;font-size:10px;font-weight:850;cursor:pointer;padding:5px}.ac-text-btn.danger{color:#dc2626}.ac-table-controls{display:flex;align-items:center;justify-content:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:13px}.ac-table-controls .ac-search{flex:1 1 360px;max-width:620px}.ac-table-controls>.ac-btn{flex:0 0 auto}.ac-search{display:flex;align-items:center;gap:8px;min-width:min(340px,100%);min-height:39px;padding:0 11px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#94a3b8}.ac-search:focus-within{border-color:#93c5fd;box-shadow:0 0 0 3px #3b82f61a}.ac-search input{min-width:0;width:100%;border:0;outline:0;color:#172554;font:inherit;font-size:11px}.ac-select{min-height:39px;max-width:100%;padding:8px 10px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#334155;font:inherit;font-size:11px}.ac-muted-line{color:#94a3b8;font-size:11px;margin:12px 0 0;line-height:1.5}
          .ac-bars{display:flex;flex-direction:column;gap:11px}.ac-bar-row{display:grid;grid-template-columns:minmax(105px,1fr) minmax(0,2fr) auto;gap:10px;align-items:center}.ac-bar-label{font-size:11px;color:#475569;overflow-wrap:anywhere}.ac-bar-track{height:9px;background:#f1f5f9;border-radius:99px;overflow:hidden}.ac-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#6366f1,#818cf8)}.ac-bar-value{font-size:10px;color:#334155;font-weight:800;white-space:nowrap}.ac-monthly-chart{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;height:180px;padding-top:5px}.ac-month-column{display:flex;align-items:stretch;justify-content:flex-end;flex-direction:column;min-width:0;text-align:center;gap:6px}.ac-month-bars{display:flex;align-items:flex-end;justify-content:center;gap:4px;height:140px;border-bottom:1px solid #e2e8f0;padding:0 3px}.ac-month-bar{width:min(24px,40%);min-height:2px;border-radius:5px 5px 0 0}.ac-month-bar.income{background:#34d399}.ac-month-bar.expense{background:#fb7185}.ac-month-label{font-size:9px;color:#94a3b8;white-space:nowrap}.ac-legend{display:flex;gap:13px;align-items:center;flex-wrap:wrap;font-size:10px;color:#64748b}.ac-legend span{display:inline-flex;align-items:center;gap:5px}.ac-dot{width:8px;height:8px;border-radius:50%;display:inline-block}.ac-dot.green{background:#34d399}.ac-dot.rose{background:#fb7185}
          .ac-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:42px 18px;min-height:220px}.ac-empty-icon{display:grid;place-items:center;width:54px;height:54px;margin-bottom:13px;border:1px solid #dbeafe;border-radius:16px;background:#eff6ff;color:#2563eb}.ac-empty strong{font-size:14px;color:#172554}.ac-empty p{margin:7px 0 0;max-width:370px;color:#94a3b8;font-size:11px;line-height:1.55}
          .ac-modal-backdrop{position:fixed;z-index:1200;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:#0f172a88;backdrop-filter:blur(4px);overflow:auto}.ac-modal{width:min(620px,100%);max-height:calc(100vh - 32px);overflow:auto;border:1px solid #ffffffbd;border-radius:19px;background:#fff;box-shadow:0 28px 90px #0f172a40}.ac-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:21px 23px;border-bottom:1px solid #eef2f7;background:linear-gradient(110deg,#f8fbff,#fff)}.ac-modal-head h2{margin:0;color:#172554;font-size:19px}.ac-modal-head p{margin:6px 0 0;color:#64748b;font-size:11px;line-height:1.5}.ac-close{display:grid;place-items:center;width:34px;height:34px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#64748b;cursor:pointer;flex-shrink:0}.ac-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:20px 23px}.ac-field{display:flex;flex-direction:column;gap:6px;min-width:0;color:#475569;font-size:11px;font-weight:800}.ac-field.full{grid-column:1/-1}.ac-field input,.ac-field select,.ac-field textarea{width:100%;min-height:40px;padding:10px 11px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#172554;outline:none;font:inherit;font-size:12px}.ac-field input:focus,.ac-field select:focus,.ac-field textarea:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #3b82f61a}.ac-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:0 23px 21px}.ac-form-error{grid-column:1/-1;padding:10px 12px;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:11px;line-height:1.5}.ac-footer-note{margin:14px 0 0;color:#94a3b8;font-size:10px;line-height:1.5}.ac-loader{display:flex;align-items:center;justify-content:center;gap:9px;min-height:150px;color:#64748b;font-size:12px}.ac-spinner{width:17px;height:17px;border:2px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:ac-spin .7s linear infinite}@keyframes ac-spin{to{transform:rotate(360deg)}}
          /* Final table layout correction: fill the entire available panel width; prevent intrinsic-width tables and leftover blank space. */
          .accounts-page .ac-table-scroll{display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;overflow-x:auto}
          .accounts-page .ac-table-scroll > table.ac-table{display:table!important;width:100%!important;min-width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:separate;border-spacing:0;box-sizing:border-box}
          .accounts-page .ac-table-scroll > table.ac-table th,.accounts-page .ac-table-scroll > table.ac-table td{box-sizing:border-box;min-width:0;white-space:normal;overflow-wrap:anywhere;word-break:normal}
          .accounts-page .ac-table-scroll > table.ac-student-list-table{min-width:100%!important}
          .accounts-page .ac-table-scroll > table.ac-fee-plan-table{min-width:100%!important}
          .accounts-page .ac-table-scroll > table.ac-fee-installment-table{min-width:100%!important}
          .accounts-page .ac-table-scroll > table.ac-payment-history-table{min-width:100%!important}
          .accounts-page .ac-table-scroll > table.ac-table th{background:#f8faff}
          .accounts-page .ac-table-scroll > table.ac-table td .ac-btn{max-width:100%;white-space:nowrap}
          @media(max-width:1100px){.ac-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.ac-overview-grid{grid-template-columns:1fr}}
          @media(max-width:700px){.accounts-page{padding:12px}.ac-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ac-hero{padding:19px;border-radius:17px}.ac-actions{width:100%}.ac-actions .ac-btn{flex:1}.ac-period{align-items:flex-start}.ac-period label{flex-wrap:wrap}.ac-period .range{width:100%}.ac-period .range input{flex:1;min-width:0}.ac-toolbar{align-items:stretch}.ac-tabs{width:100%;flex-wrap:nowrap;overflow-x:auto;padding-bottom:3px}.ac-tab{flex-shrink:0}.ac-toolbar-actions{width:100%}.ac-toolbar-actions .ac-btn{flex:1}.ac-content{padding:11px}.ac-shortcuts{grid-template-columns:repeat(2,minmax(0,1fr))}.ac-form{grid-template-columns:1fr;padding:16px}.ac-field.full,.ac-form-error{grid-column:auto}.ac-modal-head{padding:17px}.ac-modal-foot{padding:0 16px 16px;flex-direction:column-reverse}.ac-modal-foot .ac-btn{width:100%}.ac-kpi{padding:14px}.ac-kpi>strong{font-size:22px}.ac-mini-stats{grid-template-columns:1fr}.ac-flow-row{grid-template-columns:82px minmax(0,1fr);}.ac-flow-value{grid-column:2;}.ac-monthly-chart{gap:4px}.ac-month-bars{gap:2px;padding:0 1px}}
          @media(max-width:390px){.ac-kpis{gap:8px}.ac-kpi-top{align-items:flex-start}.ac-kpi-top span:first-child{max-width:100px}.ac-shortcuts{grid-template-columns:1fr}.ac-hero h1{font-size:25px}.ac-hero{gap:13px}}
          @media(prefers-reduced-motion:reduce){.accounts-page *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
        `}</style>

        <header className="ac-hero">
          <div>
            <div className="ac-kicker">Finance · School Core</div>
            <h1>Accounts & Finance</h1>
            <p>Income, expenses, student fee receipts, salary, transport, maintenance aur complete transaction ledger ek jagah manage karo.</p>
          </div>
          <div className="ac-actions">
            <button type="button" className="ac-btn" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "ac-refresh-spin" : ""} /> {refreshing ? "Refreshing..." : "Refresh data"}</button>
            <button type="button" className="ac-btn" onClick={downloadSample}><FileDown size={15} /> CSV sample</button>
            <button type="button" className="ac-btn" onClick={() => importRef.current?.click()} disabled={importing}><Upload size={15} /> {importing ? "Importing..." : "Import CSV"}</button>
            <button type="button" className="ac-btn primary" onClick={() => startCreate("income")}><Plus size={15} /> Add transaction</button>
            <input key={importInputKey} ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => void importCsv(event.target.files?.[0])} />
          </div>
        </header>

        <div className="ac-period">
          <label><CalendarDays size={14} /> Reporting period
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="session">Selected academic session</option>
              <option value="month">Current month</option>
              <option value="30days">Last 30 days</option>
              <option value="today">Today</option>
              <option value="custom">Custom dates</option>
            </select>
          </label>
          {period === "custom" && <div className="range"><input aria-label="From date" type="date" value={customRange.from} onChange={(event) => setCustomRange((old) => ({ ...old, from: event.target.value }))} /><span className="ac-muted">to</span><input aria-label="To date" type="date" value={customRange.to} onChange={(event) => setCustomRange((old) => ({ ...old, to: event.target.value }))} /></div>}
          <span className="ac-muted">{range.from || "Any date"} — {range.to || "Any date"}</span>
          <span className="ac-muted">{scope?.sessionName || "Academic session loading…"} · Session ID: {scope?.sessionId ?? "—"}</span>
        </div>

        {notice && <div className="ac-alert"><CheckCircle2 size={16} /> <span>{notice}</span><button type="button" className="ac-text-btn" onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={14} /></button></div>}
        {txnError && <div className="ac-alert error"><ShieldAlert size={16} /><span><strong>Accounting ledger connection unavailable.</strong> {txnError} Transactions tab ke live records aur create/import/void actions accounting API route add hone ke baad hi kaam karenge.</span></div>}
        {paymentsError && <div className="ac-alert warn"><ShieldAlert size={16} /><span>Fee payment summary load nahi ho paayi: {paymentsError}</span></div>}

        <section className="ac-kpis">
          <Kpi label="Total Session Fees" value={money(totalSessionFees)} note={`${activeFeePlans.length} active student fee plans`} icon={Wallet} tone="blue" />
          <Kpi label="Paid Fees" value={money(totalFeeCollections)} note={`${postedFeePayments.length} posted payment records`} icon={CircleDollarSign} tone="green" />
          <Kpi label="Pending Fees" value={money(pendingFeeAmount)} note={totalSessionFees > 0 ? `${feeProgress.toFixed(1)}% of planned fees collected` : "No active fee-plan totals available"} icon={CalendarDays} tone="rose" />
          <Kpi label="Total Income" value={money(totalIncome)} note={`${incomeCount} posted entries in selected period`} icon={ArrowDownLeft} tone="green" />
          <Kpi label="Total Expenses" value={money(totalExpenses)} note={`${expenseCount} posted entries in selected period`} icon={ArrowUpRight} tone="rose" />
          <Kpi label="Net Balance" value={money(netBalance)} note={netBalance >= 0 ? "Income exceeds expenses" : "Expenses exceed income"} icon={Wallet} tone={netBalance >= 0 ? "purple" : "rose"} />
        </section>

        <section className="ac-workspace">
          <div className="ac-toolbar">
            <div className="ac-tabs" role="tablist" aria-label="Accounts sections">
              {TABS.map((item) => { const TabIcon = item.icon; return <button key={item.id} role="tab" aria-selected={tab === item.id} type="button" className={`ac-tab ${tab === item.id ? "active" : ""}`} onClick={() => { setTab(item.id); setTypeFilter("all"); setSourceFilter("all"); }}><TabIcon size={14} />{item.label}</button>; })}
            </div>
            <div className="ac-toolbar-actions">
              <button type="button" className="ac-btn" onClick={() => exportRows()} disabled={!rangeTransactions.length}><Download size={14} /> Export filtered CSV</button>
            </div>
          </div>

          <div className="ac-content">
            {tab === "overview" && (
              <div className="ac-overview-grid">
                <div className="ac-panel">
                  <div className="ac-panel-head"><div><h3>Cash flow overview</h3><p className="ac-panel-sub">Posted income versus posted expenses · voided entries excluded</p></div><Activity size={17} color="#64748b" /></div>
                  <div className="ac-mini-stats">
                    <div className="ac-mini-stat"><span>Opening-period view</span><strong>{money(totalIncome)}</strong><small>Total posted income</small></div>
                    <div className="ac-mini-stat"><span>Outflow</span><strong>{money(totalExpenses)}</strong><small>Total posted expenses</small></div>
                    <div className="ac-mini-stat"><span>Net movement</span><strong style={{ color: netBalance >= 0 ? "#059669" : "#e11d48" }}>{money(netBalance)}</strong><small>Income minus expenses</small></div>
                  </div>
                  <div className="ac-flow-list">
                    <div className="ac-flow-row"><span className="ac-flow-label">Income</span><div className="ac-flow-track"><div className="ac-flow-bar income" style={{ width: `${totalIncome + totalExpenses > 0 ? (totalIncome / (totalIncome + totalExpenses)) * 100 : 0}%` }} /></div><strong className="ac-flow-value">{money(totalIncome)}</strong></div>
                    <div className="ac-flow-row"><span className="ac-flow-label">Expenses</span><div className="ac-flow-track"><div className="ac-flow-bar expense" style={{ width: `${totalIncome + totalExpenses > 0 ? (totalExpenses / (totalIncome + totalExpenses)) * 100 : 0}%` }} /></div><strong className="ac-flow-value">{money(totalExpenses)}</strong></div>
                  </div>
                  <div className="ac-panel-head" style={{ marginTop: 24 }}><div><h3>Monthly cash flow</h3><p className="ac-panel-sub">Last six active months in the selected period</p></div></div>
                  {monthlyFlow.length ? <><div className="ac-monthly-chart">{monthlyFlow.map((item) => <div className="ac-month-column" key={item.month}><div className="ac-month-bars"><div title={`Income ${money(item.income)}`} className="ac-month-bar income" style={{ height: `${Math.max(item.income > 0 ? 3 : 0, (item.income / maxFlow) * 100)}%` }} /><div title={`Expense ${money(item.expense)}`} className="ac-month-bar expense" style={{ height: `${Math.max(item.expense > 0 ? 3 : 0, (item.expense / maxFlow) * 100)}%` }} /></div><span className="ac-month-label">{new Date(`${item.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}</span></div>)}</div><div className="ac-legend"><span><i className="ac-dot green" /> Income</span><span><i className="ac-dot rose" /> Expenses</span></div></> : <p className="ac-muted-line">Monthly chart ke liye selected period mein posted transactions chahiye.</p>}
                </div>

                <div className="ac-panel">
                  <div className="ac-panel-head"><div><h3>Quick actions</h3><p className="ac-panel-sub">Common finance workflows</p></div><ChevronDown size={16} color="#94a3b8" /></div>
                  <div className="ac-shortcuts">
                    <button type="button" className="ac-shortcut" onClick={() => startCreate("income")}><span className="ac-shortcut-icon green"><ArrowDownLeft size={17} /></span><span><strong>Add income</strong><small>Other income entry</small></span></button>
                    <button type="button" className="ac-shortcut" onClick={() => startCreate("expense")}><span className="ac-shortcut-icon orange"><ArrowUpRight size={17} /></span><span><strong>Add expense</strong><small>Salary, fuel, repair or other</small></span></button>
                    <button type="button" className="ac-shortcut" onClick={() => setTab("fees")}><span className="ac-shortcut-icon"><Wallet size={17} /></span><span><strong>Fee collections</strong><small>View student-fee ledger entries</small></span></button>
                    <button type="button" className="ac-shortcut" onClick={() => setTab("ledger")}><span className="ac-shortcut-icon purple"><Landmark size={17} /></span><span><strong>Full ledger</strong><small>Search and filter all transactions</small></span></button>
                    <button type="button" className="ac-shortcut" onClick={() => setTab("salary")}><span className="ac-shortcut-icon"><Banknote size={17} /></span><span><strong>Salary & payroll</strong><small>Review salary-category entries</small></span></button>
                    <button type="button" className="ac-shortcut" onClick={() => setTab("reports")}><span className="ac-shortcut-icon green"><FileSpreadsheet size={17} /></span><span><strong>Reports</strong><small>Category summary and export</small></span></button>
                  </div>
                  <div className="ac-panel-head" style={{ marginTop: 23 }}><div><h3>Ledger health</h3><p className="ac-panel-sub">Session accounting status</p></div></div>
                  <div className="ac-mini-stats">
                    <div className="ac-mini-stat"><span>All transactions</span><strong>{rangeTransactions.length}</strong></div>
                    <div className="ac-mini-stat"><span>Posted</span><strong>{postedTransactions.length}</strong></div>
                    <div className="ac-mini-stat"><span>Voided history</span><strong>{voidedCount}</strong></div>
                  </div>
                  <p className="ac-footer-note">Financial records are kept in the ledger. Voiding a manual entry preserves the original record for history; source-linked fee payments should be corrected through the fee-payment reversal workflow.</p>
                </div>

                <div className="ac-panel">
                  <div className="ac-panel-head"><div><h3>Income by category</h3><p className="ac-panel-sub">Posted income grouped by accounting category</p></div></div>
                  <CategoryBars rows={incomeByCategory} />
                </div>
                <div className="ac-panel">
                  <div className="ac-panel-head"><div><h3>Expenses by category</h3><p className="ac-panel-sub">Salary, driver salary, fuel, transport, maintenance and other</p></div></div>
                  <CategoryBars rows={expenseByCategory} />
                </div>

                <div className="ac-panel">
                  <div className="ac-panel-head"><div><h3>Students & fee recovery</h3><p className="ac-panel-sub">Active fee plans compared with posted payments</p></div><Wallet size={17} color="#64748b" /></div>
                  <div className="ac-mini-stats"><div className="ac-mini-stat"><span>Students with plans</span><strong>{studentFeeStatus.studentsWithPlans}</strong></div><div className="ac-mini-stat"><span>With pending fees</span><strong>{studentFeeStatus.withPending}</strong></div><div className="ac-mini-stat"><span>Fully paid</span><strong>{studentFeeStatus.fullyPaid}</strong></div></div>
                  <div className="ac-flow-row" style={{ gridTemplateColumns: "82px minmax(0,1fr) auto" }}><span className="ac-flow-label">Collection</span><div className="ac-flow-track"><div className="ac-flow-bar income" style={{ width: `${feeProgress}%` }} /></div><strong className="ac-flow-value">{feeProgress.toFixed(1)}%</strong></div>
                  {studentFeeStatus.topPending.length ? <div style={{ marginTop: 12 }}>{studentFeeStatus.topPending.map((item) => { const student = students.find((candidate) => String(candidate.id) === item.studentId); const name = student ? [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || student.name || `Student #${item.studentId}` : `Student #${item.studentId}`; return <div className="ac-mini-row" key={item.studentId} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid #eef2f7" }}><span><strong>{name}</strong><small>Planned {money(item.planned)} · Paid {money(item.paid)}</small></span><strong style={{ color: "#e11d48", whiteSpace: "nowrap" }}>{money(item.pending)}</strong></div>; })}</div> : <p className="ac-muted-line">No pending fee-plan balances found, or no active plans are available.</p>}
                </div>
                <div className="ac-panel">
                  <div className="ac-panel-head"><div><h3>Salary overview</h3><p className="ac-panel-sub">Salary categories from posted accounting entries</p></div><Banknote size={17} color="#64748b" /></div>
                  <div className="ac-mini-stats"><div className="ac-mini-stat"><span>Staff salary</span><strong>{money(postedTransactions.filter((row) => transactionType(row) === "expense" && /staff salary/i.test(row.category || "")).reduce((sum, row) => sum + transactionAmount(row), 0))}</strong></div><div className="ac-mini-stat"><span>Driver salary</span><strong>{money(postedTransactions.filter((row) => transactionType(row) === "expense" && /driver salary/i.test(row.category || "")).reduce((sum, row) => sum + transactionAmount(row), 0))}</strong></div><div className="ac-mini-stat"><span>Salary entries</span><strong>{postedTransactions.filter((row) => transactionType(row) === "expense" && /salary/i.test(row.category || "")).length}</strong></div></div>
                  <p className="ac-footer-note">Salary due/remaining requires payroll-period data. This view reports posted salary expense entries only; it does not guess unpaid payroll.</p>
                </div>
                <div className="ac-panel" style={{ gridColumn: "1 / -1" }}>
                  <div className="ac-panel-head"><div><h3>Recent transactions</h3><p className="ac-panel-sub">Latest financial activity in the selected period</p></div><button type="button" className="ac-text-btn" onClick={() => setTab("ledger")}>Open full ledger →</button></div>
                  {loading ? <div className="ac-loader"><span className="ac-spinner" /> Loading transactions...</div> : <div className="ac-table-scroll"><table className="ac-recent"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Source</th><th className="right">Amount</th><th>Status</th></tr></thead><tbody>{[...rangeTransactions].sort((a, b) => transactionDate(b).localeCompare(transactionDate(a))).slice(0, 7).map((row) => <tr key={row.id}><td className="nowrap">{dateLabel(transactionDate(row))}</td><td><span className={`ac-type ${transactionType(row) === "income" ? "income" : "expense"}`}>{transactionType(row)}</span></td><td><strong>{row.category}</strong></td><td>{row.description || "—"}</td><td>{transactionSource(row)}</td><td className={`right nowrap amount ${transactionType(row) === "income" ? "positive" : "negative"}`}>{money(transactionAmount(row))}</td><td>{transactionStatus(row) === "posted" ? "Posted" : "Voided"}</td></tr>)}</tbody></table></div>}
                </div>
              </div>
            )}

            {tab === "fees" && (
              <div className="ac-overview-grid">
                <div className="ac-panel" style={{ gridColumn: "1 / -1" }}>
                  {selectedFeeStudent ? (
                    <>
                      <div className="ac-panel-head" style={{ alignItems: "center" }}>
                        <div><button type="button" className="ac-text-btn" onClick={() => setSelectedStudentId(null)}>← All Student Accounts</button><h3 style={{ marginTop: 10 }}>{selectedFeeStudent.name}</h3><p className="ac-panel-sub">Admission No: {selectedFeeStudent.admissionNo} · Class: {selectedFeeStudent.className}</p></div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" className="ac-btn primary" onClick={() => { setFormError(""); setFeePaymentForm({ planId: selectedStudentPlans[0] ? String(selectedStudentPlans[0].id) : "", installmentId: "", amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMode: "cash", referenceNumber: "", remarks: "", idempotencyKey: createIdempotencyKey() }); setShowFeePaymentForm(true); }} disabled={!selectedStudentPlans.length}><Plus size={14} /> Add Fee Payment</button>
                          <button type="button" className="ac-btn" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} /> Refresh</button>
                        </div>
                      </div>
                      <div className="ac-kpis" style={{ padding: 0, marginBottom: 18 }}>
                        <Kpi label="Total Planned Fees" value={money(selectedFeeStudent.planned)} note={`${selectedStudentPlans.length} active fee plan(s)`} icon={Wallet} tone="blue" />
                        <Kpi label="Total Paid" value={money(selectedFeeStudent.paid)} note={`${selectedStudentPayments.length} payment(s)`} icon={CheckCircle2} tone="green" />
                        <Kpi label="Pending Balance" value={money(selectedFeeStudent.pending)} note={selectedFeeStudent.pending > 0 ? "Payment pending" : "No pending balance recorded"} icon={CalendarDays} tone={selectedFeeStudent.pending > 0 ? "rose" : "green"} />
                      </div>
                      <div className="ac-panel-head"><div><h3>Fee plan details</h3><p className="ac-panel-sub">Session fee plans linked to this student</p></div></div>
                      {selectedStudentPlans.length ? <div className="ac-table-scroll"><table className="ac-table ac-fee-plan-table"><thead><tr><th>Plan</th><th>Gross amount</th><th>Discount</th><th>Net amount</th><th>Status</th></tr></thead><tbody>{selectedStudentPlans.map((plan) => <tr key={plan.id}><td><strong>{plan.name || plan.plan_name || `Fee Plan #${plan.id}`}</strong><small>{plan.academic_session_name || "Selected academic session"}</small></td><td>{money(plan.gross_amount ?? (Number(plan.net_amount ?? plan.total_amount ?? plan.amount ?? 0) + Number(plan.discount_amount ?? plan.discount ?? 0)))}</td><td>{money(plan.discount_amount ?? plan.discount ?? 0)}</td><td><strong>{money(plan.net_amount ?? plan.total_amount ?? plan.amount ?? 0)}</strong></td><td><span className={`ac-status ${String(plan.status || "active").toLowerCase() === "active" ? "posted" : "voided"}`}>{plan.status || (plan.is_active === false ? "Inactive" : "Active")}</span></td></tr>)}</tbody></table></div> : <EmptyState title="No fee plan found" description="Is student ke selected academic session mein active fee plan nahi mila." />}
                      <div className="ac-panel-head" style={{ marginTop: 22 }}><div><h3>Installment-wise balance</h3><p className="ac-panel-sub">Linked payments ke basis par installment paid aur pending amount.</p></div></div>
                      {selectedInstallmentRows.length ? <div className="ac-table-scroll"><table className="ac-table ac-fee-installment-table"><thead><tr><th>Fee Plan</th><th>Installment</th><th>Due date</th><th className="right">Due amount</th><th className="right">Paid</th><th className="right">Pending</th><th>Status</th></tr></thead><tbody>{selectedInstallmentRows.map(({ plan, item, due, paid, pending }) => <tr key={`${plan.id}-${item.id}`}><td>{plan.name || plan.plan_name || `Fee Plan #${plan.id}`}</td><td>{item.name || `Installment ${item.installment_number || ""}`}</td><td>{item.due_date || "—"}</td><td className="right">{money(due)}</td><td className="right" style={{ color: "#059669" }}>{money(paid)}</td><td className="right" style={{ color: pending > 0 ? "#e11d48" : "#059669" }}>{money(pending)}</td><td><span className={`ac-status ${pending <= 0 ? "posted" : "voided"}`}>{pending <= 0 ? "Paid" : paid > 0 ? "Partial" : "Pending"}</span></td></tr>)}</tbody></table></div> : <EmptyState title="No installments found" description="Fee plans mein installment schedule available nahi hai. Overall pending balance upar dikh raha hai." />}
                      <div className="ac-panel-head" style={{ marginTop: 22 }}><div><h3>Payment history</h3><p className="ac-panel-sub">Recorded payments for this student. Receipt print karne ke liye Print button use karo.</p></div></div>
                      {selectedStudentPayments.length ? <div className="ac-table-scroll"><table className="ac-table ac-payment-history-table"><thead><tr><th>Date</th><th>Receipt</th><th>Payment mode</th><th>Reference</th><th className="right">Amount</th><th>Status</th><th>Receipt</th></tr></thead><tbody>{selectedStudentPayments.map((payment) => <tr key={payment.id}><td>{dateLabel(payment.payment_date || payment.date || payment.created_at)}</td><td>{payment.receipt_number || payment.receipt_no || payment.receipt_id || `#${payment.id}`}</td><td>{payment.payment_mode || payment.mode || "—"}</td><td>{payment.reference_number || payment.transaction_reference || "—"}</td><td className="right"><strong>{money(payment.amount ?? payment.paid_amount ?? 0)}</strong></td><td><span className={`ac-status ${String(payment.status || "posted").toLowerCase() === "posted" ? "posted" : "voided"}`}>{payment.status || "Posted"}</span></td><td><button type="button" className="ac-btn" onClick={() => printFeeReceipt(payment)}><FileDown size={13} /> Print</button></td></tr>)}</tbody></table></div> : <EmptyState title="No payments recorded" description="Abhi is student ke liye selected session mein payment record nahi mila." />}
                    </>
                  ) : (
                    <>
                      <div className="ac-panel-head"><div><h3>All Student Accounts</h3><p className="ac-panel-sub">Student select karo to uska complete fee dashboard, fee plans, paid amount, pending balance aur payment history khulega.</p></div><button type="button" className="ac-btn" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} /> Refresh</button></div>
                      <div className="ac-table-controls"><label className="ac-search"><Search size={15} /><input aria-label="Search students" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student name, admission number or class..." /></label><button type="button" className="ac-btn" onClick={() => setQuery("")}>Clear search</button></div>
                      <div className="ac-mini-stats"><div className="ac-mini-stat"><span>Students</span><strong>{feeStudentRows.length}</strong></div><div className="ac-mini-stat"><span>With pending fees</span><strong>{feeStudentRows.filter((row) => row.pending > 0).length}</strong></div><div className="ac-mini-stat"><span>Fully paid / no balance</span><strong>{feeStudentRows.filter((row) => row.planned > 0 && row.pending === 0).length}</strong></div></div>
                      {loading ? <div className="ac-loader"><span className="ac-spinner" /> Loading student accounts...</div> : studentsError ? <div className="ac-alert error">{studentsError}</div> : <div className="ac-table-scroll"><table className="ac-table ac-student-list-table"><thead><tr><th>Student</th><th>Admission No.</th><th>Class</th><th className="right">Total Fees</th><th className="right">Paid</th><th className="right">Pending</th><th>Status</th><th>Action</th></tr></thead><tbody>{feeStudentRows.filter((row) => !query.trim() || `${row.name} ${row.admissionNo} ${row.className}`.toLowerCase().includes(query.trim().toLowerCase())).map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small>Student ID: {row.id}</small></td><td>{row.admissionNo}</td><td>{row.className}</td><td className="right">{money(row.planned)}</td><td className="right" style={{ color: "#059669" }}>{money(row.paid)}</td><td className="right" style={{ color: row.pending > 0 ? "#e11d48" : "#059669" }}>{money(row.pending)}</td><td><span className={`ac-status ${row.planned > 0 && row.pending === 0 ? "posted" : row.pending > 0 ? "voided" : "posted"}`}>{row.planned > 0 && row.pending === 0 ? "Paid" : row.pending > 0 ? "Pending" : "No plan"}</span></td><td><button type="button" className="ac-btn primary" onClick={() => { setSelectedStudentId(row.id); setQuery(""); }}>Open account →</button></td></tr>)}</tbody></table></div>}
                    </>
                  )}
                </div>
              </div>
            )}

            {showTable && (
              <>
                <div className="ac-section-heading"><div><h2 style={{ margin: 0, fontSize: 18 }}>{tabHeading}</h2><p className="ac-panel-sub">Live accounting records · session-scoped · voided history is retained</p></div></div>
                <div className="ac-table-controls">
                  <label className="ac-search"><Search size={15} /><input aria-label="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search category, purpose, reference or source..." /></label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select className="ac-select" aria-label="Transaction type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
                    <select className="ac-select" aria-label="Source module" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">All sources</option><option value="manual">Manual</option><option value="fee_payment">Fee payments</option><option value="staff_payment">Salary payments</option><option value="transport_expense">Fuel / transport</option><option value="maintenance_expense">Maintenance</option></select>
                    <button type="button" className="ac-btn" onClick={() => { setQuery(""); setTypeFilter("all"); setSourceFilter("all"); }}><Filter size={14} /> Clear filters</button>
                  </div>
                </div>
                {loading ? <div className="ac-loader"><span className="ac-spinner" /> Loading transactions...</div> : <Table rows={visibleTransactions} onVoid={(row) => { setVoidTarget(row); setVoidReason(""); }} />}
                <div className="ac-footer-note">Showing {visibleTransactions.length} records from {rangeTransactions.length} in the selected date range. System-generated entries must be corrected in their source module; only manual entries can be voided here.</div>
              </>
            )}

            {tab === "reports" && (
              <div className="ac-overview-grid">
                <div className="ac-panel">
                  <div className="ac-panel-head"><div><h3>Income category report</h3><p className="ac-panel-sub">Posted entries only · selected period</p></div><button className="ac-text-btn" type="button" onClick={() => downloadCsv(`income_by_category_${toIsoDate(new Date())}.csv`, [["Category", "Total"], ...incomeByCategory.map((row) => [row.label, row.amount])])}><Download size={13} /> Export</button></div>
                  <CategoryBars rows={incomeByCategory} />
                  <p className="ac-muted-line">Total income: <strong>{money(totalIncome)}</strong></p>
                </div>
                <div className="ac-panel">
                  <div className="ac-panel-head"><div><h3>Expense category report</h3><p className="ac-panel-sub">Staff salary, driver salary, fuel, maintenance and other</p></div><button className="ac-text-btn" type="button" onClick={() => downloadCsv(`expenses_by_category_${toIsoDate(new Date())}.csv`, [["Category", "Total"], ...expenseByCategory.map((row) => [row.label, row.amount])])}><Download size={13} /> Export</button></div>
                  <CategoryBars rows={expenseByCategory} />
                  <p className="ac-muted-line">Total expenses: <strong>{money(totalExpenses)}</strong></p>
                </div>
                <div className="ac-panel" style={{ gridColumn: "1 / -1" }}>
                  <div className="ac-panel-head"><div><h3>Accounting statement</h3><p className="ac-panel-sub">Session/date-filtered summary; reversed/voided transactions are excluded from totals</p></div><button type="button" className="ac-btn" onClick={() => exportRows(rangeTransactions)}><Download size={14} /> Export detailed report</button></div>
                  <div className="ac-mini-stats"><div className="ac-mini-stat"><span>Income</span><strong>{money(totalIncome)}</strong></div><div className="ac-mini-stat"><span>Expenses</span><strong>{money(totalExpenses)}</strong></div><div className="ac-mini-stat"><span>Net movement</span><strong style={{ color: netBalance >= 0 ? "#059669" : "#e11d48" }}>{money(netBalance)}</strong></div></div>
                </div>
              </div>
            )}
          </div>
        </section>


        {showFeePaymentForm && selectedFeeStudent && (
          <div className="ac-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowFeePaymentForm(false); }}>
            <section className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-fee-payment-title">
              <div className="ac-modal-head"><div><div className="ac-kicker">Student Fees · {selectedFeeStudent.name}</div><h2 id="ac-fee-payment-title">Record Fee Payment</h2><p>Payment official fee-payment endpoint se save hoga. Accounting income entry backend create karega; duplicate manual income nahi banegi.</p></div><button type="button" className="ac-close" onClick={() => setShowFeePaymentForm(false)} aria-label="Close" disabled={saving}><X size={17} /></button></div>
              <form onSubmit={saveStudentFeePayment}>
                <div className="ac-form">
                  <label className="ac-field full">Fee plan<select required value={feePaymentForm.planId} onChange={(event) => setFeePaymentForm((old) => ({ ...old, planId: event.target.value, installmentId: "" }))}><option value="">Select fee plan</option>{selectedStudentPlans.map((plan) => <option key={plan.id} value={String(plan.id)}>{plan.name || plan.plan_name || `Fee Plan #${plan.id}`} · {money(plan.net_amount ?? plan.total_amount ?? plan.amount ?? 0)}</option>)}</select></label>
                  <label className="ac-field">Installment (optional)<select value={feePaymentForm.installmentId} onChange={(event) => setFeePaymentForm((old) => ({ ...old, installmentId: event.target.value }))}><option value="">No specific installment</option>{(selectedStudentPlans.find((plan) => String(plan.id) === String(feePaymentForm.planId))?.installments || []).filter((item) => item.is_active !== false).map((item) => { const due = Number(item.amount || 0); const paid = selectedStudentPayments.filter((payment) => String(payment.installment_id ?? "") === String(item.id) && String(payment.status || "posted").toLowerCase() === "posted").reduce((sum, payment) => sum + Number(payment.amount ?? payment.paid_amount ?? 0), 0); const pending = Math.max(0, due - paid); return <option key={item.id} value={String(item.id)} disabled={pending <= 0}>{item.name || `Installment ${item.installment_number}`} · Pending {money(pending)} · {item.due_date || "No due date"}</option>; })}</select></label>
                  <label className="ac-field">Payment date<input type="date" required value={feePaymentForm.paymentDate} onChange={(event) => setFeePaymentForm((old) => ({ ...old, paymentDate: event.target.value }))} /></label>
                  <label className="ac-field">Amount received (₹)<input type="number" required min="0.01" step="0.01" value={feePaymentForm.amount} onChange={(event) => setFeePaymentForm((old) => ({ ...old, amount: event.target.value }))} placeholder="0.00" /></label>
                  <label className="ac-field">Payment mode<select value={feePaymentForm.paymentMode} onChange={(event) => setFeePaymentForm((old) => ({ ...old, paymentMode: event.target.value }))}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="other">Other</option></select></label>
                  <label className="ac-field">Reference / UTR<input value={feePaymentForm.referenceNumber} onChange={(event) => setFeePaymentForm((old) => ({ ...old, referenceNumber: event.target.value }))} placeholder="Optional transaction reference" /></label>
                  <label className="ac-field full">Remarks (optional)<textarea rows="2" value={feePaymentForm.remarks} onChange={(event) => setFeePaymentForm((old) => ({ ...old, remarks: event.target.value }))} placeholder="Payment notes" /></label>
                  {formError && <div className="ac-form-error">{formError}</div>}
                </div>
                <div className="ac-modal-foot"><button type="button" className="ac-btn" onClick={() => setShowFeePaymentForm(false)} disabled={saving}>Cancel</button><button type="submit" className="ac-btn primary" disabled={saving || !selectedStudentPlans.length}>{saving ? "Saving payment..." : "Save fee payment"}</button></div>
              </form>
            </section>
          </div>
        )}

        {showForm && (
          <div className="ac-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowForm(false); }}>
            <section className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-form-title">
              <div className="ac-modal-head"><div><div className="ac-kicker">Accounts Ledger</div><h2 id="ac-form-title">Add {form.transaction_type === "income" ? "Income" : "Expense"}</h2><p>Yeh entry central accounting ledger mein save hogi; fee receipts is form se manually create mat karo.</p></div><button type="button" className="ac-close" onClick={() => setShowForm(false)} aria-label="Close" disabled={saving}><X size={17} /></button></div>
              <form onSubmit={saveTransaction}>
                <div className="ac-form">
                  <label className="ac-field">Transaction type<select value={form.transaction_type} onChange={(event) => { const next = event.target.value; setForm((old) => ({ ...old, transaction_type: next, category: next === "income" ? "Other Income" : "Other" })); }}><option value="income">Income</option><option value="expense">Expense</option></select></label>
                  <label className="ac-field">Date<input type="date" required value={form.transaction_date} onChange={(event) => setForm((old) => ({ ...old, transaction_date: event.target.value }))} /></label>
                  <label className="ac-field">Category<select required value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))}>{(form.transaction_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                  <label className="ac-field">Amount (₹)<input type="number" required min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((old) => ({ ...old, amount: event.target.value }))} placeholder="0.00" /></label>
                  <label className="ac-field">Payment mode<select value={form.payment_mode} onChange={(event) => setForm((old) => ({ ...old, payment_mode: event.target.value }))}>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
                  <label className="ac-field">Reference number<input value={form.reference_number} onChange={(event) => setForm((old) => ({ ...old, reference_number: event.target.value }))} placeholder="Voucher / bill / UTR (optional)" /></label>
                  <label className="ac-field full">Description / purpose<input required value={form.description} onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))} placeholder="E.g. classroom repair, event contribution" /></label>
                  {formError && <div className="ac-form-error">{formError}</div>}
                </div>
                <div className="ac-modal-foot"><button type="button" className="ac-btn" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button><button type="submit" className="ac-btn primary" disabled={saving}>{saving ? "Saving..." : "Save transaction"}</button></div>
              </form>
            </section>
          </div>
        )}

        {voidTarget && (
          <div className="ac-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setVoidTarget(null); }}>
            <section className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-void-title">
              <div className="ac-modal-head"><div><div className="ac-kicker">Audit-safe correction</div><h2 id="ac-void-title">Void manual transaction</h2><p>Original transaction delete nahi hogi. Reason audit/history ke liye record hoga.</p></div><button type="button" className="ac-close" onClick={() => setVoidTarget(null)} aria-label="Close" disabled={saving}><X size={17} /></button></div>
              <div className="ac-form"><div className="ac-mini-stat" style={{ gridColumn: "1 / -1" }}><span>{dateLabel(transactionDate(voidTarget))} · {voidTarget.category}</span><strong>{money(transactionAmount(voidTarget))}</strong><small>{voidTarget.description || "No description"}</small></div><label className="ac-field full">Reason for voiding<textarea rows="3" minLength="5" required value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Explain why this entry is being voided..." /></label></div>
              <div className="ac-modal-foot"><button type="button" className="ac-btn" onClick={() => setVoidTarget(null)} disabled={saving}>Cancel</button><button type="button" className="ac-btn primary" onClick={() => voidTransaction()} disabled={saving || voidReason.trim().length < 5}>{saving ? "Processing..." : "Confirm void"}</button></div>
            </section>
          </div>
        )}

        {importPreview && (
          <div className="ac-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !importing) setImportPreview(null); }}>
            <section className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-import-title">
              <div className="ac-modal-head"><div><div className="ac-kicker">Upload · Preview · Validate · Import</div><h2 id="ac-import-title">Review CSV import</h2><p>{importPreview.name} · {importPreview.rows.length} rows. Data save karne se pehle valid/invalid rows review karo.</p></div><button type="button" className="ac-close" onClick={() => setImportPreview(null)} disabled={importing} aria-label="Close"><X size={17} /></button></div>
              <div className="ac-content" style={{ padding: 16 }}>
                <div className="ac-mini-stats"><div className="ac-mini-stat"><span>Total rows</span><strong>{importPreview.rows.length}</strong></div><div className="ac-mini-stat"><span>Valid rows</span><strong>{importPreview.rows.filter((item) => !item.errors.length).length}</strong></div><div className="ac-mini-stat"><span>Rows with errors</span><strong style={{ color: importPreview.rows.some((item) => item.errors.length) ? "#e11d48" : "#059669" }}>{importPreview.rows.filter((item) => item.errors.length).length}</strong></div></div>
                <div className="ac-table-scroll"><table className="ac-recent"><thead><tr><th>CSV row</th><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Validation</th></tr></thead><tbody>{importPreview.rows.slice(0, 50).map((item) => <tr key={item.line}><td>{item.line}</td><td>{item.row.transaction_date || "—"}</td><td>{item.row.transaction_type || "—"}</td><td>{item.row.category || "—"}</td><td>{Number.isFinite(item.row.amount) ? money(item.row.amount) : item.row.amount || "—"}</td><td>{item.errors.length ? <span style={{ color: "#b91c1c" }}>{item.errors.join("; ")}</span> : <span style={{ color: "#047857" }}>Valid</span>}</td></tr>)}</tbody></table></div>
                {importPreview.rows.length > 50 && <p className="ac-muted-line">Preview mein pehli 50 rows dikhayi gayi hain; validation total {importPreview.rows.length} rows par hua hai.</p>}
              </div>
              <div className="ac-modal-foot"><button type="button" className="ac-btn" onClick={() => setImportPreview(null)} disabled={importing}>Cancel</button><button type="button" className="ac-btn primary" onClick={() => void confirmCsvImport()} disabled={importing || !importPreview.rows.some((item) => !item.errors.length)}>{importing ? "Importing..." : `Import ${importPreview.rows.filter((item) => !item.errors.length).length} valid rows`}</button></div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CategoryBars({ rows }) {
  if (!rows.length) return <p className="ac-muted-line">Selected period mein category data available nahi hai.</p>;
  const max = Math.max(1, ...rows.map((row) => row.amount));
  return <div className="ac-bars">{rows.slice(0, 8).map((row) => <div className="ac-bar-row" key={row.label}><span className="ac-bar-label">{row.label}</span><div className="ac-bar-track"><div className="ac-bar-fill" style={{ width: `${Math.max(2, (row.amount / max) * 100)}%` }} /></div><span className="ac-bar-value">{money(row.amount)}</span></div>)}</div>;
}
