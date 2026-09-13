import { useEffect, useMemo, useState } from "react";

import AppShell from "../components/AppShell";
import {
  bulkCreateStudentFeePlans,
  createStudentFeePlan,
  getStudentFeePlan,
  listStudentFeePlans,
  recalculateStudentFeePlan,
  updateStudentFeePlan,
  updateStudentFeePlanStatus,
} from "../api/studentFeePlans";
import { listStudents } from "../api/students";
import { listFeeStructures } from "../api/feeStructures";

const SCHOOL_ID = 1;
const SESSION_ID = 1;

const emptyForm = {
  student_id: "",
  name: "2026-27 Annual Fee Plan",
  effective_from: "2026-04-01",
  effective_to: "2027-03-31",
  discount_type: "fixed",
  discount_value: 0,
  scholarship_name: "",
  concession_reason: "",
  notes: "",
  installment_mode: "single",
  installment_count: 1,
  items: [],
};

function rowsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateText(value) {
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

function studentName(student) {
  return [
    student?.first_name,
    student?.middle_name,
    student?.last_name,
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeStudents(response) {
  return rowsOf(response).map((student) => ({
    ...student,
    displayName:
      studentName(student) ||
      student?.name ||
      `Student #${student?.id}`,
  }));
}

function normalizeFeeStructures(response) {
  return rowsOf(response);
}

function calculatePreview(form, feeStructures) {
  let gross = 0;
  let itemDiscount = 0;

  for (const item of form.items) {
    if (!item.is_selected) continue;

    const structure = feeStructures.find(
      (fee) => Number(fee.id) === Number(item.fee_structure_id),
    );

    if (!structure) continue;

    const amount = Number(
      item.custom_amount ?? structure.amount ?? 0,
    );

    gross += amount;

    const discountType = item.item_discount_type || "fixed";
    const discountValue = Number(item.item_discount_value || 0);

    if (discountType === "percentage") {
      itemDiscount += Math.min(
        amount,
        (amount * discountValue) / 100,
      );
    } else {
      itemDiscount += Math.min(amount, discountValue);
    }
  }

  const afterItems = Math.max(0, gross - itemDiscount);

  const planDiscountType = form.discount_type || "fixed";
  const planDiscountValue = Number(form.discount_value || 0);

  let planDiscount = 0;

  if (planDiscountType === "percentage") {
    planDiscount = Math.min(
      afterItems,
      (afterItems * planDiscountValue) / 100,
    );
  } else {
    planDiscount = Math.min(afterItems, planDiscountValue);
  }

  const net = Math.max(0, afterItems - planDiscount);

  return {
    gross,
    itemDiscount,
    planDiscount,
    net,
  };
}

function buildCreatePayload(form) {
  return {
    school_id: SCHOOL_ID,
    student_id: Number(form.student_id),
    academic_session_id: SESSION_ID,
    name: form.name.trim(),
    effective_from: form.effective_from,
    effective_to: form.effective_to || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value || 0),
    scholarship_name: form.scholarship_name.trim() || null,
    concession_reason: form.concession_reason.trim() || null,
    notes: form.notes.trim() || null,
    installment_mode: form.installment_mode,
    installment_count:
      form.installment_mode === "single"
        ? 1
        : Number(form.installment_count || 1),
    items: form.items
      .filter((item) => item.is_selected)
      .map((item) => ({
        fee_structure_id: Number(item.fee_structure_id),
        custom_amount:
          item.custom_amount === "" ||
          item.custom_amount === null
            ? null
            : Number(item.custom_amount),
        item_discount_type: item.item_discount_type,
        item_discount_value: Number(
          item.item_discount_value || 0,
        ),
        is_selected: true,
        notes: item.notes?.trim() || null,
      })),
  };
}

function buildUpdatePayload(form) {
  return {
    name: form.name.trim(),
    effective_from: form.effective_from,
    effective_to: form.effective_to || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value || 0),
    scholarship_name: form.scholarship_name.trim() || null,
    concession_reason:
      form.concession_reason.trim() || null,
    notes: form.notes.trim() || null,
    installment_mode: form.installment_mode,
    installment_count:
      form.installment_mode === "single"
        ? 1
        : Number(form.installment_count || 1),
    items: form.items
      .filter((item) => item.is_selected)
      .map((item) => ({
        fee_structure_id: Number(item.fee_structure_id),
        custom_amount:
          item.custom_amount === "" ||
          item.custom_amount === null
            ? null
            : Number(item.custom_amount),
        item_discount_type: item.item_discount_type,
        item_discount_value: Number(
          item.item_discount_value || 0,
        ),
        is_selected: true,
        notes: item.notes?.trim() || null,
      })),
  };
}

export default function StudentFeePlans() {
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const preview = useMemo(
    () => calculatePreview(form, feeStructures),
    [form, feeStructures],
  );

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && plan.is_active) ||
        (statusFilter === "inactive" && !plan.is_active);

      if (!matchesStatus) return false;

      if (!query) return true;

      const student = students.find(
        (item) => Number(item.id) === Number(plan.student_id),
      );

      const text = [
        plan.name,
        plan.student_id,
        plan.status,
        student?.displayName,
        student?.admission_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [plans, students, search, statusFilter]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [plansResponse, studentsResponse, feeResponse] =
        await Promise.all([
          listStudentFeePlans({
            school_id: SCHOOL_ID,
            academic_session_id: SESSION_ID,
          }),
          listStudents({
            school_id: SCHOOL_ID,
            academic_session_id: SESSION_ID,
          }),
          listFeeStructures({
            school_id: SCHOOL_ID,
            academic_session_id: SESSION_ID,
            is_active: true,
          }),
        ]);

      setPlans(rowsOf(plansResponse));
      setStudents(normalizeStudents(studentsResponse));
      setFeeStructures(normalizeFeeStructures(feeResponse));
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Data load nahi ho paaya.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setForm({
      ...emptyForm,
      items: feeStructures.map((fee) => ({
        fee_structure_id: fee.id,
        custom_amount: "",
        item_discount_type: "fixed",
        item_discount_value: 0,
        is_selected: !fee.is_optional,
        notes: "",
      })),
    });

    setEditingPlanId(null);
  }

  function openCreate() {
    setMessage("");
    setError("");
    resetForm();
    setShowForm(true);
  }

  async function openEdit(planId) {
    setMessage("");
    setError("");

    try {
      const plan = await getStudentFeePlan(planId);

      const items = rowsOf(plan?.items).map((item) => ({
        fee_structure_id: item.fee_structure_id,
        custom_amount:
          item.custom_amount === null ||
          item.custom_amount === undefined
            ? ""
            : item.custom_amount,
        item_discount_type:
          item.item_discount_type || "fixed",
        item_discount_value:
          item.item_discount_value || 0,
        is_selected: item.is_selected !== false,
        notes: item.notes || "",
      }));

      setForm({
        student_id: String(plan.student_id),
        name: plan.name || "",
        effective_from: plan.effective_from || "",
        effective_to: plan.effective_to || "",
        discount_type: plan.discount_type || "fixed",
        discount_value: plan.discount_value || 0,
        scholarship_name: plan.scholarship_name || "",
        concession_reason: plan.concession_reason || "",
        notes: plan.notes || "",
        installment_mode:
          plan.installment_mode || "single",
        installment_count:
          plan.installment_count || 1,
        items,
      });

      setEditingPlanId(plan.id);
      setShowForm(true);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Fee plan load nahi ho paaya.",
      );
    }
  }

  async function openDetail(planId) {
    setMessage("");
    setError("");

    try {
      const plan = await getStudentFeePlan(planId);
      setSelectedPlan(plan);
      setShowDetail(true);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Detail load nahi ho paayi.",
      );
    }
  }

  function updateFormField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleFee(feeId) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        Number(item.fee_structure_id) === Number(feeId)
          ? {
              ...item,
              is_selected: !item.is_selected,
            }
          : item,
      ),
    }));
  }

  function updateFeeItem(feeId, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        Number(item.fee_structure_id) === Number(feeId)
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  }

  async function saveForm(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.student_id) {
      setError("Student select karna zaroori hai.");
      return;
    }

    if (!form.name.trim()) {
      setError("Fee plan name required hai.");
      return;
    }

    if (!form.items.some((item) => item.is_selected)) {
      setError("Kam se kam ek fee head select karo.");
      return;
    }

    if (
      form.installment_mode !== "single" &&
      Number(form.installment_count) < 2
    ) {
      setError("Installment count kam se kam 2 hona chahiye.");
      return;
    }

    setSaving(true);

    try {
      if (editingPlanId) {
        await updateStudentFeePlan(
          editingPlanId,
          buildUpdatePayload(form),
        );

        setMessage("Fee plan successfully update ho gaya.");
      } else {
        await createStudentFeePlan(buildCreatePayload(form));

        setMessage("Fee plan successfully create ho gaya.");
      }

      setShowForm(false);
      setEditingPlanId(null);
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Fee plan save nahi ho paaya.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(plan) {
    const nextStatus = !plan.is_active;

    const confirmed = window.confirm(
      nextStatus
        ? "Is fee plan ko activate karna hai?"
        : "Is fee plan ko deactivate karna hai?",
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await updateStudentFeePlanStatus(plan.id, nextStatus);

      setMessage(
        nextStatus
          ? "Fee plan activate ho gaya."
          : "Fee plan deactivate ho gaya.",
      );

      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Status update nahi ho paaya.",
      );
    }
  }

  async function handleRecalculate(planId) {
    setError("");
    setMessage("");

    try {
      await recalculateStudentFeePlan(planId);

      setMessage("Fee plan recalculate ho gaya.");
      await loadData();

      if (showDetail) {
        const refreshed = await getStudentFeePlan(planId);
        setSelectedPlan(refreshed);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Recalculate nahi ho paaya.",
      );
    }
  }

  function getStudent(studentId) {
    return students.find(
      (student) => Number(student.id) === Number(studentId),
    );
  }

  function getFee(feeId) {
    return feeStructures.find(
      (fee) => Number(fee.id) === Number(feeId),
    );
  }

  return (
    <AppShell>
      <div className="sfp-page">
        <div className="sfp-header">
          <div>
            <div className="sfp-eyebrow">
              Finance · Student Billing
            </div>

            <h1>Student Fee Plans</h1>

            <p>
              Student-wise fee structure, discounts and
              installments manage karo.
            </p>
          </div>

          <div className="sfp-header-actions">
            <button
              type="button"
              className="sfp-secondary-btn"
              onClick={loadData}
              disabled={loading}
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              className="sfp-primary-btn"
              onClick={openCreate}
            >
              + New Fee Plan
            </button>
          </div>
        </div>

        {message && (
          <div className="sfp-alert sfp-success">
            {message}
          </div>
        )}

        {error && (
          <div className="sfp-alert sfp-error">
            {error}
          </div>
        )}

        <div className="sfp-summary-grid">
          <div className="sfp-summary-card">
            <span>Total Plans</span>
            <strong>{plans.length}</strong>
          </div>

          <div className="sfp-summary-card">
            <span>Active Plans</span>
            <strong>
              {plans.filter((plan) => plan.is_active).length}
            </strong>
          </div>

          <div className="sfp-summary-card">
            <span>Inactive Plans</span>
            <strong>
              {plans.filter((plan) => !plan.is_active).length}
            </strong>
          </div>

          <div className="sfp-summary-card">
            <span>Session</span>
            <strong>2026–27</strong>
          </div>
        </div>

        <div className="sfp-toolbar">
          <div className="sfp-search-wrap">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search student, admission no. or plan..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="sfp-card">
          {loading ? (
            <div className="sfp-empty">
              <div className="sfp-loader" />
              <p>Loading fee plans...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="sfp-empty">
              <div className="sfp-empty-icon">₹</div>

              <h3>No fee plans found</h3>

              <p>
                Abhi koi matching student fee plan available
                nahi hai.
              </p>

              <button
                type="button"
                className="sfp-primary-btn"
                onClick={openCreate}
              >
                Create Fee Plan
              </button>
            </div>
          ) : (
            <div className="sfp-table-wrap">
              <table className="sfp-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Fee Plan</th>
                    <th>Gross</th>
                    <th>Discount</th>
                    <th>Net Payable</th>
                    <th>Installments</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPlans.map((plan) => {
                    const student = getStudent(plan.student_id);

                    return (
                      <tr key={plan.id}>
                        <td>
                          <div className="sfp-student">
                            <div className="sfp-avatar">
                              {(
                                student?.displayName ||
                                "S"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {student?.displayName ||
                                  `Student #${plan.student_id}`}
                              </strong>

                              <small>
                                {student?.admission_number ||
                                  `ID ${plan.student_id}`}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong>{plan.name}</strong>
                          <small>
                            {dateText(plan.effective_from)} →{" "}
                            {dateText(plan.effective_to)}
                          </small>
                        </td>

                        <td>₹{money(plan.gross_amount)}</td>

                        <td>
                          ₹
                          {money(
                            Number(
                              plan.item_discount_amount || 0,
                            ) +
                              Number(
                                plan.plan_discount_amount || 0,
                              ),
                          )}
                        </td>

                        <td>
                          <strong>
                            ₹{money(plan.net_amount)}
                          </strong>
                        </td>

                        <td>
                          <span className="sfp-installment-pill">
                            {plan.installment_mode || "single"} ·{" "}
                            {plan.installment_count || 1}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              plan.is_active
                                ? "sfp-status active"
                                : "sfp-status inactive"
                            }
                          >
                            {plan.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="sfp-actions">
                            <button
                              type="button"
                              onClick={() =>
                                openDetail(plan.id)
                              }
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(plan.id)
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleRecalculate(plan.id)
                              }
                            >
                              Recalc
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatus(plan)
                              }
                            >
                              {plan.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="sfp-modal-backdrop">
            <div className="sfp-modal sfp-form-modal">
              <div className="sfp-modal-header">
                <div>
                  <span className="sfp-eyebrow">
                    {editingPlanId
                      ? "Edit Fee Plan"
                      : "Create Fee Plan"}
                  </span>

                  <h2>
                    {editingPlanId
                      ? "Update Student Fee Plan"
                      : "New Student Fee Plan"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="sfp-close"
                  onClick={() => setShowForm(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveForm}>
                <div className="sfp-form-grid">
                  <label>
                    Student *
                    <select
                      value={form.student_id}
                      onChange={(event) =>
                        updateFormField(
                          "student_id",
                          event.target.value,
                        )
                      }
                      disabled={Boolean(editingPlanId)}
                    >
                      <option value="">
                        Select student
                      </option>

                      {students.map((student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.displayName}
                          {student.admission_number
                            ? ` · ${student.admission_number}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Fee Plan Name *
                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateFormField(
                          "name",
                          event.target.value,
                        )
                      }
                      placeholder="2026-27 Annual Fee Plan"
                    />
                  </label>

                  <label>
                    Effective From *
                    <input
                      type="date"
                      value={form.effective_from}
                      onChange={(event) =>
                        updateFormField(
                          "effective_from",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    Effective To
                    <input
                      type="date"
                      value={form.effective_to}
                      onChange={(event) =>
                        updateFormField(
                          "effective_to",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    Discount Type
                    <select
                      value={form.discount_type}
                      onChange={(event) =>
                        updateFormField(
                          "discount_type",
                          event.target.value,
                        )
                      }
                    >
                      <option value="fixed">Fixed ₹</option>
                      <option value="percentage">
                        Percentage %
                      </option>
                    </select>
                  </label>

                  <label>
                    Overall Discount
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discount_value}
                      onChange={(event) =>
                        updateFormField(
                          "discount_value",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    Scholarship Name
                    <input
                      value={form.scholarship_name}
                      onChange={(event) =>
                        updateFormField(
                          "scholarship_name",
                          event.target.value,
                        )
                      }
                      placeholder="Optional"
                    />
                  </label>

                  <label>
                    Concession Reason
                    <input
                      value={form.concession_reason}
                      onChange={(event) =>
                        updateFormField(
                          "concession_reason",
                          event.target.value,
                        )
                      }
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <div className="sfp-section">
                  <div className="sfp-section-title">
                    <div>
                      <h3>Fee Heads</h3>
                      <p>
                        Student ke liye applicable fee heads
                        select karo.
                      </p>
                    </div>
                  </div>

                  <div className="sfp-fee-list">
                    {feeStructures.length === 0 ? (
                      <div className="sfp-inline-empty">
                        No active fee structures found.
                      </div>
                    ) : (
                      feeStructures.map((fee) => {
                        const item =
                          form.items.find(
                            (row) =>
                              Number(
                                row.fee_structure_id,
                              ) === Number(fee.id),
                          ) || {
                            fee_structure_id: fee.id,
                            custom_amount: "",
                            item_discount_type: "fixed",
                            item_discount_value: 0,
                            is_selected: false,
                            notes: "",
                          };

                        return (
                          <div
                            className={
                              item.is_selected
                                ? "sfp-fee-row selected"
                                : "sfp-fee-row"
                            }
                            key={fee.id}
                          >
                            <label className="sfp-check">
                              <input
                                type="checkbox"
                                checked={
                                  Boolean(
                                    item.is_selected,
                                  )
                                }
                                onChange={() =>
                                  toggleFee(fee.id)
                                }
                              />

                              <span>
                                <strong>
                                  {fee.name ||
                                    `Fee #${fee.id}`}
                                </strong>

                                <small>
                                  {fee.fee_head || "Fee"}
                                  {" · "}
                                  {fee.frequency || "monthly"}
                                  {" · "}
                                  ₹{money(fee.amount)}
                                  {fee.is_optional
                                    ? " · Optional"
                                    : ""}
                                </small>
                              </span>
                            </label>

                            {item.is_selected && (
                              <div className="sfp-fee-controls">
                                <label>
                                  Amount
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder={String(
                                      fee.amount ?? 0,
                                    )}
                                    value={
                                      item.custom_amount
                                    }
                                    onChange={(event) =>
                                      updateFeeItem(
                                        fee.id,
                                        "custom_amount",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  Discount
                                  <select
                                    value={
                                      item.item_discount_type ||
                                      "fixed"
                                    }
                                    onChange={(event) =>
                                      updateFeeItem(
                                        fee.id,
                                        "item_discount_type",
                                        event.target.value,
                                      )
                                    }
                                  >
                                    <option value="fixed">
                                      Fixed
                                    </option>
                                    <option value="percentage">
                                      %
                                    </option>
                                  </select>
                                </label>

                                <label>
                                  Value
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                      item.item_discount_value ||
                                      0
                                    }
                                    onChange={(event) =>
                                      updateFeeItem(
                                        fee.id,
                                        "item_discount_value",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="sfp-section">
                  <div className="sfp-section-title">
                    <div>
                      <h3>Installments</h3>
                      <p>
                        Payment ko single ya equal installments
                        mein divide karo.
                      </p>
                    </div>
                  </div>

                  <div className="sfp-installment-options">
                    <label>
                      Mode
                      <select
                        value={form.installment_mode}
                        onChange={(event) =>
                          updateFormField(
                            "installment_mode",
                            event.target.value,
                          )
                        }
                      >
                        <option value="single">
                          Single Payment
                        </option>
                        <option value="equal">
                          Equal Installments
                        </option>
                        <option value="custom">
                          Custom Installments
                        </option>
                      </select>
                    </label>

                    {form.installment_mode !== "single" && (
                      <label>
                        Number of Installments
                        <input
                          type="number"
                          min="2"
                          max="24"
                          value={form.installment_count}
                          onChange={(event) =>
                            updateFormField(
                              "installment_count",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    )}
                  </div>

                  {form.installment_mode === "custom" && (
                    <div className="sfp-inline-warning">
                      Custom installment amounts backend ke
                      custom schedule validation ke according
                      total net payable ke equal hone chahiye.
                    </div>
                  )}
                </div>

                <div className="sfp-section">
                  <label>
                    Notes
                    <textarea
                      rows="3"
                      value={form.notes}
                      onChange={(event) =>
                        updateFormField(
                          "notes",
                          event.target.value,
                        )
                      }
                      placeholder="Internal notes..."
                    />
                  </label>
                </div>

                <div className="sfp-preview">
                  <div>
                    <span>Gross</span>
                    <strong>₹{money(preview.gross)}</strong>
                  </div>

                  <div>
                    <span>Item Discount</span>
                    <strong>
                      −₹{money(preview.itemDiscount)}
                    </strong>
                  </div>

                  <div>
                    <span>Plan Discount</span>
                    <strong>
                      −₹{money(preview.planDiscount)}
                    </strong>
                  </div>

                  <div className="net">
                    <span>Net Payable</span>
                    <strong>₹{money(preview.net)}</strong>
                  </div>
                </div>

                <div className="sfp-modal-footer">
                  <button
                    type="button"
                    className="sfp-secondary-btn"
                    onClick={() => setShowForm(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="sfp-primary-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingPlanId
                        ? "Update Fee Plan"
                        : "Create Fee Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetail && selectedPlan && (
          <div className="sfp-modal-backdrop">
            <div className="sfp-modal">
              <div className="sfp-modal-header">
                <div>
                  <span className="sfp-eyebrow">
                    Fee Plan Detail
                  </span>

                  <h2>{selectedPlan.name}</h2>

                  <p>
                    Student ID: {selectedPlan.student_id}
                  </p>
                </div>

                <button
                  type="button"
                  className="sfp-close"
                  onClick={() => setShowDetail(false)}
                >
                  ×
                </button>
              </div>

              <div className="sfp-detail-grid">
                <div>
                  <span>Gross Amount</span>
                  <strong>
                    ₹{money(selectedPlan.gross_amount)}
                  </strong>
                </div>

                <div>
                  <span>Item Discount</span>
                  <strong>
                    ₹
                    {money(
                      selectedPlan.item_discount_amount,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Plan Discount</span>
                  <strong>
                    ₹
                    {money(
                      selectedPlan.plan_discount_amount,
                    )}
                  </strong>
                </div>

                <div className="highlight">
                  <span>Net Payable</span>
                  <strong>
                    ₹{money(selectedPlan.net_amount)}
                  </strong>
                </div>
              </div>

              <div className="sfp-section">
                <div className="sfp-section-title">
                  <div>
                    <h3>Fee Items</h3>
                  </div>
                </div>

                <div className="sfp-detail-list">
                  {rowsOf(selectedPlan.items).map((item) => {
                    const fee = getFee(item.fee_structure_id);

                    return (
                      <div
                        className="sfp-detail-row"
                        key={item.id}
                      >
                        <div>
                          <strong>
                            {fee?.name ||
                              `Fee #${item.fee_structure_id}`}
                          </strong>

                          <small>
                            {fee?.fee_head || "Fee Head"}
                          </small>
                        </div>

                        <div>
                          <strong>
                            ₹{money(item.payable_amount)}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sfp-section">
                <div className="sfp-section-title">
                  <div>
                    <h3>Installments</h3>
                  </div>
                </div>

                <div className="sfp-detail-list">
                  {rowsOf(
                    selectedPlan.installments,
                  ).length === 0 ? (
                    <div className="sfp-inline-empty">
                      No installments.
                    </div>
                  ) : (
                    rowsOf(
                      selectedPlan.installments,
                    ).map((installment) => (
                      <div
                        className="sfp-detail-row"
                        key={installment.id}
                      >
                        <div>
                          <strong>
                            {installment.name ||
                              `Installment ${installment.installment_number}`}
                          </strong>

                          <small>
                            Due:{" "}
                            {dateText(
                              installment.due_date,
                            )}
                          </small>
                        </div>

                        <div>
                          <strong>
                            ₹{money(installment.amount)}
                          </strong>

                          <small>
                            {installment.status || "pending"}
                          </small>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="sfp-modal-footer">
                <button
                  type="button"
                  className="sfp-secondary-btn"
                  onClick={() => setShowDetail(false)}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="sfp-primary-btn"
                  onClick={() =>
                    handleRecalculate(selectedPlan.id)
                  }
                >
                  Recalculate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}