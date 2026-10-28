"""SQL Detective: load the supplied dataset unchanged and check every answer's exact result."""

from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from typing import Any

import pytest

from app.db.connection import connect
from scripts.load_sql_detective import SQL_DIR, answers, load_dataset, split_questions

SCHEMA = "sql_detective_test"


@pytest.fixture(scope="module")
def results(db_url: str) -> Iterator[dict[str, tuple[list[str], list[tuple[Any, ...]]]]]:
    # A dedicated schema inside the test database keeps these tables apart from the bot's.
    with connect(db_url) as conn:
        conn.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")  # noqa: S608 (constant name)
        conn.execute(f"CREATE SCHEMA {SCHEMA}")
        conn.execute(f"SET search_path TO {SCHEMA}")
        counts = load_dataset(conn)
        assert counts == {"recruiters": 5, "job_postings": 7, "applicants": 11, "interviews": 24}
        yield answers(conn)
        conn.execute(f"DROP SCHEMA {SCHEMA} CASCADE")


def column(result: tuple[list[str], list[tuple[Any, ...]]], *names: str) -> list[tuple[Any, ...]]:
    columns, rows = result
    idx = [columns.index(n) for n in names]
    return [tuple(row[i] for i in idx) for row in rows]


def test_file_has_one_labelled_query_per_question() -> None:
    questions = split_questions((SQL_DIR / "sql_detective.sql").read_text(encoding="utf-8"))
    assert list(questions) == ["Q1", "Q2", "Q3", "Q4", "Q5"]
    for text in questions.values():
        assert text.startswith("-- Q")  # each query is preceded by its question-number comment
        code = "\n".join(line.split("--")[0] for line in text.splitlines()).strip()
        assert code.endswith(";") and code.count(";") == 1  # exactly one statement


def test_supplied_schema_is_unchanged_and_clean() -> None:
    schema = (SQL_DIR / "schema.sql").read_text(encoding="utf-8")
    seed = (SQL_DIR / "seed.sql").read_text(encoding="utf-8")
    assert "REFERENCES" not in schema and "FOREIGN KEY" not in schema  # no keys were added
    assert "​" not in schema + seed  # the PDF's zero-width spaces were not copied


def test_q1_open_postings_with_recruiter(results: Any) -> None:
    assert column(results["Q1"], "job_posting_id", "title", "recruiter_name", "opened_date") == [
        (1, "Backend Engineer I", "Priya Shah", date(2026, 1, 5)),
        (2, "Backend Engineer I", "Daniel Ortiz", date(2026, 1, 10)),
        (4, "Backend Engineer II", "Priya Shah", date(2026, 2, 1)),
        (5, "DevOps Engineer", "Wei Zhang", date(2026, 1, 20)),
    ]


def test_q2_applicants_reaching_final_per_posting(results: Any) -> None:
    assert column(results["Q2"], "job_posting_id", "applicants_reached_final") == [
        (1, 2), (2, 2), (3, 1), (4, 2), (5, 0), (6, 0), (7, 2),
    ]  # fmt: skip


def test_q3_people_with_more_than_one_posting(results: Any) -> None:
    assert column(
        results["Q3"], "full_name", "applicant_records", "postings_applied_to", "job_posting_ids"
    ) == [
        ("Ananya Rao", 2, 2, "1, 4"),  # two applicant rows, emails differ only in case
        ("Ben Turner", 1, 2, "1, 3"),
        ("Elena Popescu", 1, 2, "2, 7"),
    ]


def test_q4_final_conversion_for_recruiters_with_three_or_more(results: Any) -> None:
    assert column(
        results["Q4"], "recruiter_name", "final_passed", "final_interviews", "conversion_rate_pct"
    ) == [
        ("Priya Shah", 3, 4, Decimal("75.00")),
        ("Daniel Ortiz", 2, 4, Decimal("50.00")),
    ]


def test_q5_top_recruiter_per_department(results: Any) -> None:
    assert column(results["Q5"], "department", "recruiter_name", "placements") == [
        ("Data", "Fatima Al-Sayed", 1),
        ("Engineering", "Priya Shah", 3),
    ]


def test_q5_keeps_ties(db_url: str, results: Any) -> None:  # `results` creates the schema
    # Add one extra Engineering placement for Daniel Ortiz so he ties Priya Shah at 3.
    with connect(db_url) as conn:
        conn.execute(f"SET search_path TO {SCHEMA}")
        load_dataset(conn)
        conn.execute(
            "INSERT INTO interviews VALUES (%s, %s, %s, %s, %s, %s)",
            (25, 5, 2, "Final", date(2026, 2, 25), "passed"),
        )
        q5 = answers(conn)["Q5"]
        load_dataset(conn)  # restore the supplied data
    assert column(q5, "department", "recruiter_name", "placements") == [
        ("Data", "Fatima Al-Sayed", 1),
        ("Engineering", "Daniel Ortiz", 3),
        ("Engineering", "Priya Shah", 3),
    ]
