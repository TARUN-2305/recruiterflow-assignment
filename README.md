# RecruiterFlow Internship Assignments — Full Stack

One repository, one folder per assignment section. Each folder runs on its own and has its own README.

| Folder | Section | Stack | Status |
|---|---|---|---|
| [`qa/`](qa/) | A — QA Automation | Playwright + TypeScript | Not started |
| [`backend/`](backend/) | B — Recruiter Bot + SQL Detective | Python · FastAPI · PostgreSQL · hand-written SQL | Not started |
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

Quick-start commands for each section will be added as each section is completed.
