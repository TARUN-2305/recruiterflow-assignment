"""Hand-written SQL for reading job profiles."""

from typing import Any

from app.db.connection import Connection
from app.domain.models import JobProfile

# Same pattern as candidates: one row per job, junction rows gathered in source order.
_SELECT_JOB_PROFILE = """
    SELECT j.id,
           j.title,
           j.min_experience,
           ARRAY(SELECT s.name
                   FROM job_required_skills js
                   JOIN skills s ON s.id = js.skill_id
                  WHERE js.job_id = j.id
                  ORDER BY js.position) AS required_skills,
           ARRAY(SELECT t.name
                   FROM job_culture_keywords jk
                   JOIN tags t ON t.id = jk.tag_id
                  WHERE jk.job_id = j.id
                  ORDER BY jk.position) AS culture_keywords,
           j.tagline
      FROM jobs j
"""


def _to_profile(row: tuple[Any, ...]) -> JobProfile:
    id_, title, min_experience, required_skills, culture_keywords, tagline = row
    return JobProfile(
        id=id_,
        title=title,
        min_experience=min_experience,
        required_skills=tuple(required_skills),
        culture_keywords=tuple(culture_keywords),
        tagline=tagline,
    )


def get_job_profile(conn: Connection, job_id: int) -> JobProfile | None:
    row = conn.execute(_SELECT_JOB_PROFILE + " WHERE j.id = %s", (job_id,)).fetchone()
    return _to_profile(row) if row else None


def list_job_profiles(conn: Connection) -> list[JobProfile]:
    rows = conn.execute(_SELECT_JOB_PROFILE + " ORDER BY j.id").fetchall()
    return [_to_profile(row) for row in rows]
