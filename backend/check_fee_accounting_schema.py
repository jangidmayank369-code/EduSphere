from sqlalchemy import inspect
from app.core.database import engine
from app.models.fee_payment import FeePayment
from app.models.accounting_transaction import AccountingTransaction

inspector = inspect(engine)

for model in [FeePayment, AccountingTransaction]:
    table = model.__tablename__
    actual = {
        column["name"]
        for column in inspector.get_columns(table, schema="public")
    }
    expected = set(model.__table__.columns.keys())

    print(f"\nTable: {table}")
    print("Status:", "MATCH" if actual == expected else "MISMATCH")
    print("Missing in database:", sorted(expected - actual))
    print("Extra in database:", sorted(actual - expected))
