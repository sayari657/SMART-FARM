-- Smart Farm AI - PostgreSQL initialization.
-- Docker runs this file only when the PostgreSQL data volume is first created.
-- Application tables are created by SQLAlchemy/Alembic after PostgreSQL is ready.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
