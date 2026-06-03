"""add plan stripe totp columns

Revision ID: e5f7a9b2c4d6
Revises: d3e5f7a9b1c2
Create Date: 2026-06-02 10:00:00.000000

Adds to users table:
  - plan              VARCHAR(20) DEFAULT 'free'
  - plan_expires_at   DATETIME    NULLABLE
  - stripe_customer_id VARCHAR(64) NULLABLE
  - totp_secret       VARCHAR(64) NULLABLE
  - totp_enabled      BOOLEAN     DEFAULT 0

Adds tables:
  - audit_logs        SuperAdmin action tracking
  - broadcasts        Platform-wide messages
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e5f7a9b2c4d6'
down_revision: Union[str, None] = 'd3e5f7a9b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    """Safe check — works for both SQLite and PostgreSQL."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return column in [c["name"] for c in insp.get_columns(table)]


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return table in insp.get_table_names()


def upgrade() -> None:
    # ── users: plan columns ───────────────────────────────────────────────
    if not _column_exists("users", "plan"):
        op.add_column("users", sa.Column("plan", sa.String(20), server_default="free", nullable=True))

    if not _column_exists("users", "plan_expires_at"):
        op.add_column("users", sa.Column("plan_expires_at", sa.DateTime, nullable=True))

    if not _column_exists("users", "stripe_customer_id"):
        op.add_column("users", sa.Column("stripe_customer_id", sa.String(64), nullable=True))

    if not _column_exists("users", "totp_secret"):
        op.add_column("users", sa.Column("totp_secret", sa.String(64), nullable=True))

    if not _column_exists("users", "totp_enabled"):
        op.add_column("users", sa.Column("totp_enabled", sa.Boolean, server_default="0", nullable=True))

    # ── audit_logs table ──────────────────────────────────────────────────
    if not _table_exists("audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id",         sa.Integer,  primary_key=True, autoincrement=True),
            sa.Column("admin_id",   sa.Integer,  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("action",     sa.String(100), nullable=False),
            sa.Column("target_id",  sa.Integer,  nullable=True),
            sa.Column("detail",     sa.Text,     nullable=True),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        )
        op.create_index("ix_audit_logs_id",        "audit_logs", ["id"])
        op.create_index("ix_audit_logs_admin_id",  "audit_logs", ["admin_id"])
        op.create_index("ix_audit_logs_created_at","audit_logs", ["created_at"])

    # ── broadcasts table ──────────────────────────────────────────────────
    if not _table_exists("broadcasts"):
        op.create_table(
            "broadcasts",
            sa.Column("id",         sa.Integer,  primary_key=True, autoincrement=True),
            sa.Column("title",      sa.String(200), nullable=False),
            sa.Column("body",       sa.Text,     nullable=False),
            sa.Column("target",     sa.String(20), server_default="all"),
            sa.Column("sent_by_id", sa.Integer,  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        )
        op.create_index("ix_broadcasts_id",        "broadcasts", ["id"])
        op.create_index("ix_broadcasts_created_at","broadcasts", ["created_at"])


def downgrade() -> None:
    # Remove in reverse order
    for idx in ["ix_broadcasts_created_at", "ix_broadcasts_id"]:
        try:
            op.drop_index(idx, table_name="broadcasts")
        except Exception:
            pass
    try:
        op.drop_table("broadcasts")
    except Exception:
        pass

    for idx in ["ix_audit_logs_created_at", "ix_audit_logs_admin_id", "ix_audit_logs_id"]:
        try:
            op.drop_index(idx, table_name="audit_logs")
        except Exception:
            pass
    try:
        op.drop_table("audit_logs")
    except Exception:
        pass

    for col in ["totp_enabled", "totp_secret", "stripe_customer_id", "plan_expires_at", "plan"]:
        try:
            op.drop_column("users", col)
        except Exception:
            pass
