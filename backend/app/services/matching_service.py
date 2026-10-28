"""Use cases: load profiles through the repositories, then rank with the pure domain policy."""

from dataclasses import dataclass

from app.db.connection import Connection
from app.domain.matching import rank_candidates_for_job, rank_jobs_for_candidate
from app.domain.models import CandidateProfile, JobProfile, MatchResult
from app.repositories import candidates as candidates_repo
from app.repositories import jobs as jobs_repo


class NotFoundError(Exception):
    """Raised when a requested candidate or job does not exist."""


@dataclass(frozen=True)
class JobMatches:
    job: JobProfile
    matches: list[MatchResult]


@dataclass(frozen=True)
class CandidateMatches:
    candidate: CandidateProfile
    matches: list[MatchResult]


def matches_for_job(conn: Connection, job_id: int) -> JobMatches:
    job = jobs_repo.get_job_profile(conn, job_id)
    if job is None:
        raise NotFoundError(f"Job {job_id} not found")
    candidates = candidates_repo.list_candidate_profiles(conn)
    return JobMatches(job=job, matches=rank_candidates_for_job(job, candidates))


def matches_for_candidate(conn: Connection, candidate_id: int) -> CandidateMatches:
    candidate = candidates_repo.get_candidate_profile(conn, candidate_id)
    if candidate is None:
        raise NotFoundError(f"Candidate {candidate_id} not found")
    jobs = jobs_repo.list_job_profiles(conn)
    return CandidateMatches(candidate=candidate, matches=rank_jobs_for_candidate(candidate, jobs))
