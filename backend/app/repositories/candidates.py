"""Hand-written SQL for reading candidate profiles."""

from typing import Any

from app.db.connection import Connection
from app.domain.models import CandidateProfile

# Correlated ARRAY(...) subqueries collect skills and traits in source order. Joining both
# junction tables directly would multiply rows (skills x traits) per candidate.
_SELECT_CANDIDATE_PROFILE = """
    SELECT c.id,
           c.name,
           c.years_experience,
           c.availability,
           ARRAY(SELECT s.name
                   FROM candidate_skills cs
                   JOIN skills s ON s.id = cs.skill_id
                  WHERE cs.candidate_id = c.id
                  ORDER BY cs.position) AS skills,
           ARRAY(SELECT t.name
                   FROM candidate_traits ct
                   JOIN tags t ON t.id = ct.tag_id
                  WHERE ct.candidate_id = c.id
                  ORDER BY ct.position) AS traits,
           c.quirk
      FROM candidates c
"""


def _to_profile(row: tuple[Any, ...]) -> CandidateProfile:
    id_, name, years, availability, skills, traits, quirk = row
    return CandidateProfile(
        id=id_,
        name=name,
        years_experience=years,
        availability=availability,
        skills=tuple(skills),
        traits=tuple(traits),
        quirk=quirk,
    )


def get_candidate_profile(conn: Connection, candidate_id: int) -> CandidateProfile | None:
    row = conn.execute(_SELECT_CANDIDATE_PROFILE + " WHERE c.id = %s", (candidate_id,)).fetchone()
    return _to_profile(row) if row else None


def list_candidate_profiles(conn: Connection) -> list[CandidateProfile]:
    rows = conn.execute(_SELECT_CANDIDATE_PROFILE + " ORDER BY c.id").fetchall()
    return [_to_profile(row) for row in rows]
