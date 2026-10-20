import { useCallback, useEffect, useMemo, useState } from "react";
import { listStudentFeePlans } from "../../api/studentFeePlans";
import {
  createFeePayment,
  listFeePayments,
  getFeePaymentReceipt,
} from "../../api/feePayments";

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

function unwrapList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function amount(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount(value));
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN");
}

function paymentStatus(payment) {
  return String(payment?.status ?? "posted").trim().toLowerCase();
}

function isPosted(payment) {
  return paymentStatus(payment) === "posted";
}

function isReversed(payment) {
  return ["reversed", "voided", "void", "cancelled", "canceled"].includes(paymentStatus(payment));
}

function getName(student) {
  return student?.full_name || [student?.first_name, student?.last_name].filter(Boolean).join(" ") || "Selected student";
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function StudentFeeSummary({ student, schoolId, academicSessionId }) {
  const studentId = student?.id;
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [form, setForm] = useState({
    planId: "",
    installmentId: "",
    amount: "",
    paymentDate: todayISO(),
    paymentMode: "cash",
    referenceNumber: "",
    remarks: "",
  });

  const load = useCallback(async (refresh = false) => {
    if (!studentId || !schoolId || !academicSessionId) {
      setPlans([]);
      setPayments([]);
      setError(!studentId ? "Select a student to view fee details." : "School or academic session context is missing.");
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const params = {
        school_id: Number(schoolId),
        academic_session_id: Number(academicSessionId),
        student_id: Number(studentId),
      };
      const [planResponse, paymentResponse] = await Promise.all([
        listStudentFeePlans({ ...params, page: 1, page_size: 100 }),
        listFeePayments({ ...params, limit: 500, offset: 0 }),
      ]);
      setPlans(unwrapList(planResponse));
      setPayments(unwrapList(paymentResponse));
    } catch (err) {
      console.error("Student fee summary load failed:", err);
      setError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Unable to load student fee details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, schoolId, academicSessionId]);

  useEffect(() => { load(); }, [load]);

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.is_active !== false && String(plan.status ?? "active").toLowerCase() !== "inactive"),
    [plans],
  );

  const totals = useMemo(() => {
    const planned = activePlans.reduce((sum, plan) => sum + amount(plan.net_amount ?? plan.total_amount ?? plan.amount), 0);
    const paid = payments.filter(isPosted).reduce((sum, payment) => sum + amount(payment.amount), 0);
    return { planned, paid, outstanding: Math.max(0, planned - paid) };
  }, [activePlans, payments]);

  const selectedPlan = activePlans.find((plan) => String(plan.id) === String(form.planId));
  const selectedInstallment = selectedPlan?.installments?.find((item) => String(item.id) === String(form.installmentId));

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startCollection() {
    if (!activePlans.length) {
      setError("No active fee plan is available for this student and session.");
      return;
    }
    const plan = activePlans[0];
    const firstInstallment = (plan.installments || []).find((item) => item.is_active !== false && String(item.status || "pending").toLowerCase() !== "paid");
    setForm({
      planId: String(plan.id),
      installmentId: firstInstallment ? String(firstInstallment.id) : "",
      amount: firstInstallment ? String(firstInstallment.amount) : String(Math.max(0, amount(plan.net_amount) - payments.filter((p) => p.student_fee_plan_id === plan.id && isPosted(p)).reduce((s, p) => s + amount(p.amount), 0))),
      paymentDate: todayISO(),
      paymentMode: "cash",
      referenceNumber: "",
      remarks: "",
    });
    setNotice("");
    setCollectOpen(true);
  }

  async function submitPayment(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const paymentAmount = Number(form.amount);
    if (!selectedPlan) return setError("Choose a fee plan before collecting payment.");
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) return setError("Enter a payment amount greater than zero.");
    if (!form.paymentDate) return setError("Select the payment date.");

    setSavingPayment(true);
    try {
      const payload = {
        school_id: Number(schoolId),
        academic_session_id: Number(academicSessionId),
        student_id: Number(studentId),
        student_fee_plan_id: Number(selectedPlan.id),
        installment_id: form.installmentId ? Number(form.installmentId) : null,
        amount: paymentAmount.toFixed(2),
        payment_date: form.paymentDate,
        payment_mode: form.paymentMode,
        reference_number: form.referenceNumber.trim() || null,
        remarks: form.remarks.trim() || null,
      };
      await createFeePayment(payload);
      setCollectOpen(false);
      setNotice("Payment recorded successfully. Refreshing fee balance and payment history.");
      await load(true);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Payment could not be recorded.");
    } finally {
      setSavingPayment(false);
    }
  }

  async function openReceipt(payment) {
    setReceiptLoadingId(payment.id);
    try {
      const result = await getFeePaymentReceipt(payment.id, {
        school_id: Number(schoolId),
        academic_session_id: Number(academicSessionId),
      });
      // The backend returns structured receipt data, not HTML.
      const data = result?.data ?? result;
      const receipt = data?.receipt ?? {};
      const studentInfo = data?.student ?? {};
      const fee = data?.fee ?? {};
      const paymentInfo = data?.payment ?? {};
      const accounting = data?.accounting ?? {};
      const safe = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      })[char]);
      const rows = [
        ["Receipt number", receipt.receipt_number],
        ["Payment date", dateLabel(receipt.payment_date)],
        ["Payment status", receipt.status],
        ["Student", studentInfo.name],
        ["Admission number", studentInfo.admission_number],
        ["Class", studentInfo.class_name],
        ["Section", studentInfo.section],
        ["Fee plan amount", money(fee.plan_amount)],
        ["Payment amount", money(paymentInfo.amount)],
        ["Payment mode", paymentInfo.payment_mode],
        ["Reference number", paymentInfo.reference_number],
        ["Total paid", money(fee.total_paid)],
        ["Outstanding balance", money(fee.outstanding_balance)],
        ["Installment status", fee.installment_status],
        ["Received by", paymentInfo.received_by],
        ["Accounting status", accounting.status],
        ["Remarks", paymentInfo.remarks],
        ["Reversal reason", receipt.reversal_reason],
      ];
      const popup = window.open("", "_blank", "width=900,height=750");
      if (!popup) throw new Error("Receipt popup blocked. Allow pop-ups and click View receipt again.");
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fee Receipt ${safe(receipt.receipt_number)}</title><style>*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172554;margin:0;padding:28px;background:#f4f6fb}.receipt{max-width:760px;margin:0 auto;background:#fff;border:1px solid #dce3f0;border-radius:12px;padding:28px}h1{font-size:23px;margin:0 0 6px}.sub{color:#64748b;margin:0 0 22px}.amount{font-size:22px;font-weight:700;color:#312e81}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;padding:11px 12px;border-bottom:1px solid #e8edf5;overflow-wrap:anywhere;vertical-align:top}th{width:36%;color:#475569;background:#f8fafc}.actions{display:flex;gap:10px;margin-top:20px}button{border:0;border-radius:8px;background:#4f35c8;color:white;padding:11px 18px;font-weight:700;cursor:pointer}button.secondary{background:#e9edf5;color:#24324b}@media print{body{padding:0;background:#fff}.receipt{border:0;max-width:none;padding:0}.actions{display:none}}</style></head><body><main class="receipt"><h1>Wisdom Public School — Fee Receipt</h1><p class="sub">EduSphere · Payment receipt</p><p class="amount">${safe(money(paymentInfo.amount))}</p><table><tbody>${rows.map(([label, value]) => `<tr><th>${safe(label)}</th><td>${safe(value == null || value === "" ? "—" : value)}</td></tr>`).join("")}</tbody></table><div class="actions"><button onclick="window.print()">Print receipt</button><button class="secondary" onclick="window.close()">Close</button></div></main></body></html>`);
      popup.document.close();
    } catch (err) {
      window.alert(err?.response?.data?.detail || err?.message || "Unable to open receipt.");
    } finally {
      setReceiptLoadingId(null);
    }
  }

  return (
    <section className="sfs-workspace">
      <header className="sfs-header">
        <div className="sfs-header-copy">
          <h3>Student Fees</h3>
          <p>{getName(student)} · Fee plans, collections and receipts for the selected session.</p>
        </div>
        <div className="sfs-header-actions">
          <button type="button" className="sfs-btn sfs-btn-primary" onClick={startCollection} disabled={loading || !activePlans.length}>Collect fee</button>
          <button type="button" className="sfs-btn" onClick={() => load(true)} disabled={loading || refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button>
        </div>
      </header>

      {error && <div className="sfs-alert sfs-alert-error" role="alert"><span>{error}</span><button type="button" className="sfs-btn" onClick={() => load(true)}>Retry</button></div>}
      {notice && <div className="sfs-alert sfs-alert-success" role="status">{notice}</div>}

      {collectOpen && (
        <form className="sfs-collect-form" onSubmit={submitPayment}>
          <div className="sfs-collect-heading"><div><h4>Collect fee payment</h4><p>Payment will be recorded against the selected student and fee plan.</p></div><button type="button" className="sfs-btn" onClick={() => setCollectOpen(false)}>Cancel</button></div>
          <div className="sfs-form-grid">
            <label>Fee plan<select required value={form.planId} onChange={(e) => { const plan = activePlans.find((p) => String(p.id) === e.target.value); const inst = plan?.installments?.find((item) => item.is_active !== false && String(item.status || "pending").toLowerCase() !== "paid"); setForm((current) => ({ ...current, planId: e.target.value, installmentId: inst ? String(inst.id) : "", amount: inst ? String(inst.amount) : String(amount(plan?.net_amount)) })); }}><option value="">Choose plan</option>{activePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.net_amount)}</option>)}</select></label>
            <label>Installment<select value={form.installmentId} onChange={(e) => { const installment = selectedPlan?.installments?.find((item) => String(item.id) === e.target.value); setForm((current) => ({ ...current, installmentId: e.target.value, amount: installment ? String(installment.amount) : current.amount })); }}><option value="">No specific installment</option>{(selectedPlan?.installments || []).filter((item) => item.is_active !== false).map((item) => <option key={item.id} value={item.id}>{item.name} · Due {dateLabel(item.due_date)} · {money(item.amount)}</option>)}</select></label>
            <label>Amount (₹)<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => updateForm("amount", e.target.value)} /></label>
            <label>Payment date<input type="date" required value={form.paymentDate} onChange={(e) => updateForm("paymentDate", e.target.value)} /></label>
            <label>Payment method<select required value={form.paymentMode} onChange={(e) => updateForm("paymentMode", e.target.value)}>{PAYMENT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
            <label>Reference number (optional)<input maxLength="150" value={form.referenceNumber} onChange={(e) => updateForm("referenceNumber", e.target.value)} placeholder="UPI / bank / cheque reference" /></label>
            <label className="sfs-form-full">Remarks (optional)<textarea maxLength="4000" rows="2" value={form.remarks} onChange={(e) => updateForm("remarks", e.target.value)} placeholder="Payment notes" /></label>
          </div>
          <div className="sfs-collect-footer"><span>Amount: <strong>{money(form.amount)}</strong></span><button type="submit" className="sfs-btn sfs-btn-primary" disabled={savingPayment}>{savingPayment ? "Saving payment…" : "Save payment"}</button></div>
        </form>
      )}

      {loading ? <div className="sfs-empty">Loading student fee details…</div> : (
        <>
          <div className="sfs-summary-grid">
            <article><span>Total planned</span><strong>{money(totals.planned)}</strong></article>
            <article><span>Paid</span><strong>{money(totals.paid)}</strong></article>
            <article><span>Outstanding</span><strong>{money(totals.outstanding)}</strong></article>
          </div>

          <section className="sfs-section">
            <div className="sfs-section-title"><h4>Fee plans</h4><span>{activePlans.length} plans</span></div>
            {!plans.length ? <div className="sfs-empty">No fee plans found for this student in the selected session.</div> : <div className="sfs-table-shell"><table className="sfs-table"><thead><tr><th>Plan</th><th>Gross</th><th>Discount</th><th>Net payable</th><th>Installments</th><th>Status</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td className="sfs-plan-name">{plan.name || `Fee Plan #${plan.id}`}</td><td className="sfs-num">{money(plan.gross_amount)}</td><td className="sfs-num">{money(amount(plan.item_discount_amount) + amount(plan.plan_discount_amount))}</td><td className="sfs-num sfs-strong">{money(plan.net_amount)}</td><td>{(plan.installments || []).length ? `${plan.installments.length} installments` : "Single / not set"}</td><td><span className={`sfs-status ${plan.is_active === false ? "sfs-status-muted" : "sfs-status-good"}`}>{plan.is_active === false ? "Inactive" : plan.status || "Active"}</span></td></tr>)}</tbody></table></div>}
            {activePlans.some((plan) => plan.installments?.length) && <div className="sfs-installment-list">{activePlans.filter((plan) => plan.installments?.length).map((plan) => <div className="sfs-installment-group" key={plan.id}><h5>{plan.name} — installments</h5><div className="sfs-table-shell"><table className="sfs-table sfs-small-table"><thead><tr><th>Installment</th><th>Due date</th><th className="sfs-num">Amount</th><th>Status</th></tr></thead><tbody>{plan.installments.map((item) => <tr key={item.id}><td>{item.name}</td><td>{dateLabel(item.due_date)}</td><td className="sfs-num">{money(item.amount)}</td><td>{item.status || "Pending"}</td></tr>)}</tbody></table></div></div>)}</div>}
          </section>

          <section className="sfs-section">
            <div className="sfs-section-title"><h4>Payment history</h4><span>{payments.length} records</span></div>
            {!payments.length ? <div className="sfs-empty">No payment records found for this student.</div> : <div className="sfs-table-shell"><table className="sfs-table sfs-payment-table"><thead><tr><th>Date</th><th>Receipt / reference</th><th>Mode</th><th className="sfs-num">Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{dateLabel(payment.payment_date || payment.created_at)}</td><td className="sfs-reference">{payment.receipt_number || payment.reference_number || `Payment #${payment.id}`}</td><td>{PAYMENT_MODES.find((item) => item.value === payment.payment_mode)?.label || payment.payment_mode || "—"}</td><td className="sfs-num sfs-strong">{money(payment.amount)}</td><td><span className={`sfs-status ${isReversed(payment) ? "sfs-status-reversed" : isPosted(payment) ? "sfs-status-good" : "sfs-status-muted"}`}>{isReversed(payment) ? "Reversed" : payment.status || "Posted"}</span></td><td><button type="button" className="sfs-btn sfs-receipt-btn" onClick={() => openReceipt(payment)} disabled={receiptLoadingId === payment.id}>{receiptLoadingId === payment.id ? "Opening…" : "View receipt"}</button></td></tr>)}</tbody></table></div>}
          </section>
        </>
      )}

      <style>{`
        .sfs-workspace{width:100%;min-width:0;max-width:100%;color:#172554}
        .sfs-workspace *{box-sizing:border-box}
        .sfs-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;padding:22px 24px;border-bottom:1px solid #e7ecf5}
        .sfs-header-copy{min-width:0;flex:1}.sfs-header h3{margin:0;font-size:20px;line-height:1.35}.sfs-header p{margin:7px 0 0;color:#71809b;line-height:1.5}
        .sfs-header-actions{display:flex;gap:8px;flex-wrap:wrap}.sfs-btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 14px;border:1px solid #d8e0ef;border-radius:10px;background:#fff;color:#34466b;font:inherit;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer}.sfs-btn:disabled{opacity:.6;cursor:not-allowed}.sfs-btn-primary{background:#5b35d5;border-color:#5b35d5;color:#fff}.sfs-btn-primary:hover:not(:disabled){background:#4826b7}
        .sfs-alert{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:16px 24px 0;padding:13px 15px;border-radius:11px;overflow-wrap:anywhere}.sfs-alert-error{border:1px solid #fecaca;background:#fff7f7;color:#991b1b}.sfs-alert-success{border:1px solid #b7ebc8;background:#f0fff5;color:#166534}
        .sfs-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:20px 24px 8px}.sfs-summary-grid article{display:flex;flex-direction:column;justify-content:space-between;gap:14px;min-width:0;min-height:112px;padding:18px;border:1px solid #e1e8f5;border-radius:15px;background:#fff}.sfs-summary-grid article span{color:#5e6d88;font-size:14px}.sfs-summary-grid article strong{font-size:clamp(18px,2vw,23px);line-height:1.35;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
        .sfs-section{min-width:0;padding:18px 24px 8px}.sfs-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}.sfs-section-title h4{margin:0;font-size:16px}.sfs-section-title span{color:#71809b;font-size:13px}
        .sfs-workspace .sfs-table-shell{display:block;width:100%;max-width:100%;min-width:0;overflow-x:auto;border:1px solid #e4eaf4;border-radius:12px;-webkit-overflow-scrolling:touch}.sfs-workspace .sfs-table-shell>.sfs-table{display:table!important;width:100%!important;min-width:100%!important;max-width:none!important;table-layout:fixed!important;overflow:visible!important;border-collapse:collapse;border-spacing:0}.sfs-workspace .sfs-table-shell>.sfs-table th,.sfs-workspace .sfs-table-shell>.sfs-table td{padding:11px 10px;text-align:left;vertical-align:middle;line-height:1.4;border-bottom:1px solid #edf0f6;white-space:normal;overflow-wrap:anywhere;word-break:normal}.sfs-workspace .sfs-table-shell>.sfs-table th:nth-child(1){width:20%}.sfs-workspace .sfs-table-shell>.sfs-table th:nth-child(2){width:16%}.sfs-workspace .sfs-table-shell>.sfs-table th:nth-child(3){width:14%}.sfs-workspace .sfs-table-shell>.sfs-table th:nth-child(4){width:16%}.sfs-workspace .sfs-table-shell>.sfs-table th:nth-child(5){width:18%}.sfs-workspace .sfs-table-shell>.sfs-table th:nth-child(6){width:16%}.sfs-workspace .sfs-table-shell>.sfs-payment-table th:nth-child(1){width:12%}.sfs-workspace .sfs-table-shell>.sfs-payment-table th:nth-child(2){width:23%}.sfs-workspace .sfs-table-shell>.sfs-payment-table th:nth-child(3){width:13%}.sfs-workspace .sfs-table-shell>.sfs-payment-table th:nth-child(4){width:14%}.sfs-workspace .sfs-table-shell>.sfs-payment-table th:nth-child(5){width:14%}.sfs-workspace .sfs-table-shell>.sfs-payment-table th:nth-child(6){width:17%}.sfs-workspace .sfs-table-shell>.sfs-payment-table th:nth-child(1),.sfs-workspace .sfs-table-shell>.sfs-payment-table td:nth-child(1){width:14%;white-space:nowrap;overflow-wrap:normal}.sfs-workspace .sfs-table-shell>.sfs-payment-table td:nth-child(6){white-space:nowrap}.sfs-workspace .sfs-table-shell>.sfs-payment-table th:nth-child(2){width:25%}.sfs-workspace .sfs-table-shell>.sfs-table .sfs-num{text-align:right;white-space:nowrap}.sfs-workspace .sfs-table-shell>.sfs-table .sfs-reference{min-width:0;overflow-wrap:anywhere;word-break:break-word}.sfs-table thead th{background:#f7f9fd;color:#60708b;font-size:12px;font-weight:700}.sfs-table tbody tr:last-child td{border-bottom:0}.sfs-table tbody tr:hover{background:#fbfcff}.sfs-table .sfs-num{text-align:right;font-variant-numeric:tabular-nums}.sfs-plan-name{min-width:190px;white-space:normal!important}.sfs-reference{min-width:190px;white-space:normal!important;overflow-wrap:anywhere}.sfs-strong{font-weight:700;color:#172554}
        .sfs-status{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:700;text-transform:capitalize}.sfs-status-good{background:#e8f8ef;color:#177245}.sfs-status-reversed{background:#fff0f0;color:#b42318}.sfs-status-muted{background:#f0f3f9;color:#52627f}.sfs-empty{padding:22px 16px;border:1px dashed #dce3ef;border-radius:12px;background:#fbfcff;color:#71809b;text-align:center;line-height:1.5}
        .sfs-collect-form{margin:18px 24px 8px;padding:18px;border:1px solid #dfe5f2;border-radius:14px;background:#fbfcff}.sfs-collect-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}.sfs-collect-heading h4{margin:0}.sfs-collect-heading p{margin:6px 0 0;color:#71809b;font-size:13px}.sfs-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.sfs-form-grid label{display:flex;flex-direction:column;gap:7px;min-width:0;color:#465674;font-size:13px;font-weight:600}.sfs-form-grid input,.sfs-form-grid select,.sfs-form-grid textarea{width:100%;min-width:0;padding:10px 11px;border:1px solid #d7dfed;border-radius:9px;background:#fff;color:#172554;font:inherit;font-weight:400}.sfs-form-full{grid-column:1/-1}.sfs-collect-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid #e5eaf3}.sfs-installment-list{display:grid;gap:14px;margin-top:16px}.sfs-installment-group h5{margin:0 0 9px;font-size:14px}.sfs-small-table{min-width:100%!important}
        @media(max-width:760px){.sfs-header{padding:18px 16px}.sfs-header-actions{width:100%}.sfs-header-actions .sfs-btn{flex:1}.sfs-summary-grid{grid-template-columns:1fr;padding:16px}.sfs-summary-grid article{min-height:84px;padding:15px}.sfs-section{padding:16px}.sfs-alert{margin:14px 16px 0}.sfs-collect-form{margin:16px;padding:14px}.sfs-form-grid{grid-template-columns:1fr}.sfs-form-full{grid-column:auto}.sfs-collect-footer{align-items:stretch}.sfs-collect-footer .sfs-btn{width:100%}}
      `}</style>
    </section>
  );
}
