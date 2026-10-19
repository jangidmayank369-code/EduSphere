"""merge accounting migration heads

Revision ID: e21b9805cb83
Revises: add_accounting_transactions, b7d4c2e91f60
Create Date: 2026-10-18 23:24:04.738956

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e21b9805cb83'
down_revision: Union[str, Sequence[str], None] = ('add_accounting_transactions', 'b7d4c2e91f60')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
