from datetime import date
from decimal import Decimal
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.ledger import ChartOfAccount, JournalEntry, JournalLine
from app.models.school import AcademicSession, School

router = APIRouter(prefix="/ledger", tags=["Ledger"])
MONEY = Decimal("0.01")

class AccountCreate(BaseModel):
    school_id: int = Field(gt=0)
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=160)
    account_type: str = Field(pattern="^(asset|liability|equity|income|expense)$")
    parent_id: int | None = Field(default=None, gt=0)

class JournalLineInput(BaseModel):
    account_id: int = Field(gt=0)
    debit: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    credit: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    description: str | None = Field(default=None, max_length=300)

class JournalCreate(BaseModel):
    school_id: int = Field(gt=0)
    academic_session_id: int = Field(gt=0)
    entry_date: date
    memo: str = Field(min_length=2, max_length=4000)
    source_type: str = Field(min_length=1, max_length=50)
    source_id: str = Field(min_length=1, max_length=100)
    lines: list[JournalLineInput] = Field(min_length=2, max_length=100)

def _session(db: Session, school_id: int, session_id: int):
    school = db.get(School, school_id)
    session = db.query(AcademicSession).filter(AcademicSession.id == session_id, AcademicSession.school_id == school_id).first()
    if not school or not school.is_active or not session or not session.is_active:
        raise HTTPException(status_code=404, detail="Active school/session was not found.")

def _entry_json(entry: JournalEntry):
    return {"id": entry.id, "school_id": entry.school_id, "academic_session_id": entry.academic_session_id, "entry_number": entry.entry_number, "entry_date": entry.entry_date, "memo": entry.memo, "source_type": entry.source_type, "source_id": entry.source_id, "status": entry.status, "lines": [{"account_id": l.account_id, "debit": l.debit, "credit": l.credit, "description": l.description} for l in entry.lines]}

@router.post("/accounts", status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), user=Depends(require_permission("ACCOUNTING_TRANSACTION_CREATE"))):
    school = db.get(School, payload.school_id)
    if not school or not school.is_active:
        raise HTTPException(status_code=404, detail="Active school not found.")
    code = payload.code.strip()
    name = payload.name.strip()
    if not code or not name:
        raise HTTPException(status_code=422, detail="Account code and name are required.")
    if payload.parent_id:
        parent = db.query(ChartOfAccount).filter(ChartOfAccount.id == payload.parent_id, ChartOfAccount.school_id == payload.school_id).first()
        if not parent or not parent.is_active:
            raise HTTPException(status_code=422, detail="Parent account must be active and belong to the same school.")
        if payload.parent_id == 0:
            raise HTTPException(status_code=422, detail="Invalid parent account.")
    row = ChartOfAccount(school_id=payload.school_id, code=code, name=name, account_type=payload.account_type, parent_id=payload.parent_id)
    db.add(row)
    try:
        db.commit(); db.refresh(row)
    except IntegrityError as exc:
        db.rollback(); raise HTTPException(status_code=409, detail="Account code already exists for this school.") from exc
    return {"id": row.id, "school_id": row.school_id, "code": row.code, "name": row.name, "account_type": row.account_type, "parent_id": row.parent_id, "is_system": row.is_system, "is_active": row.is_active}

@router.get("/accounts")
def list_accounts(school_id: int = Query(gt=0), account_type: str | None = Query(default=None, pattern="^(asset|liability|equity|income|expense)$"), db: Session = Depends(get_db), user=Depends(require_permission("ACCOUNTING_TRANSACTION_VIEW"))):
    q = db.query(ChartOfAccount).filter(ChartOfAccount.school_id == school_id, ChartOfAccount.is_active.is_(True))
    if account_type: q = q.filter(ChartOfAccount.account_type == account_type)
    return [{"id": a.id, "code": a.code, "name": a.name, "account_type": a.account_type, "parent_id": a.parent_id, "is_system": a.is_system} for a in q.order_by(ChartOfAccount.code).all()]

