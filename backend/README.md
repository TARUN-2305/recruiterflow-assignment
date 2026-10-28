# Recruiter Bot — backend + SQL Detective

A small FastAPI service that loads the 15 fictional candidates and 6 jobs from the brief into PostgreSQL, then ranks candidates for a job and jobs for a candidate. All database access is **hand-written SQL**: `psycopg` is the only database library, with no ORM, no query builder and nothing that generates SQL.

The SQL Detective answers are in [`sql_detective/sql_detective.sql`](sql_detective/sql_detective.sql).

## Run it locally

You need Python 3.12+ and PostgreSQL 16. The easiest way to get PostgreSQL is Docker Desktop with the repo's `compose.yaml`; any local PostgreSQL also works if you set `DATABASE_URL`.

```bash
# from the repository root: start PostgreSQL (creates recruiter_bot, recruiter_bot_test, hiring_ops)
cp .env.example .env                 # choose a password
docker compose up -d db

cd backend
python -m venv .venv
.venv/Scripts/activate               # Windows; on macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                 # use the same user/password as the root .env

python -m scripts.migrate            # creates the schema (safe to re-run)
python -m scripts.seed               # loads 15 candidates + 6 jobs (safe to re-run)
uvicorn app.main:app --reload        # http://127.0.0.1:8000, interactive docs at /docs
```

On Windows, use `127.0.0.1` rather than `localhost` in `DATABASE_URL`. `localhost` tries IPv6 first and the connection stalls for several seconds.

### Or run everything in Docker (optional)

```bash
# from the repository root, with .env created from .env.example
docker compose up -d --build --wait                     # PostgreSQL + API (http://127.0.0.1:8000)
docker compose run --rm api python -m scripts.migrate
docker compose run --rm api python -m scripts.seed
docker compose run --rm api python -m scripts.load_sql_detective
docker compose down                                     # add -v to delete the database volume
```

- The API image (`backend/Dockerfile`) contains only runtime dependencies and runs as a non-root user.
- Credentials are supplied at run time from `.env`, never baked into the image. The password must be URL-safe because it goes into a connection URL.
- `/health` reports whether the database is reachable (503 if not). It does not check that the migrations have been run.
- Don't run the host `uvicorn` at the same time unless you change `API_PORT` in `.env`; both use port 8000.

## Try the API

```bash
curl -s http://127.0.0.1:8000/jobs/1/matches          # ranked candidates for "Backend Detective"
curl -s http://127.0.0.1:8000/candidates/11/matches    # ranked jobs for "Michael S."
curl -i http://127.0.0.1:8000/jobs/999/matches         # 404 {"detail":"Job 999 not found"}
curl -i http://127.0.0.1:8000/jobs/abc/matches         # 422 (id must be a positive integer)
curl -s http://127.0.0.1:8000/health                   # {"status":"ok"}
```

Ids follow the brief's order: candidates 1–15 (1 = Sherlock H., 15 = Dwight S.) and jobs 1–6 (1 = Backend Detective, 6 = Sales Engineer). Each response lists **every** candidate (or job) in rank order. For example, `GET /jobs/6/matches` starts like this:

```json
{
  "job": { "id": 6, "title": "Sales Engineer", "min_experience": 3, "...": "..." },
  "matches": [
    {
      "rank": 1,
      "candidate": { "id": 15, "name": "Dwight S.", "availability": "Immediate", "...": "..." },
      "score": 73.3,
      "reason": "Matches 2/3 required skills (sales, negotiation); missing public-speaking. 9 yrs experience (min 3). Available immediately. No culture keyword overlap (enthusiastic, persistent).",
      "breakdown": { "skills": { "points": 33.3, "max": 50, "...": "..." }, "experience": { "points": 30.0, "max": 30 }, "culture": { "points": 0.0, "max": 10 }, "availability": { "points": 10.0, "max": 10 } }
    },
    { "rank": 2, "candidate": { "id": 11, "name": "Michael S.", "...": "..." }, "score": 68.3, "reason": "Matches 2/3 required skills (sales, public-speaking); missing negotiation. 11 yrs experience (min 3). Not currently looking. Culture overlap: enthusiastic." }
  ]
}
```

Full captured output: [`docs/testing/evidence/recruiter-bot-curl.txt`](../docs/testing/evidence/recruiter-bot-curl.txt).

## How matching works

Each candidate–job pair gets a score from 0 to 100:

| Part | Points | How it is measured |
|---|---|---|
| Skills | 50 | share of the **job's** required skills the candidate has |
| Experience | 30 | full marks at or above the minimum; below it, `years ÷ minimum` |
| Culture | 10 | share of the job's culture keywords that appear in the candidate's traits |
| Availability | 10 | Immediate 10, 2 weeks 5, Not looking 0 |

If a candidate has **none** of the required skills, the score is 0 and the reason says so. They are still listed, at the bottom.

