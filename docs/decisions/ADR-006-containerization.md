# ADR-006 — Containerisation (optional engineering)

- **Status:** Proposed (Phase 0). To be built **after** host-based workflows pass (Phase 5).
- **Mandated by brief?** No. Section A says Docker is not needed for QA. Sections B and C don't mention it. This is purely our convenience choice.

## Decision

Minimal Docker Compose at the repo root:

```yaml
services:
  db:        # postgres:16-alpine
    env:     POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB from .env (placeholders in .env.example)
    ports:   "${POSTGRES_PORT:-5432}:5432"
    volumes: pgdata:/var/lib/postgresql/data, ./backend/db/init:/docker-entrypoint-initdb.d:ro
    healthcheck: pg_isready
  api:       # build: ./backend   (optional; `docker compose up` runs both)
    depends_on: db (service_healthy)
    env:     DATABASE_URL
    ports:   "8000:8000"
    healthcheck: GET /health
volumes: { pgdata: {} }
```

- The init script creates the databases `recruiter_bot`, `recruiter_bot_test` and `hiring_ops`. Init scripts run only on first volume creation; the README documents `docker compose down -v` to reset.
- Migrations and seed are **explicit commands**, not hidden in container start: `docker compose run --rm api python -m scripts.migrate` / `… scripts.seed`, or the host-venv equivalents. This keeps "run twice, prove idempotency" visible.
- Backend `Dockerfile`: `python:3.12-slim` (or 3.13), installs pinned dependencies first for layer caching, copies the app, runs as a **non-root** user, `CMD uvicorn app.main:app --host 0.0.0.0 --port 8000`. No secrets in build args or layers. A `.dockerignore` excludes `.venv`, `.env`, `tests` caches.
- **Host-first workflow remains primary:** `docker compose up -d db` plus a local venv running `uvicorn`. Compose is never the only way: a local PostgreSQL install works with `DATABASE_URL`.

## Not containerised (deliberately)

- **Frontend:** `npm run dev` is what the brief asks a reviewer to run. A container adds nothing.
- **QA:** runs on the host against public sites. Browser images are large and the brief rules Docker out for QA.
- **External targets** (SauceDemo, ReqRes).

## Alternatives

| Option | Verdict |
|---|---|
| No Docker at all (local Postgres only) | Works, but makes the reviewer install Postgres. Compose for the DB is the lowest-friction route to a real Postgres. |
| Testcontainers for integration tests | Elegant, but it adds a dependency and needs Docker at test time anyway. A Compose test DB is simpler. |
| Kubernetes / cloud deploy / CI | Out of scope. |

## Least-privilege DB role (optional, E-10)

The init script can also create a `recruiter_app` role that owns only `recruiter_bot`, so the API doesn't connect as the Postgres superuser. It is cheap to add and is listed as optional. If skipped, the README states that the local dev credentials are superuser and must not be reused elsewhere.

## Environment note

Docker Desktop is installed on the dev machine (Compose v5.1.3), but the daemon was **not running** during Phase 0. It must be started before Phase 2's integration tests.
