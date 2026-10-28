"""Matching policy: one pure scoring function used by both match directions (see ADR-003).

Score (0-100) = 50 x skill coverage + 30 x experience fit
              + 10 x culture overlap + 10 x availability,
except that a pair with no required skill in common scores 0 (it is still listed, ranked last).
All arithmetic uses exact Fractions; only the API layer rounds for display.
"""

from collections.abc import Iterable
from decimal import Decimal
from fractions import Fraction
from math import floor

from app.domain.models import Availability, CandidateProfile, JobProfile, MatchResult

SKILL_WEIGHT = 50
EXPERIENCE_WEIGHT = 30
CULTURE_WEIGHT = 10
AVAILABILITY_WEIGHT = 10

# "Not looking" is penalised, never filtered out: a recruiter may still want to reach out.
AVAILABILITY_FRACTION: dict[Availability, Fraction] = {
    "Immediate": Fraction(1),
    "2 weeks": Fraction(1, 2),
    "Not looking": Fraction(0),
}

AVAILABILITY_PHRASE: dict[Availability, str] = {
    "Immediate": "Available immediately.",
    "2 weeks": "Available in 2 weeks.",
    "Not looking": "Not currently looking.",
}


def _normalise(label: str) -> str:
    return label.strip().casefold()


def _overlap(
    wanted: tuple[str, ...], offered: tuple[str, ...]
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Split `wanted` (in its own order) into (present in offered, absent). Exact labels only."""
    offered_keys = {_normalise(label) for label in offered}
    present = tuple(label for label in wanted if _normalise(label) in offered_keys)
    absent = tuple(label for label in wanted if _normalise(label) not in offered_keys)
    return present, absent


def experience_fraction(years: int, minimum: int) -> Fraction:
    """1 at or above the minimum; linear partial credit below it (no over-qualification penalty)."""
    if minimum <= 0 or years >= minimum:
        return Fraction(1)
    return Fraction(max(years, 0), minimum)


def _years(n: int) -> str:
    return f"{n} yr" if n == 1 else f"{n} yrs"


def build_reason(
    candidate: CandidateProfile,
    job: JobProfile,
    matched_skills: tuple[str, ...],
    missing_skills: tuple[str, ...],
    matched_keywords: tuple[str, ...],
) -> str:
    """Short explanation built only from the data that produced the score."""
    total = len(job.required_skills)
    if not matched_skills:
        return f"No required skills matched (0/{total})."

    skills = f"Matches {len(matched_skills)}/{total} required skills ({', '.join(matched_skills)})"
    if missing_skills:
        skills += f"; missing {', '.join(missing_skills)}"
    parts = [skills + "."]

    years, minimum = candidate.years_experience, job.min_experience
    if years >= minimum:
        parts.append(f"{_years(years)} experience (min {minimum}).")
    else:
        parts.append(f"{_years(years)} experience, below the {minimum}-yr minimum.")

    parts.append(AVAILABILITY_PHRASE[candidate.availability])

    if matched_keywords:
        parts.append(f"Culture overlap: {', '.join(matched_keywords)}.")
    elif job.culture_keywords:
        parts.append(f"No culture keyword overlap ({', '.join(job.culture_keywords)}).")
    return " ".join(parts)


def score_pair(candidate: CandidateProfile, job: JobProfile) -> MatchResult:
    matched_skills, missing_skills = _overlap(job.required_skills, candidate.skills)
    matched_keywords, _ = _overlap(job.culture_keywords, candidate.traits)

    skill = (
        Fraction(len(matched_skills), len(job.required_skills))
        if job.required_skills
        else Fraction(0)
    )
    experience = experience_fraction(candidate.years_experience, job.min_experience)
    culture = (
        Fraction(len(matched_keywords), len(job.culture_keywords))
        if job.culture_keywords
        else Fraction(0)
    )
    availability = AVAILABILITY_FRACTION[candidate.availability]

    if matched_skills:
        score = (
            SKILL_WEIGHT * skill
            + EXPERIENCE_WEIGHT * experience
            + CULTURE_WEIGHT * culture
            + AVAILABILITY_WEIGHT * availability
        )
    else:
        # Relevance gate: experience in unrelated work should not make a pair look like a match.
        score = Fraction(0)

    return MatchResult(
        candidate=candidate,
        job=job,
        score=score,
        skill_fraction=skill,
        experience_fraction=experience,
        culture_fraction=culture,
        availability_fraction=availability,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        matched_keywords=matched_keywords,
        reason=build_reason(candidate, job, matched_skills, missing_skills, matched_keywords),
    )


def rank_key(
    result: MatchResult, display_name: str, entity_id: int
) -> tuple[Fraction, Fraction, Fraction, str, int]:
    """Shared ordering: score, then skill coverage, then experience fit (all descending),
    then display name and id (ascending) so the order is always deterministic."""
    return (
        -result.score,
        -result.skill_fraction,
        -result.experience_fraction,
        display_name.casefold(),
        entity_id,
    )


def rank_candidates_for_job(
    job: JobProfile, candidates: Iterable[CandidateProfile]
) -> list[MatchResult]:
    results = [score_pair(candidate, job) for candidate in candidates]
    return sorted(results, key=lambda r: rank_key(r, r.candidate.name, r.candidate.id))


def rank_jobs_for_candidate(
    candidate: CandidateProfile, jobs: Iterable[JobProfile]
) -> list[MatchResult]:
    results = [score_pair(candidate, job) for job in jobs]
    return sorted(results, key=lambda r: rank_key(r, r.job.title, r.job.id))


def round_half_up(value: Fraction, places: int = 1) -> Decimal:
    """Round an exact Fraction half-up (73.25 -> 73.3), avoiding float and banker's rounding."""
    scale = 10**places
    return Decimal(floor(value * scale + Fraction(1, 2))).scaleb(-places)
