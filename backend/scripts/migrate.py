"""Apply hand-written SQL migrations in filename order.

Usage (from backend/): python -m scripts.migrate
Each file runs in its own transaction together with its schema_migrations record,
so a failing migration leaves no partial schema behind.
"""

from pathlib import Path

from app.config import database_url
from app.db.connection import Connection, connect

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def apply_migrations(conn: Connection, migrations_dir: Path = MIGRATIONS_DIR) -> list[str]:
    """Apply pending migrations; return the filenames applied this run."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version    TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    applied = {row[0] for row in conn.execute("SELECT version FROM schema_migrations")}

    newly_applied: list[str] = []
    for path in sorted(migrations_dir.glob("*.sql")):
        if path.name in applied:
            continue
        with conn.transaction():
            # A migration file is trusted, hand-written DDL from this repository.
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (path.name,))
        newly_applied.append(path.name)
    return newly_applied


def main() -> None:
    with connect(database_url()) as conn:
        applied = apply_migrations(conn)
    print(f"Applied: {', '.join(applied)}" if applied else "No pending migrations.")


if __name__ == "__main__":
    main()
