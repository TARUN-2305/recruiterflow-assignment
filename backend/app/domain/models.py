"""Domain models. Plain frozen dataclasses: no database or HTTP concerns."""

from dataclasses import dataclass
from fractions import Fraction
from typing import Literal

Availability = Literal["Immediate", "2 weeks", "Not looking"]


@dataclass(frozen=True)
class CandidateProfile:
    id: int
    name: str
    years_experience: int
    availability: Availability
    skills: tuple[str, ...]
    traits: tuple[str, ...]
    quirk: str


@dataclass(frozen=True)
class JobProfile:
    id: int
    title: str
    min_experience: int
    required_skills: tuple[str, ...]
    culture_keywords: tuple[str, ...]
    tagline: str


@dataclass(frozen=True)
class MatchResult:
    """One scored candidate-job pair. Fractions are exact; rounding happens only for display."""

    candidate: CandidateProfile
    job: JobProfile
    score: Fraction
    skill_fraction: Fraction
    experience_fraction: Fraction
    culture_fraction: Fraction
    availability_fraction: Fraction
    matched_skills: tuple[str, ...]
    missing_skills: tuple[str, ...]
    matched_keywords: tuple[str, ...]
    reason: str
