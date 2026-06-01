"""add farm_id to bee_apiaries, warehouse_categories, bee_global_stock

Revision ID: d3e5f7a9b1c2
Revises: c2a4f6b8d0e1
Create Date: 2026-06-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'd3e5f7a9b1c2'
down_revision = 'c2a4f6b8d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add farm_id to bee_apiaries
    with op.batch_alter_table('bee_apiaries') as batch_op:
        batch_op.add_column(sa.Column('farm_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_bee_apiary_farm', 'farms', ['farm_id'], ['id'])
        batch_op.create_index('ix_bee_apiaries_farm_id', ['farm_id'])

    # Add farm_id to warehouse_categories
    with op.batch_alter_table('warehouse_categories') as batch_op:
        batch_op.add_column(sa.Column('farm_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_warehouse_cat_farm', 'farms', ['farm_id'], ['id'])
        batch_op.create_index('ix_warehouse_categories_farm_id', ['farm_id'])

    # Add farm_id to bee_global_stock (turns singleton into per-farm)
    with op.batch_alter_table('bee_global_stock') as batch_op:
        batch_op.add_column(sa.Column('farm_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_bee_global_stock_farm', 'farms', ['farm_id'], ['id'])
        batch_op.create_unique_constraint('uq_bee_global_stock_farm', ['farm_id'])
        batch_op.create_index('ix_bee_global_stock_farm_id', ['farm_id'])


def downgrade() -> None:
    with op.batch_alter_table('bee_global_stock') as batch_op:
        batch_op.drop_index('ix_bee_global_stock_farm_id')
        batch_op.drop_constraint('uq_bee_global_stock_farm', type_='unique')
        batch_op.drop_constraint('fk_bee_global_stock_farm', type_='foreignkey')
        batch_op.drop_column('farm_id')

    with op.batch_alter_table('warehouse_categories') as batch_op:
        batch_op.drop_index('ix_warehouse_categories_farm_id')
        batch_op.drop_constraint('fk_warehouse_cat_farm', type_='foreignkey')
        batch_op.drop_column('farm_id')

    with op.batch_alter_table('bee_apiaries') as batch_op:
        batch_op.drop_index('ix_bee_apiaries_farm_id')
        batch_op.drop_constraint('fk_bee_apiary_farm', type_='foreignkey')
        batch_op.drop_column('farm_id')
