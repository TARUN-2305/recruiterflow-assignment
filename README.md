# RecruiterFlow Internship Assignments — Full Stack

One repository, one folder per assignment section. Each folder runs on its own and has its own README.

| Folder | Section | Stack | Status |
|---|---|---|---|
| [`qa/`](qa/) | A — QA Automation | Playwright + TypeScript | Done: 5 required + 3 bonus tests and a Page Object, passing live |
| [`backend/`](backend/) | B — Recruiter Bot + SQL Detective | Python · FastAPI · PostgreSQL · hand-written SQL | Done: both match endpoints, SQL Detective Q1–Q5, 63 tests |
| [`frontend/`](frontend/) | C — Trip Splitter | React · Redux Toolkit · strict TypeScript · Vite | Not started |
| [`docs/`](docs/) | Planning and design | Requirements traceability, architecture, ADRs, test strategy | Phase 0 complete |

## Prerequisites

- Node.js 18+ (for `qa/` and `frontend/`)
- Python 3.12+ (for `backend/`)
- Docker Desktop (optional; it runs PostgreSQL for `backend/`, or use a local PostgreSQL install instead)

## Local database (Section B)

```bash
cp .env.example .env        # then set your own password
docker compose up -d db
```

## Quick start

**QA (Section A)** — see [qa/README.md](qa/README.md)

```bash
cd qa
npm install
npx playwright install chromium
cp .env.example .env    # add your ReqRes API key
npx playwright test
```

**Recruiter Bot + SQL Detective (Section B)** — see [backend/README.md](backend/README.md)

```bash
cp .env.example .env && docker compose up -d db     # PostgreSQL (choose a password in .env)
cd backend
python -m venv .venv && .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                                # same password as the root .env
python -m scripts.migrate && python -m scripts.seed
uvicorn app.main:app --reload                       # then: curl -s http://127.0.0.1:8000/jobs/1/matches
python -m scripts.load_sql_detective                # SQL Detective answers
pytest
```

Quick-start commands for the frontend will be added when it is completed.
