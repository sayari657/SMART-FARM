"""Check the database configured for the FastAPI backend."""

import sys

from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import engine


def main() -> int:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            dialect = connection.dialect.name
            tables = inspect(connection).get_table_names()

            print(f"Connection successful ({dialect}).")
            print(f"Found {len(tables)} table(s).")

            if dialect == "postgresql":
                postgis = connection.execute(
                    text(
                        "SELECT extversion FROM pg_extension "
                        "WHERE extname = 'postgis'"
                    )
                ).scalar_one_or_none()
                print(f"PostGIS: {postgis or 'not enabled'}")

        return 0
    except SQLAlchemyError as exc:
        print(f"Database connection failed: {exc}", file=sys.stderr)
        return 1
    finally:
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
