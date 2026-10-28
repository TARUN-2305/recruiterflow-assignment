# API Contracts — Recruiter Bot (as built, 2026-10-28)

Base URL (local): `http://localhost:8000`. JSON only. FastAPI serves OpenAPI at `/docs` and `/openapi.json`. Only the two `matches` endpoints are required by the brief. `/health` is an engineering addition.

## `GET /jobs/{job_id}/matches`

Returns every candidate, ranked for the job (ADR-003).

| Param | In | Type | Rules |
|---|---|---|---|
| `job_id` | path | integer | ≥ 1 |

**200**, from the running API for job 6 (Sales Engineer), shortened. The full output is in `docs/testing/evidence/recruiter-bot-curl.txt`.

```json
{
  "job": { "id": 6, "title": "Sales Engineer", "min_experience": 3,
           "required_skills": ["sales", "public-speaking", "negotiation"],
           "culture_keywords": ["enthusiastic", "persistent"] },
  "matches": [
    {
      "rank": 1,
      "candidate": { "id": 15, "name": "Dwight S.", "years_experience": 9, "availability": "Immediate",
                     "skills": ["sales", "negotiation", "security", "loyalty"], "traits": ["intense", "loyal"] },
      "score": 73.3,
      "reason": "Matches 2/3 required skills (sales, negotiation); missing public-speaking. 9 yrs experience (min 3). Available immediately. No culture keyword overlap (enthusiastic, persistent).",
      "breakdown": {
        "skills":       { "points": 33.3, "max": 50, "matched": ["sales", "negotiation"], "missing": ["public-speaking"] },
        "experience":   { "points": 30.0, "max": 30, "years": 9, "required": 3 },
        "culture":      { "points": 0.0,  "max": 10, "matched": [] },
        "availability": { "points": 10.0, "max": 10, "value": "Immediate" }
      }
    },
    {
      "rank": 2,
      "candidate": { "id": 11, "name": "Michael S.", "years_experience": 11, "availability": "Not looking", "...": "..." },
      "score": 68.3,
      "reason": "Matches 2/3 required skills (sales, public-speaking); missing negotiation. 11 yrs experience (min 3). Not currently looking. Culture overlap: enthusiastic.",
      "breakdown": { "...": "..." }
    }
  ]
}
```

A zero-overlap entry looks like `{ "rank": 15, "score": 0.0, "reason": "No required skills matched (0/3).", ... }`.

## `GET /candidates/{candidate_id}/matches`

The same shape mirrored: `{ "candidate": { id, name, years_experience, availability, skills, traits }, "matches": [ { "rank", "job": { id, title, min_experience, required_skills, culture_keywords }, "score", "reason", "breakdown" } ] }`. For any given pair, the `score`, `reason` and `breakdown` are **identical** to what the job endpoint returns.

## Errors

| Status | When | Body |
|---|---|---|
| 404 | id not in DB | `{ "detail": "Job 99 not found" }` |
| 422 | `abc`, `0`, `-1` | FastAPI validation error (`detail` array with `loc`, `msg`, `type`) |
| 500 | unexpected | `{ "detail": "Internal server error" }`. No stack trace or connection string. |

## `GET /health`

`200 { "status": "ok" }` when the DB answers `SELECT 1`; `503 { "status": "unavailable" }` otherwise.

## Conventions

- `score` is a JSON number with 1 decimal, rounded half-up from an exact rational. `rank` is 1-based and unique (deterministic tie-breaks).
- Lists keep source order for skills and keywords.
- No pagination. The result sizes are fixed (15 or 6).

## curl examples (for README)

```bash
curl -s http://localhost:8000/jobs/1/matches
curl -s http://localhost:8000/candidates/11/matches
curl -i http://localhost:8000/jobs/999/matches      # 404
curl -i http://localhost:8000/jobs/abc/matches      # 422
```
