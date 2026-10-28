"""HTTP routes. No SQL here: routes call the service layer and map results to DTOs."""

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path
from fastapi.responses import JSONResponse

from app.api.schemas import (
    CandidateMatch,
    CandidateMatchesResponse,
    JobMatch,
    JobMatchesResponse,
    breakdown,
    candidate_summary,
    display_score,
    job_summary,
)
from app.db.connection import Connection, connect, get_connection, get_database_url
from app.services import matching_service

logger = logging.getLogger(__name__)
router = APIRouter()

DbConnection = Annotated[Connection, Depends(get_connection)]
PositiveId = Annotated[int, Path(ge=1)]

NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {
        "description": "Unknown id",
        "content": {"application/json": {"example": {"detail": "Job 99 not found"}}},
    }
}


@router.get("/jobs/{job_id}/matches", response_model=JobMatchesResponse, responses=NOT_FOUND)
def get_job_matches(job_id: PositiveId, conn: DbConnection) -> JobMatchesResponse:
    """Every candidate, ranked for this job (best first)."""
    result = matching_service.matches_for_job(conn, job_id)
    return JobMatchesResponse(
        job=job_summary(result.job),
        matches=[
            CandidateMatch(
                rank=rank,
                candidate=candidate_summary(r.candidate),
                score=display_score(r),
                reason=r.reason,
                breakdown=breakdown(r),
            )
            for rank, r in enumerate(result.matches, start=1)
        ],
    )


@router.get(
    "/candidates/{candidate_id}/matches",
    response_model=CandidateMatchesResponse,
    responses=NOT_FOUND,
)
def get_candidate_matches(candidate_id: PositiveId, conn: DbConnection) -> CandidateMatchesResponse:
    """Every job, ranked for this candidate (best first)."""
    result = matching_service.matches_for_candidate(conn, candidate_id)
    return CandidateMatchesResponse(
        candidate=candidate_summary(result.candidate),
        matches=[
            JobMatch(
                rank=rank,
                job=job_summary(r.job),
                score=display_score(r),
                reason=r.reason,
                breakdown=breakdown(r),
            )
            for rank, r in enumerate(result.matches, start=1)
        ],
    )


@router.get("/health")
def health(url: Annotated[str, Depends(get_database_url)]) -> JSONResponse:
    """Liveness plus a database round-trip; 503 if the database is unreachable."""
    try:
        with connect(url) as conn:
            conn.execute("SELECT 1")
    except Exception:
        logger.warning("Health check: database unavailable", exc_info=True)
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return JSONResponse(content={"status": "ok"})
