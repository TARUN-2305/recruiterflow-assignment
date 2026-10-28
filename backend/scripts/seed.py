"""Load the 15 candidates and 6 jobs from seed/recruiter_bot_seed.json.

Usage (from backend/): python -m scripts.seed
Idempotent: rows are upserted by their explicit id and each entity's junction rows are
replaced, all inside one transaction. Running it twice leaves identical data.
"""

import json
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.config import database_url
from app.db.connection import Connection, connect
from app.domain.models import Availability

SEED_FILE = Path(__file__).resolve().parent.parent / "seed" / "recruiter_bot_seed.json"


def _check_labels(labels: list[str]) -> list[str]:
    # Source labels are already trimmed and lower-case; reject rather than silently rewrite them.
    for label in labels:
        if not label or label != label.strip().lower():
            raise ValueError(f"label {label!r} is not normalised (trimmed, lower-case)")
    if len(set(labels)) != len(labels):
        raise ValueError(f"duplicate labels in {labels}")
    return labels


class SeedCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: int = Field(ge=1)
    name: str = Field(min_length=1)
    skills: list[str] = Field(min_length=1)
    years_experience: int = Field(ge=0)
    availability: Availability
    traits: list[str]
    quirk: str

    _labels = field_validator("skills", "traits")(_check_labels)


class SeedJob(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: int = Field(ge=1)
    title: str = Field(min_length=1)
    required_skills: list[str] = Field(min_length=1)
    min_experience: int = Field(ge=0)
    culture_keywords: list[str]
    tagline: str

    _labels = field_validator("required_skills", "culture_keywords")(_check_labels)


class SeedData(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    source: str
    candidates: list[SeedCandidate]
    jobs: list[SeedJob]

    @model_validator(mode="after")
    def unique_ids(self) -> "SeedData":
        for kind, ids in (
            ("candidate", [c.id for c in self.candidates]),
            ("job", [j.id for j in self.jobs]),
        ):
            if len(set(ids)) != len(ids):
                raise ValueError(f"duplicate {kind} ids")
        return self


@dataclass(frozen=True)
class SeedCounts:
    candidates: int
    jobs: int


def load_seed(path: Path = SEED_FILE) -> SeedData:
    return SeedData.model_validate(json.loads(path.read_text(encoding="utf-8")))


def _insert_labels(conn: Connection, table_sql: str, labels: set[str]) -> None:
    for label in sorted(labels):
        conn.execute(table_sql, (label,))


def _replace_links(
    conn: Connection, delete_sql: str, insert_sql: str, owner_id: int, labels: Sequence[str]
) -> None:
    conn.execute(delete_sql, (owner_id,))
    for position, label in enumerate(labels, start=1):
        conn.execute(insert_sql, (owner_id, position, label))


def seed(conn: Connection, data: SeedData) -> SeedCounts:
    with conn.transaction():
        _insert_labels(
            conn,
            "INSERT INTO skills (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            {s for c in data.candidates for s in c.skills}
            | {s for j in data.jobs for s in j.required_skills},
        )
        _insert_labels(
            conn,
            "INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            {t for c in data.candidates for t in c.traits}
            | {k for j in data.jobs for k in j.culture_keywords},
        )

        for c in data.candidates:
            conn.execute(
                """
                INSERT INTO candidates (id, name, years_experience, availability, quirk)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    years_experience = EXCLUDED.years_experience,
                    availability = EXCLUDED.availability,
                    quirk = EXCLUDED.quirk
                """,
                (c.id, c.name, c.years_experience, c.availability, c.quirk),
            )
            _replace_links(
                conn,
                "DELETE FROM candidate_skills WHERE candidate_id = %s",
                """
                INSERT INTO candidate_skills (candidate_id, position, skill_id)
                SELECT %s, %s, id FROM skills WHERE name = %s
                """,
                c.id,
                c.skills,
            )
            _replace_links(
                conn,
                "DELETE FROM candidate_traits WHERE candidate_id = %s",
                """
                INSERT INTO candidate_traits (candidate_id, position, tag_id)
                SELECT %s, %s, id FROM tags WHERE name = %s
                """,
                c.id,
                c.traits,
            )

        for j in data.jobs:
            conn.execute(
                """
                INSERT INTO jobs (id, title, min_experience, tagline)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    min_experience = EXCLUDED.min_experience,
                    tagline = EXCLUDED.tagline
                """,
                (j.id, j.title, j.min_experience, j.tagline),
            )
            _replace_links(
                conn,
                "DELETE FROM job_required_skills WHERE job_id = %s",
                """
                INSERT INTO job_required_skills (job_id, position, skill_id)
                SELECT %s, %s, id FROM skills WHERE name = %s
                """,
                j.id,
                j.required_skills,
            )
            _replace_links(
                conn,
                "DELETE FROM job_culture_keywords WHERE job_id = %s",
                """
                INSERT INTO job_culture_keywords (job_id, position, tag_id)
                SELECT %s, %s, id FROM tags WHERE name = %s
                """,
                j.id,
                j.culture_keywords,
            )

        row = conn.execute(
            "SELECT (SELECT count(*) FROM candidates), (SELECT count(*) FROM jobs)"
        ).fetchone()
        counts = SeedCounts(candidates=row[0], jobs=row[1]) if row else SeedCounts(0, 0)
        expected = SeedCounts(candidates=len(data.candidates), jobs=len(data.jobs))
        if counts != expected:
            # Raising inside the transaction block rolls everything back.
            raise RuntimeError(f"seed produced {counts}, expected {expected}")
    return counts


def main() -> None:
    data = load_seed()
    with connect(database_url()) as conn:
        counts = seed(conn, data)
    print(f"Seeded {counts.candidates} candidates and {counts.jobs} jobs.")


if __name__ == "__main__":
    main()