@router.post("/journal-entries", status_code=201)
def create_journal_entry(payload: JournalCreate, db: Session = Depends(get_db), user=Depends(require_permission("ACCOUNTING_TRANSACTION_CREATE"))):
    _session(db, payload.school_id, payload.academic_session_id)
    lines = []
    debit_total = Decimal("0.00"); credit_total = Decimal("0.00")
    for line in payload.lines:
        debit = line.debit.quantize(MONEY); credit = line.credit.quantize(MONEY)
        if (debit > 0) == (credit > 0):
            raise HTTPException(status_code=422, detail="Each journal line must have either a debit or a credit, not both.")
        account = db.query(ChartOfAccount).filter(ChartOfAccount.id == line.account_id, ChartOfAccount.school_id == payload.school_id, ChartOfAccount.is_active.is_(True)).first()
        if not account:
            raise HTTPException(status_code=422, detail=f"Account {line.account_id} is unavailable for this school.")
        debit_total += debit; credit_total += credit
        lines.append(JournalLine(account_id=account.id, debit=debit, credit=credit, description=(line.description or "").strip() or None))
    if debit_total <= 0 or debit_total != credit_total:
        raise HTTPException(status_code=422, detail="Journal entry must balance: total debit must equal total credit and be greater than zero.")
    existing = db.query(JournalEntry).options(joinedload(JournalEntry.lines)).filter(JournalEntry.school_id == payload.school_id, JournalEntry.academic_session_id == payload.academic_session_id, JournalEntry.source_type == payload.source_type.strip(), JournalEntry.source_id == payload.source_id.strip()).first()
    if existing:
        return _entry_json(existing)
    entry = JournalEntry(school_id=payload.school_id, academic_session_id=payload.academic_session_id, entry_number=f"JE-{uuid4().hex[:12].upper()}", entry_date=payload.entry_date, memo=payload.memo.strip(), source_type=payload.source_type.strip(), source_id=payload.source_id.strip(), created_by=getattr(user, "id", None), lines=lines)
    db.add(entry)
    try:
        db.commit(); db.refresh(entry)
    except IntegrityError as exc:
        db.rollback()
        existing = db.query(JournalEntry).options(joinedload(JournalEntry.lines)).filter(JournalEntry.school_id == payload.school_id, JournalEntry.academic_session_id == payload.academic_session_id, JournalEntry.source_type == payload.source_type.strip(), JournalEntry.source_id == payload.source_id.strip()).first()
        if existing: return _entry_json(existing)
        raise HTTPException(status_code=409, detail="Journal entry conflicts with an existing source record.") from exc
    return _entry_json(entry)

@router.get("/journal-entries")
def list_journal_entries(school_id: int = Query(gt=0), academic_session_id: int = Query(gt=0), date_from: date | None = None, date_to: date | None = None, limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0), db: Session = Depends(get_db), user=Depends(require_permission("ACCOUNTING_TRANSACTION_VIEW"))):
    _session(db, school_id, academic_session_id)
    if date_from and date_to and date_from > date_to: raise HTTPException(status_code=422, detail="date_from cannot be after date_to.")
    q = db.query(JournalEntry).options(joinedload(JournalEntry.lines)).filter(JournalEntry.school_id == school_id, JournalEntry.academic_session_id == academic_session_id)
    if date_from: q = q.filter(JournalEntry.entry_date >= date_from)
    if date_to: q = q.filter(JournalEntry.entry_date <= date_to)
    return [_entry_json(e) for e in q.order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc()).offset(offset).limit(limit).all()]

