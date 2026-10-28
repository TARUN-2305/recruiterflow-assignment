"""Load the SQL Detective dataset unchanged, then run and print the answers in sql_detective.sql.

Usage (from backend/): python -m scripts.load_sql_detective
Uses SQL_DETECTIVE_DATABASE_URL (a separate database from the Recruiter Bot). Re-runnable:
the four supplied tables are dropped and reloaded from schema.sql and seed.sql each time.
"""

import re
from pathlib import Path
from typing import Any

from app.config import require_env
from app.db.connection import Connection, connect

SQL_DIR = Path(__file__).resolve().parent.parent / "sql_detective"
TABLES = ("recruiters", "job_postings", "applicants", "interviews")
_QUESTION_MARKER = re.compile(r"^-- (Q\d+)\b", re.MULTILINE)


def load_dataset(conn: Connection) -> dict[str, int]:
    """(Re)create the supplied tables from the verbatim files; return row counts per table."""
    with conn.transaction():
        conn.execute("DROP TABLE IF EXISTS interviews, applicants, job_postings, recruiters")
        conn.execute((SQL_DIR / "schema.sql").read_text(encoding="utf-8"))
        conn.execute((SQL_DIR / "seed.sql").read_text(encoding="utf-8"))
    counts: dict[str, int] = {}
    for table, query in (
        ("recruiters", "SELECT count(*) FROM recruiters"),
        ("job_postings", "SELECT count(*) FROM job_postings"),
        ("applicants", "SELECT count(*) FROM applicants"),
        ("interviews", "SELECT count(*) FROM interviews"),
    ):
        row = conn.execute(query).fetchone()
        counts[table] = row[0] if row else 0
    return counts


def split_questions(sql_text: str) -> dict[str, str]:
    """Split sql_detective.sql into {"Q1": "<comment + query>", ...} using the '-- Qn' markers."""
    markers = list(_QUESTION_MARKER.finditer(sql_text))
    return {
        m.group(1): sql_text[
            m.start() : markers[n + 1].start() if n + 1 < len(markers) else None
        ].strip()
        for n, m in enumerate(markers)
    }


def run_question(conn: Connection, query: str) -> tuple[list[str], list[tuple[Any, ...]]]:
    cursor = conn.execute(query)
    columns = [col.name for col in cursor.description or []]
    return columns, cursor.fetchall()


def answers(conn: Connection) -> dict[str, tuple[list[str], list[tuple[Any, ...]]]]:
    questions = split_questions((SQL_DIR / "sql_detective.sql").read_text(encoding="utf-8"))
    return {q: run_question(conn, query) for q, query in questions.items()}


def _print_table(columns: list[str], rows: list[tuple[Any, ...]]) -> None:
    cells = [columns, *[["" if v is None else str(v) for v in row] for row in rows]]
    widths = [max(len(r[i]) for r in cells) for i in range(len(columns))]
    for n, row in enumerate(cells):
        print("  " + " | ".join(v.ljust(w) for v, w in zip(row, widths, strict=True)))
        if n == 0:
            print("  " + "-+-".join("-" * w for w in widths))


def main() -> None:
    with connect(require_env("SQL_DETECTIVE_DATABASE_URL")) as conn:
        counts = load_dataset(conn)
        print("Loaded: " + ", ".join(f"{t} {counts[t]}" for t in TABLES))
        for question, (columns, rows) in answers(conn).items():
            print(f"\n{question} ({len(rows)} rows)")
            _print_table(columns, rows)


if __name__ == "__main__":
    main()
