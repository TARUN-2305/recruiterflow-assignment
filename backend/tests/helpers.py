"""Test helpers: turn the seed file into domain profiles without a database."""

from app.domain.models import CandidateProfile, JobProfile
from scripts.seed import SeedData


def seed_profiles(data: SeedData) -> tuple[list[CandidateProfile], list[JobProfile]]:
    candidates = [
        CandidateProfile(
            c.id,
            c.name,
            c.years_experience,
            c.availability,
            tuple(c.skills),
            tuple(c.traits),
            c.quirk,
        )
        for c in data.candidates
    ]
    jobs = [
        JobProfile(
            j.id,
            j.title,
            j.min_experience,
            tuple(j.required_skills),
            tuple(j.culture_keywords),
            j.tagline,
        )
        for j in data.jobs
    ]
    return candidates, jobs
