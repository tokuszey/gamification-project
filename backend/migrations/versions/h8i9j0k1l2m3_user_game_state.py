"""user_game_state: XP, badges, shop for Player Runtime persistence

Revision ID: h8i9j0k1l2m3
Revises: g2h3i4j5k6l7
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "h8i9j0k1l2m3"
down_revision: Union[str, Sequence[str], None] = "g2h3i4j5k6l7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_game_state",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("player_key", sa.String(length=128), nullable=False),
        sa.Column("spec_id", sa.Integer(), nullable=False),
        sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("virtual_currency", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("badges", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("shop_owned_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_game_state_player_key", "user_game_state", ["player_key"], unique=False)
    op.create_index("ix_user_game_state_spec_id", "user_game_state", ["spec_id"], unique=False)
    op.create_index("ix_uq_player_spec", "user_game_state", ["player_key", "spec_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_uq_player_spec", table_name="user_game_state")
    op.drop_index("ix_user_game_state_spec_id", table_name="user_game_state")
    op.drop_index("ix_user_game_state_player_key", table_name="user_game_state")
    op.drop_table("user_game_state")
