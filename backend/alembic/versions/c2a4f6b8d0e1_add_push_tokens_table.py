"""add push_tokens table and cv_event thumbnail

Revision ID: c2a4f6b8d0e1
Revises: b1f3e2d4c5a6
Create Date: 2026-05-31 00:01:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c2a4f6b8d0e1'
down_revision = 'b1f3e2d4c5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Push notification tokens
    op.create_table(
        'push_tokens',
        sa.Column('id',         sa.Integer(),     primary_key=True),
        sa.Column('user_id',    sa.Integer(),     sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token',      sa.String(512),   nullable=False),
        sa.Column('platform',   sa.String(20),    nullable=True),
        sa.Column('created_at', sa.DateTime(),    server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('user_id', 'token', name='uq_push_token'),
    )

    # CV events: add thumbnail_url if not exists
    with op.batch_alter_table('cv_events') as batch_op:
        try:
            batch_op.add_column(sa.Column('thumbnail_url', sa.Text(), nullable=True))
        except Exception:
            pass  # already exists in some deployments


def downgrade() -> None:
    op.drop_table('push_tokens')
    with op.batch_alter_table('cv_events') as batch_op:
        try:
            batch_op.drop_column('thumbnail_url')
        except Exception:
            pass
