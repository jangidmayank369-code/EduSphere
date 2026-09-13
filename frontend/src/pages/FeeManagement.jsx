import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

import { listFeeStructures } from "../api/feeStructures";
import {
  listStudentFeePlans,
  getStudentFeePlan,
} from "../api/studentFeePlans";

import "../fee-management.css";

const SCHOOL_ID = 1;
const SESSION_ID = 1;

const TEXT = {
  en: {
    kicker: "FINANCE · SCHOOL CORE",
    title: "Fee Management",
    subtitle:
      "Manage fee structures, student fee plans, collections and recovery from one workspace.",
    overview: "Overview",
    structures: "Fee Structures",
    plans: "Student Fee Plans",
    payments: "Payments",
    receipts: "Receipts",
    recovery: "Recovery",
    totalStructures: "Total Structures",
    activeStructures: "Active Structures",
    totalPlans: "Student Fee Plans",
    pendingRecovery: "Recovery",
    search: "Search fee structures or student plans...",
    refresh: "Refresh",
    createStructure: "Create Structure",
    createPlan: "Create Student Plan",
    active: "Active",
    inactive: "Inactive",
    noStructures: "No fee structures found.",
    noPlans: "No student fee plans found.",
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
    comingSoon:
      "This section will be connected to its backend workflow.",
    configuration: "Configuration",
    studentBilling: "Student Billing",
  },

  hi: {
    kicker: "वित्त · स्कूल कोर",
    title: "फीस प्रबंधन",
    subtitle:
      "फीस स्ट्रक्चर, स्टूडेंट फीस प्लान, कलेक्शन और रिकवरी एक ही वर्कस्पेस से मैनेज करें।",
    overview: "ओवरव्यू",
    structures: "फीस स्ट्रक्चर",
    plans: "स्टूडेंट फीस प्लान",
    payments: "पेमेंट्स",
    receipts: "रसीदें",
    recovery: "रिकवरी",
    totalStructures: "कुल स्ट्रक्चर",
    activeStructures: "सक्रिय स्ट्रक्चर",
    totalPlans: "स्टूडेंट फीस प्लान",
    pendingRecovery: "रिकवरी",
    search: "फीस स्ट्रक्चर या स्टूडेंट प्लान खोजें...",
    refresh: "रीफ्रेश",
    createStructure: "स्ट्रक्चर बनाएं",
    createPlan: "स्टूडेंट प्लान बनाएं",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    noStructures: "कोई फीस स्ट्रक्चर नहीं मिला।",
    noPlans: "कोई स्टूडेंट फीस प्लान नहीं मिला।",
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
    comingSoon:
      "यह सेक्शन अपने बैकएंड वर्कफ्लो से कनेक्ट किया जाएगा।",
    configuration: "कॉन्फिगरेशन",
    studentBilling: "स्टूडेंट बिलिंग",
  },
};

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatFrequency(value) {
  if (!value) return "—";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getListData(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function getStudentName(plan) {
  if (plan?.student_name) {
    return plan.student_name;
  }

  if (plan?.student) {
    const parts = [
      plan.student.first_name,
      plan.student.middle_name,
      plan.student.last_name,
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" ");
    }
  }

  if (plan?.student_id) {
    return `Student #${plan.student_id}`;
  }

  return "—";
}

function getPlanStatus(plan) {
  if (plan?.status) {
    return String(plan.status).toLowerCase();
  }

  if (plan?.is_active === false) {
    return "inactive";
  }

  return "active";
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

function ModuleCard({
  icon: Icon,
  title,
  description,
  active,
  onClick,
}) {
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

  const [language, setLanguage] = useState(
    () => localStorage.getItem("edusphere-language") || "en"
  );

  const [activeTab, setActiveTab] = useState("overview");

  const [structures, setStructures] = useState([]);
  const [plans, setPlans] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const t = TEXT[language] || TEXT.en;

  /* =========================================================
     LANGUAGE
  ========================================================= */

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const nextLanguage =
        event?.detail?.language ||
        localStorage.getItem("edusphere-language") ||
        "en";

      setLanguage(nextLanguage === "hi" ? "hi" : "en");
    };

    window.addEventListener(
      "edusphere-language-change",
      handleLanguageChange
    );

    return () => {
      window.removeEventListener(
        "edusphere-language-change",
        handleLanguageChange
      );
    };
  }, []);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  async function loadData(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [structureResponse, planResponse] =
        await Promise.all([
          listFeeStructures({
            school_id: SCHOOL_ID,
            academic_session_id: SESSION_ID,
          }),

          listStudentFeePlans({
            school_id: SCHOOL_ID,
            academic_session_id: SESSION_ID,
          }),
        ]);

      setStructures(getListData(structureResponse));
      setPlans(getListData(planResponse));
    } catch (err) {
      console.error(
        "Fee Management load failed:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t.failed
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     FILTERS
  ========================================================= */

  const activeStructureCount = useMemo(
    () =>
      structures.filter(
        (item) => item?.is_active !== false
      ).length,
    [structures]
  );

  const filteredStructures = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return structures;
    }

    return structures.filter((item) => {
      const searchable = [
        item?.name,
        item?.fee_head,
        item?.class_name,
        item?.frequency,
        item?.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [structures, search]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return plans;
    }

    return plans.filter((item) => {
      const searchable = [
        getStudentName(item),
        item?.name,
        item?.status,
        item?.installment_mode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [plans, search]);

  /* =========================================================
     NAVIGATION
  ========================================================= */

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
        navigate(
          `/students?student=${detail.student_id}`
        );
        return;
      }

      setActiveTab("plans");
    } catch (err) {
      console.error(
        "Unable to open fee plan:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to open fee plan."
      );
    }
  }

  /* =========================================================
     STRUCTURES
  ========================================================= */

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
                      <strong>
                        {item.name || "—"}
                      </strong>

                      {item.description && (
                        <small>
                          {item.description}
                        </small>
                      )}
                    </td>

                    <td>{item.fee_head || "—"}</td>

                    <td>
                      {item.class_name ||
                        "All Classes"}
                    </td>

                    <td>
                      {formatFrequency(
                        item.frequency
                      )}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          item.amount
                        )}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`fee-status ${
                          item.is_active === false
                            ? "inactive"
                            : ""
                        }`}
                      >
                        {item.is_active === false
                          ? t.inactive
                          : t.active}
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

  /* =========================================================
     STUDENT FEE PLANS
  ========================================================= */

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
              const status = getPlanStatus(plan);

              return (
                <button
                  type="button"
                  className="fee-plan-card"
                  key={plan.id}
                  onClick={() =>
                    handleOpenPlan(plan.id)
                  }
                >
                  <div className="fee-plan-top">
                    <div className="fee-plan-avatar">
                      {getStudentName(plan)
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <span
                      className={`fee-status ${
                        status !== "active"
                          ? "inactive"
                          : ""
                      }`}
                    >
                      {status === "active"
                        ? t.active
                        : t.inactive}
                    </span>
                  </div>

                  <div className="fee-plan-name">
                    <strong>
                      {getStudentName(plan)}
                    </strong>

                    <small>
                      {plan.name ||
                        `Plan #${plan.id}`}
                    </small>
                  </div>

                  <div className="fee-plan-values">
                    <div>
                      <span>{t.gross}</span>
                      <strong>
                        {formatCurrency(
                          plan.gross_amount
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>{t.net}</span>
                      <strong>
                        {formatCurrency(
                          plan.net_amount
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="fee-plan-bottom">
                    <span>
                      {formatFrequency(
                        plan.installment_mode
                      )}
                    </span>

                    <span>
                      {plan.installment_count || 1}{" "}
                      {t.installments}
                    </span>

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

  /* =========================================================
     FUTURE WORKSPACES
  ========================================================= */

  function renderComingSoon(title, Icon = CreditCard) {
    return (
      <section className="fee-coming-section">
        <div className="fee-coming-icon">
          <Icon size={24} />
        </div>

        <span>{t.workspace}</span>

        <h2>{title}</h2>

        <p>{t.comingSoon}</p>
      </section>
    );
  }

  /* =========================================================
     OVERVIEW
  ========================================================= */

  function renderOverview() {
    return (
      <>
        <section className="fee-module-grid">
          <ModuleCard
            icon={Layers3}
            title={t.structures}
            description="Configure fee heads, frequencies, amounts and class applicability."
            active={structures.length > 0}
            onClick={openStructures}
          />

          <ModuleCard
            icon={ClipboardList}
            title={t.plans}
            description="Assign student-wise fee plans with discounts and installments."
            active={plans.length > 0}
            onClick={openStudentPlans}
          />

          <ModuleCard
            icon={CreditCard}
            title={t.payments}
            description="Record and track student fee collections."
            onClick={() =>
              setActiveTab("payments")
            }
          />

          <ModuleCard
            icon={ReceiptText}
            title={t.receipts}
            description="Generate and manage payment receipts."
            onClick={() =>
              setActiveTab("receipts")
            }
          />

          <ModuleCard
            icon={AlertCircle}
            title={t.recovery}
            description="Track outstanding dues and recovery workflows."
            onClick={() =>
              setActiveTab("recovery")
            }
          />
        </section>

        <div className="fee-overview-columns">
          <section className="fee-data-section">
            <div className="fee-section-heading">
              <div>
                <span>{t.configuration}</span>
                <h2>{t.structures}</h2>
              </div>

              <button
                type="button"
                className="fee-text-btn"
                onClick={openStructures}
              >
                {t.view}
                <ArrowRight size={13} />
              </button>
            </div>

            {structures.length === 0 ? (
              <div className="fee-mini-empty">
                {t.noStructures}
              </div>
            ) : (
              <div className="fee-mini-list">
                {structures
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      className="fee-mini-row"
                      key={item.id}
                    >
                      <div>
                        <strong>
                          {item.name || "—"}
                        </strong>

                        <small>
                          {item.fee_head || "—"} ·{" "}
                          {formatFrequency(
                            item.frequency
                          )}
                        </small>
                      </div>

                      <strong>
                        {formatCurrency(
                          item.amount
                        )}
                      </strong>
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

              <button
                type="button"
                className="fee-text-btn"
                onClick={openStudentPlans}
              >
                {t.view}
                <ArrowRight size={13} />
              </button>
            </div>

            {plans.length === 0 ? (
              <div className="fee-mini-empty">
                {t.noPlans}
              </div>
            ) : (
              <div className="fee-mini-list">
                {plans
                  .slice(0, 5)
                  .map((plan) => (
                    <button
                      type="button"
                      className="fee-mini-row clickable"
                      key={plan.id}
                      onClick={() =>
                        handleOpenPlan(plan.id)
                      }
                    >
                      <div>
                        <strong>
                          {getStudentName(plan)}
                        </strong>

                        <small>
                          {plan.name ||
                            `Plan #${plan.id}`}
                        </small>
                      </div>

                      <strong>
                        {formatCurrency(
                          plan.net_amount
                        )}
                      </strong>
                    </button>
                  ))}
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  /* =========================================================
     CONTENT
  ========================================================= */

  function renderContent() {
    switch (activeTab) {
      case "structures":
        return renderStructures();

      case "plans":
        return renderPlans();

      case "payments":
        return renderComingSoon(
          t.payments,
          CreditCard
        );

      case "receipts":
        return renderComingSoon(
          t.receipts,
          ReceiptText
        );

      case "recovery":
        return renderComingSoon(
          t.recovery,
          AlertCircle
        );

      default:
        return renderOverview();
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="fee-page">
      <header className="fee-page-header">
        <div>
          <div className="fee-kicker">
            {t.kicker}
          </div>

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
          <RefreshCw
            size={15}
            className={
              refreshing ? "fee-spin" : ""
            }
          />

          <span>{t.refresh}</span>
        </button>
      </header>

      {error && (
        <div className="fee-alert">
          <AlertCircle size={15} />
          <span>{error}</span>
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
          icon={AlertCircle}
          label={t.pendingRecovery}
          value="—"
          note="Backend recovery workflow"
        />
      </section>

      <section className="fee-workspace">
        <div className="fee-workspace-head">
          <div className="fee-tabs">
            <button
              type="button"
              className={
                activeTab === "overview"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setActiveTab("overview");
                setSearch("");
              }}
            >
              {t.overview}
            </button>

            <button
              type="button"
              className={
                activeTab === "structures"
                  ? "active"
                  : ""
              }
              onClick={openStructures}
            >
              {t.structures}
            </button>

            <button
              type="button"
              className={
                activeTab === "plans"
                  ? "active"
                  : ""
              }
              onClick={openStudentPlans}
            >
              {t.plans}
            </button>

            <button
              type="button"
              className={
                activeTab === "payments"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("payments")
              }
            >
              {t.payments}
            </button>

            <button
              type="button"
              className={
                activeTab === "receipts"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("receipts")
              }
            >
              {t.receipts}
            </button>

            <button
              type="button"
              className={
                activeTab === "recovery"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("recovery")
              }
            >
              {t.recovery}
            </button>
          </div>

          <label className="fee-search">
            <Search size={14} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={t.search}
            />
          </label>
        </div>

        {loading ? (
          <div className="fee-loading">
            <div className="fee-loader" />
            <span>{t.loading}</span>
          </div>
        ) : (
          <div className="fee-workspace-content">
            {renderContent()}
          </div>
        )}
      </section>
    </div>
  );
}