"""add refresh_token_hash to users

Revision ID: b1f3e2d4c5a6
Revises: 022cb45ad724
Create Date: 2026-05-31 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b1f3e2d4c5a6'
down_revision = '022cb45ad724'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('refresh_token_hash', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'refresh_token_hash')