@router.get("/trial-balance")
def trial_balance(school_id: int = Query(gt=0), academic_session_id: int = Query(gt=0), date_to: date | None = None, db: Session = Depends(get_db), user=Depends(require_permission("ACCOUNTING_TRANSACTION_VIEW"))):
    _session(db, school_id, academic_session_id)
    q = db.query(ChartOfAccount.id, ChartOfAccount.code, ChartOfAccount.name, ChartOfAccount.account_type, func.coalesce(func.sum(JournalLine.debit), 0).label("debit"), func.coalesce(func.sum(JournalLine.credit), 0).label("credit")).outerjoin(JournalLine, JournalLine.account_id == ChartOfAccount.id).outerjoin(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id).filter(ChartOfAccount.school_id == school_id, ChartOfAccount.is_active.is_(True))
    q = q.filter((JournalEntry.id.is_(None)) | ((JournalEntry.school_id == school_id) & (JournalEntry.academic_session_id == academic_session_id) & (JournalEntry.status == "posted")))
    if date_to: q = q.filter((JournalEntry.id.is_(None)) | (JournalEntry.entry_date <= date_to))
    rows = q.group_by(ChartOfAccount.id, ChartOfAccount.code, ChartOfAccount.name, ChartOfAccount.account_type).order_by(ChartOfAccount.code).all()
    result = [{"account_id": r.id, "code": r.code, "name": r.name, "account_type": r.account_type, "debit": Decimal(r.debit).quantize(MONEY), "credit": Decimal(r.credit).quantize(MONEY)} for r in rows]
    return {"school_id": school_id, "academic_session_id": academic_session_id, "accounts": result, "total_debit": sum((r["debit"] for r in result), Decimal("0.00")), "total_credit": sum((r["credit"] for r in result), Decimal("0.00")), "as_of": date_to}

@router.get("/account-ledger")
def account_ledger(
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    account_id: int = Query(gt=0),
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=250, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user=Depends(require_permission("ACCOUNTING_TRANSACTION_VIEW")),
):
    """Return immutable journal lines for one account and session.

    Running balance uses the account's normal balance: assets/expenses are
    debit-normal; liabilities/equity/income are credit-normal. Reversed source
    entries remain visible for audit, while their correcting entries offset them.
    """
    _session(db, school_id, academic_session_id)
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from cannot be after date_to.")

    account = (
        db.query(ChartOfAccount)
        .filter(
            ChartOfAccount.id == account_id,
            ChartOfAccount.school_id == school_id,
        )
        .first()
    )
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found for this school.")

    query = (
        db.query(JournalEntry, JournalLine)
        .join(JournalLine, JournalLine.journal_entry_id == JournalEntry.id)
        .filter(
            JournalEntry.school_id == school_id,
            JournalEntry.academic_session_id == academic_session_id,
            JournalLine.account_id == account_id,
            JournalEntry.status == "posted",
        )
    )
    if date_from:
        query = query.filter(JournalEntry.entry_date >= date_from)
    if date_to:
        query = query.filter(JournalEntry.entry_date <= date_to)

    rows = query.order_by(JournalEntry.entry_date.asc(), JournalEntry.id.asc(), JournalLine.id.asc()).all()
    normal_debit = account.account_type in {"asset", "expense"}
    running = Decimal("0.00")
    records = []
    for entry, line in rows:
        debit = Decimal(line.debit).quantize(MONEY)
        credit = Decimal(line.credit).quantize(MONEY)
        running += (debit - credit) if normal_debit else (credit - debit)
        records.append({
            "journal_entry_id": entry.id,
            "entry_number": entry.entry_number,
            "entry_date": entry.entry_date,
            "memo": entry.memo,
            "source_type": entry.source_type,
            "source_id": entry.source_id,
            "line_id": line.id,
            "description": line.description,
            "debit": debit,
            "credit": credit,
            "running_balance": running.quantize(MONEY),
        })

    page = records[offset:offset + limit]
    return {
        "school_id": school_id,
        "academic_session_id": academic_session_id,
        "account": {"id": account.id, "code": account.code, "name": account.name, "account_type": account.account_type},
        "date_from": date_from,
        "date_to": date_to,
        "count": len(records),
        "offset": offset,
        "limit": limit,
        "entries": page,
    }