**Why these choices.** Skills carry the most weight because the brief's own examples (Sherlock → Backend Detective) are about skill fit. I measure coverage of the job's list rather than overall similarity. That way a candidate isn't penalised for extra skills: MacGyver's chemistry doesn't hurt his Rapid Prototyping score. Experience is the other required factor. Partial credit below the minimum means "one year short" is not treated like "no experience". There's no penalty for being over-qualified, because nothing in the data (salary, level) would justify one. The zero-skills rule exists because without it Rick S. (20 years, available immediately, but none of the detective skills) would score 40 for Backend Detective on experience and availability alone, which is misleading.

**Trade-offs I accepted.**
- Culture keywords and traits are short, self-described labels, so they get only 10 points, and I don't claim they predict anything. They match only when the words are identical: MacGyver's "calm" does not count as "calm-under-pressure". Guessing synonyms would mean inventing data.
- "Not looking" costs 10 points but never hides anyone. Michael S. is a strong Sales Engineer fit and comes second, behind the available Dwight S., which I think is what a recruiter would want to see.
- The weights are judgement calls. Each is a named constant in `app/domain/matching.py`, so changing one is a one-line edit.

**Determinism and exactness.** Scores are computed with exact fractions, so there's no floating-point drift, and rounded half-up to one decimal only for display. Ties are broken by skill coverage, then experience fit, then name, then id. For example, MacGyver and Tony S. both score 85.0 for Rapid Prototyping, and MacGyver comes first by name. Both endpoints call the same `score_pair` function, and a test checks that all 90 pairs get identical scores and reasons from both directions. Reasons are built from the same matched/missing lists that produced the score.

## Database

Hand-written DDL in [`migrations/001_recruiter_bot_schema.sql`](migrations/001_recruiter_bot_schema.sql):
- `candidates` and `jobs` use the brief's order as fixed ids. Availability is limited to the three source values by a `CHECK` constraint.
- `skills` and `tags` are shared vocabularies. Tags hold both traits and culture keywords, so comparing them is a simple match.
- Four junction tables (`candidate_skills`, `job_required_skills`, `candidate_traits`, `job_culture_keywords`) keep the source order in a `position` column.
- A **match is not stored**. It is computed on each request from the current data. With 90 possible pairs this is instant, and there is nothing to keep in sync.

`scripts/seed.py` validates [`seed/recruiter_bot_seed.json`](seed/recruiter_bot_seed.json) and upserts everything in **one transaction**. Running it again leaves identical data, and if anything fails nothing is written. The repositories (`app/repositories/`) read profiles with two queries that use `ARRAY(...)` subqueries. Joining both junction tables at once would multiply rows. Every value is a bound parameter (`%s`), and the linter (ruff rule S608) rejects SQL built with string formatting.

Code layout: `api/` (routes, response models, error handlers) → `services/` (use cases) → `domain/` (pure scoring, no I/O) and `repositories/` (SQL).

## SQL Detective

The supplied tables and rows are copied unchanged into `sql_detective/schema.sql` and `sql_detective/seed.sql`. The answers, one commented query per question, are in `sql_detective/sql_detective.sql`.

```bash
python -m scripts.load_sql_detective   # loads the dataset into hiring_ops and prints every answer
```

Key assumptions, also commented in the file:
- A person is identified by their email, ignoring letter case and spaces. This catches Ananya Rao, who appears twice as `ananya.rao@` and `Ananya.Rao@`.
- With no applications table, "applied to a posting" means the person had at least one interview for it.
- Q4's denominator counts every Final interview, as worded.
- Q5 uses `RANK()` so that tied recruiters are all kept.

Results: [`docs/testing/evidence/sql-detective-results.txt`](../docs/testing/evidence/sql-detective-results.txt).

## Tests and checks

```bash
pytest              # 63 tests: 34 unit (no database) + 29 integration (real PostgreSQL)
ruff check . && ruff format --check .
mypy                # strict
```

- Integration tests use `TEST_DATABASE_URL`, which must point to a database whose name ends in `_test`, because the tests wipe it. Without that variable, they are skipped with a message.
- The tests cover:
  - every scoring boundary, including at, below and above the minimum experience
  - rounding and tie-breaks
  - seed fidelity against the brief, and that re-seeding changes nothing
  - rollback when a seed fails
  - 404, 422 and 500 responses
  - agreement between the two endpoints
  - each SQL Detective answer

## Limitations and next steps

- There's no write API and no authentication; data comes from the seed script only.
- One database connection is opened per request. A connection pool (`psycopg_pool`) would be the first change under real load.
- Skill and keyword matching is exact text. A real system would need a maintained synonym list.
- Results aren't paginated; the lists are always 15 or 6 items long.

## AI use

I used Claude Code, an AI coding assistant, throughout this section. It helped me audit the brief, laid out design options, and drafted the code, tests and documentation. I made the decisions between those options (Python and PostgreSQL, the scoring weights, listing zero-skill matches) and reviewed the result. Every test result and example output in this README comes from a real run, not from the assistant's predictions.
