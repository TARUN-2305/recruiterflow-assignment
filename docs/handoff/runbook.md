# Runbook

How to set up, run, reset and troubleshoot every part of this repository. The section READMEs have the same commands with more explanation.

## Prerequisites

| Tool | Version | Used by |
|---|---|---|
| Node.js | 22.22+ (`frontend/`), 20+ (`qa/`) | frontend, QA |
| Python | 3.12+ | backend |
| Docker Desktop | any recent; must be **running** | PostgreSQL (or install PostgreSQL yourself) |
| ReqRes API key | free account at reqres.in | QA API tests |

## One-time setup

```bash
cp .env.example .env                    # choose a URL-safe POSTGRES_PASSWORD
cp backend/.env.example backend/.env    # same user and password
cp qa/.env.example qa/.env              # paste your ReqRes key
docker compose up -d db
```

## Day-to-day commands

| Task | Command (from the folder shown) |
|---|---|
| QA suite | `qa/`: `npx playwright test` (`--project=ui`, `--project=api`, `--grep @bonus`) |
| QA report | `qa/`: `npx playwright show-report` |
| Backend venv | `backend/`: `python -m venv .venv`, activate, `pip install -r requirements-dev.txt` |
| Schema + seed | `backend/`: `python -m scripts.migrate && python -m scripts.seed` (both safe to repeat) |
| API | `backend/`: `uvicorn app.main:app --reload`, then http://127.0.0.1:8000/docs |
| SQL Detective | `backend/`: `python -m scripts.load_sql_detective` |
| Backend checks | `backend/`: `pytest`, `ruff check .`, `ruff format --check .`, `mypy` |
| Trip Splitter | `frontend/`: `npm install`, `npm run dev`, then http://localhost:5173 |
| Frontend checks | `frontend/`: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` |
| Everything in Docker | root: `docker compose up -d --build --wait`, then `docker compose run --rm api python -m scripts.migrate` / `... scripts.seed` |

## Resetting

- **Database:** `docker compose down -v && docker compose up -d db`, then migrate and seed again. The init script that creates `recruiter_bot_test` and `hiring_ops` only runs on a fresh volume.
- **Trip Splitter data:** in the browser console run `localStorage.removeItem('trip-splitter:v1')`, then reload. The sample data comes back.
- **SQL Detective:** re-run `python -m scripts.load_sql_detective`. It drops and reloads its four tables.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Backend commands hang for many seconds on Windows | `localhost` resolves to IPv6 first; the container listens on IPv4 | Use `127.0.0.1` in `DATABASE_URL` (the templates already do) |
| `connection refused` on 5432 | Docker Desktop not running, or `db` not started | Start Docker Desktop; `docker compose up -d db`; `docker compose ps` should say *healthy* |
| Port 5432 or 8000 already in use | A local PostgreSQL, or the host `uvicorn` and the `api` container at once | Set `POSTGRES_PORT` / `API_PORT` in `.env` |
| Integration tests say *skipped* | `TEST_DATABASE_URL` not set | Create `backend/.env` from the template |
| `TEST_DATABASE_URL must point at a database ending in _test` | A safety check: the tests wipe that database | Point it at `recruiter_bot_test` |
| API tests show *skipped* | No ReqRes key | Put `REQRES_API_KEY` in `qa/.env` |
| API tests fail with 403 | Invalid key | Generate a new key on reqres.in |
| UI tests time out | saucedemo.com unreachable, or its page changed | Open the site in a browser; check the locator in the failing test's `error-context.md` |
| `npm install` warns about the engine in `frontend/` | Node older than 22.22 | Upgrade Node (React Router 8 requires it) |
| Trip Splitter shows the sample data after a reload | Saved data was invalid, or storage is blocked | Expected fallback; check the browser allows site data |

## Where the evidence is

`docs/testing/evidence/`: QA live run, curl output, SQL Detective results, frontend manual checks, Docker check. `docs/testing/results.md` is the final acceptance report.
