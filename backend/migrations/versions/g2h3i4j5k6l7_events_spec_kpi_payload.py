"""events: spec_id, kpi_key, payload for KPI analytics bridge

Revision ID: g2h3i4j5k6l7
Revises: f7a8b9c0d1e2
Create Date: 2026-03-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "g2h3i4j5k6l7"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("spec_id", sa.Integer(), nullable=True))
    op.add_column("events", sa.Column("kpi_key", sa.String(length=160), nullable=True))
    op.add_column("events", sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_index("ix_events_spec_id", "events", ["spec_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_events_spec_id", table_name="events")
    op.drop_column("events", "payload")
    op.drop_column("events", "kpi_key")
    op.drop_column("events", "spec_id")
