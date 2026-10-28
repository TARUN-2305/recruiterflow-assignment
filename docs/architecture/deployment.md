# Deployment / Local Run Design (proposal, Phase 0)

Everything runs locally. There is no cloud deployment. Containerisation is optional (ADR-006).

## Prerequisites

| Tool | Version (dev machine) | Needed for |
|---|---|---|
| Node.js | ≥ 18 (have 24.16) | `qa/`, `frontend/` |
| Python | ≥ 3.12 (have 3.13.13) | `backend/` |
| Docker Desktop + Compose | have 29.4 / v5.1 (daemon must be started) | PostgreSQL (or install Postgres locally) |
| ReqRes API key | user-supplied | QA API tests |

## Configuration

| Package | File (git-ignored) | Template (committed) | Variables |
|---|---|---|---|
| root (compose) | `.env` | `.env.example` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` |
| backend | `backend/.env` | `backend/.env.example` | `DATABASE_URL`, `TEST_DATABASE_URL`, `SQL_DETECTIVE_DATABASE_URL` |
| qa | `qa/.env` | `qa/.env.example` | `REQRES_API_KEY` |
| frontend | — | — | none |

Placeholders look like `postgresql://app:change-me@localhost:5432/recruiter_bot`. Real values never enter git.

## Host workflow (primary)

```bash
# Recruiter Bot
docker compose up -d db
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows (POSIX: source .venv/bin/activate)
pip install -r requirements-dev.txt
cp .env.example .env              # same user/password as the root .env
python -m scripts.migrate
python -m scripts.seed            # run twice: counts stay 15 / 6
uvicorn app.main:app --reload
pytest

# SQL Detective
python -m scripts.load_sql_detective   # loads verbatim schema + seed into hiring_ops, prints Q1–Q5 results

# Trip Splitter
cd frontend && npm install && npm run dev

# QA
cd qa && npm install && npx playwright install chromium && npx playwright test
```

## Compose workflow (optional)

```bash
docker compose up -d --build --wait    # db + api, waits until both are healthy
docker compose run --rm api python -m scripts.migrate
docker compose run --rm api python -m scripts.seed
curl -s http://127.0.0.1:8000/health
docker compose down        # keep data   |   docker compose down -v   # reset (re-runs init script)
```

Verified from an empty volume on 2026-10-28: `docs/testing/evidence/docker-compose-check.md`.

## Windows notes

- `.gitattributes` forces LF for `*.sql`, `*.sh`, `Dockerfile` and `compose.yaml`. Postgres init scripts with CRLF can break inside Linux containers.
- Port 5432 may already be in use by a local Postgres. Override it with `POSTGRES_PORT`.
- Use `127.0.0.1`, not `localhost`, in `DATABASE_URL`. On this Windows machine, `localhost` resolves to IPv6 `::1` first, and the connection stalls for many seconds before falling back to IPv4. Measured 2026-10-28: 0.03 s with `127.0.0.1` vs about 8 s with `localhost`. The compose port is bound to `127.0.0.1` only.
