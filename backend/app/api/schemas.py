"""Response DTOs. Scores are rounded half-up to 1 decimal here, and only here."""

from fractions import Fraction

from pydantic import BaseModel

from app.domain.matching import (
    AVAILABILITY_WEIGHT,
    CULTURE_WEIGHT,
    EXPERIENCE_WEIGHT,
    SKILL_WEIGHT,
    round_half_up,
)
from app.domain.models import Availability, CandidateProfile, JobProfile, MatchResult


class CandidateSummary(BaseModel):
    id: int
    name: str
    years_experience: int
    availability: Availability
    skills: list[str]
    traits: list[str]


class JobSummary(BaseModel):
    id: int
    title: str
    min_experience: int
    required_skills: list[str]
    culture_keywords: list[str]


class SkillsBreakdown(BaseModel):
    points: float
    max: int
    matched: list[str]
    missing: list[str]


class ExperienceBreakdown(BaseModel):
    points: float
    max: int
    years: int
    required: int


class CultureBreakdown(BaseModel):
    points: float
    max: int
    matched: list[str]


class AvailabilityBreakdown(BaseModel):
    points: float
    max: int
    value: Availability


class ScoreBreakdown(BaseModel):
    skills: SkillsBreakdown
    experience: ExperienceBreakdown
    culture: CultureBreakdown
    availability: AvailabilityBreakdown


class CandidateMatch(BaseModel):
    rank: int
    candidate: CandidateSummary
    score: float
    reason: str
    breakdown: ScoreBreakdown


class JobMatch(BaseModel):
    rank: int
    job: JobSummary
    score: float
    reason: str
    breakdown: ScoreBreakdown


class JobMatchesResponse(BaseModel):
    job: JobSummary
    matches: list[CandidateMatch]


class CandidateMatchesResponse(BaseModel):
    candidate: CandidateSummary
    matches: list[JobMatch]


def candidate_summary(c: CandidateProfile) -> CandidateSummary:
    return CandidateSummary(
        id=c.id,
        name=c.name,
        years_experience=c.years_experience,
        availability=c.availability,
        skills=list(c.skills),
        traits=list(c.traits),
    )


def job_summary(j: JobProfile) -> JobSummary:
    return JobSummary(
        id=j.id,
        title=j.title,
        min_experience=j.min_experience,
        required_skills=list(j.required_skills),
        culture_keywords=list(j.culture_keywords),
    )


def breakdown(r: MatchResult) -> ScoreBreakdown:
    # When the relevance gate applies (no skill matched), every component counts 0 points.
    gated = not r.matched_skills

    def points(weight: int, fraction: Fraction) -> float:
        if gated:
            return 0.0
        return float(round_half_up(weight * fraction))

    return ScoreBreakdown(
        skills=SkillsBreakdown(
            points=points(SKILL_WEIGHT, r.skill_fraction),
            max=SKILL_WEIGHT,
            matched=list(r.matched_skills),
            missing=list(r.missing_skills),
        ),
        experience=ExperienceBreakdown(
            points=points(EXPERIENCE_WEIGHT, r.experience_fraction),
            max=EXPERIENCE_WEIGHT,
            years=r.candidate.years_experience,
            required=r.job.min_experience,
        ),
        culture=CultureBreakdown(
            points=points(CULTURE_WEIGHT, r.culture_fraction),
            max=CULTURE_WEIGHT,
            matched=list(r.matched_keywords),
        ),
        availability=AvailabilityBreakdown(
            points=points(AVAILABILITY_WEIGHT, r.availability_fraction),
            max=AVAILABILITY_WEIGHT,
            value=r.candidate.availability,
        ),
    )


def display_score(r: MatchResult) -> float:
    return float(round_half_up(r.score))
