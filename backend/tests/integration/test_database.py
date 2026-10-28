"""Schema, migrations and seeding against real PostgreSQL."""

import psycopg
import pytest

from app.db.connection import Connection
from scripts.migrate import apply_migrations
from scripts.seed import load_seed, seed

COUNT_ROWS = """
    SELECT (SELECT count(*) FROM candidates),
           (SELECT count(*) FROM jobs),
           (SELECT count(*) FROM skills),
           (SELECT count(*) FROM tags),
           (SELECT count(*) FROM candidate_skills),
           (SELECT count(*) FROM job_required_skills),
           (SELECT count(*) FROM candidate_traits),
           (SELECT count(*) FROM job_culture_keywords)
"""


def test_seed_loads_exact_counts(conn: Connection) -> None:
    assert conn.execute(COUNT_ROWS).fetchone() == (15, 6, 27, 32, 50, 16, 30, 12)


def test_seeding_again_changes_nothing(conn: Connection) -> None:
    before = conn.execute(COUNT_ROWS).fetchone()
    snapshot = "SELECT id, name, years_experience, availability, quirk FROM candidates ORDER BY id"
    rows_before = conn.execute(snapshot).fetchall()

    seed(conn, load_seed())
    seed(conn, load_seed())

    assert conn.execute(COUNT_ROWS).fetchone() == before
    assert conn.execute(snapshot).fetchall() == rows_before


def test_migrations_are_not_reapplied(conn: Connection) -> None:
    assert apply_migrations(conn) == []


def test_source_text_round_trips_exactly(conn: Connection) -> None:
    row = conn.execute("SELECT tagline FROM jobs WHERE id = %s", (2,)).fetchone()
    assert row == ("Ship first, document never (kidding — please document).",)
    row = conn.execute("SELECT quirk FROM candidates WHERE name = %s", ("Michael S.",)).fetchone()
    assert row == ("World's best boss, according to a mug he bought himself.",)


def test_skill_order_is_preserved(conn: Connection) -> None:
    rows = conn.execute(
        """
        SELECT s.name FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id
         WHERE cs.candidate_id = %s ORDER BY cs.position
        """,
        (8,),
    ).fetchall()
    assert [r[0] for r in rows] == [
        "rapid-prototyping",
        "resourcefulness",
        "chemistry",
        "systems-design",
    ]


def test_availability_check_constraint_rejects_unknown_values(conn: Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation), conn.transaction():
        conn.execute(
            "INSERT INTO candidates (id, name, years_experience, availability, quirk) "
            "VALUES (%s, %s, %s, %s, %s)",
            (999, "Test Person", 1, "Someday", ""),
        )


def test_failed_seed_rolls_back_completely(conn: Connection) -> None:
    data = load_seed()
    broken = data.model_copy(
        update={"candidates": [*data.candidates, data.candidates[0].model_copy(update={"id": 99})]}
    )  # duplicate name violates UNIQUE(name) part-way through
    before = conn.execute(COUNT_ROWS).fetchone()
    with pytest.raises(psycopg.errors.UniqueViolation):
        seed(conn, broken)
    assert conn.execute(COUNT_ROWS).fetchone() == before
