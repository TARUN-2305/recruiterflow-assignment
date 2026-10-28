"""HTTP behaviour of the matching API against the seeded test database."""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.db.connection import get_connection
from app.main import create_app


def get_json(client: TestClient, path: str) -> Any:
    response = client.get(path)
    assert response.status_code == 200, response.text
    return response.json()


def test_job_matches_rank_every_candidate(client: TestClient) -> None:
    body = get_json(client, "/jobs/1/matches")
    assert body["job"]["title"] == "Backend Detective"
    matches = body["matches"]
    assert [m["rank"] for m in matches] == list(range(1, 16))
    assert sorted({m["candidate"]["id"] for m in matches}) == list(range(1, 16))
    scores = [m["score"] for m in matches]
    assert scores == sorted(scores, reverse=True)

    top = matches[0]
    assert (top["candidate"]["name"], top["score"]) == ("Sherlock H.", 95.0)
    assert top["breakdown"]["skills"]["matched"] == [
        "deduction",
        "pattern-recognition",
        "forensics",
    ]
    assert top["breakdown"]["culture"]["matched"] == ["analytical"]


def test_candidate_matches_rank_every_job(client: TestClient) -> None:
    body = get_json(client, "/candidates/11/matches")
    assert body["candidate"]["name"] == "Michael S."
    assert [m["rank"] for m in body["matches"]] == list(range(1, 7))
    top = body["matches"][0]
    assert (top["job"]["title"], top["score"]) == ("Sales Engineer", 68.3)
    assert "Not currently looking." in top["reason"]


def test_zero_overlap_pairs_are_listed_last_with_score_zero(client: TestClient) -> None:
    matches = get_json(client, "/jobs/1/matches")["matches"]
    zero = [m for m in matches if m["score"] == 0]
    assert zero and all(m["reason"] == "No required skills matched (0/3)." for m in zero)
    assert matches[-len(zero) :] == zero
    assert all(m["breakdown"]["experience"]["points"] == 0 for m in zero)


def test_both_directions_agree_for_all_90_pairs(client: TestClient) -> None:
    from_jobs = {
        (m["candidate"]["id"], job_id): (m["score"], m["reason"], m["breakdown"])
        for job_id in range(1, 7)
        for m in get_json(client, f"/jobs/{job_id}/matches")["matches"]
    }
    from_candidates = {
        (candidate_id, m["job"]["id"]): (m["score"], m["reason"], m["breakdown"])
        for candidate_id in range(1, 16)
        for m in get_json(client, f"/candidates/{candidate_id}/matches")["matches"]
    }
    assert len(from_jobs) == 90
    assert from_jobs == from_candidates


def test_rankings_are_deterministic(client: TestClient) -> None:
    assert get_json(client, "/jobs/2/matches") == get_json(client, "/jobs/2/matches")


def test_tie_breaks_by_name_when_score_and_factors_are_equal(client: TestClient) -> None:
    # MacGyver and Tony S. both score 85.0 for Rapid Prototyping Engineer.
    names = [m["candidate"]["name"] for m in get_json(client, "/jobs/2/matches")["matches"][:3]]
    assert names == ["Rick S.", "MacGyver", "Tony S."]


@pytest.mark.parametrize("path", ["/jobs/999/matches", "/candidates/999/matches"])
def test_unknown_id_returns_404(client: TestClient, path: str) -> None:
    response = client.get(path)
    assert response.status_code == 404
    assert response.json()["detail"].endswith("999 not found")


@pytest.mark.parametrize("bad_id", ["abc", "0", "-1", "1.5"])
def test_invalid_id_returns_422(client: TestClient, bad_id: str) -> None:
    assert client.get(f"/jobs/{bad_id}/matches").status_code == 422
    assert client.get(f"/candidates/{bad_id}/matches").status_code == 422


def test_health_reports_ok(client: TestClient) -> None:
    assert get_json(client, "/health") == {"status": "ok"}


def test_unexpected_errors_return_a_generic_500() -> None:
    def broken_connection() -> Iterator[None]:
        raise RuntimeError("password=secret host=db internal detail")
        yield  # pragma: no cover

    application = create_app()
    application.dependency_overrides[get_connection] = broken_connection
    with TestClient(application, raise_server_exceptions=False) as client:
        response = client.get("/jobs/1/matches")
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert "secret" not in response.text
