# Implementation Plan (Phase 0 proposal — awaiting approval)

Related: `source-audit.md`, `requirements-traceability.md`, `architecture/`, `decisions/ADR-001…008`, `testing/test-strategy.md`.

## 1. What the assignment actually requires

A Full Stack applicant submits **all three** sections: one repo with `qa/`, `backend/`, `frontend/`, each with its own README.

- **A — QA**
  - 5 Playwright + TS tests:
    - SauceDemo: valid login → "Products"; locked-out error; add-to-cart badge "1"
    - ReqRes: `GET /api/users/2` 200 + `data.email`; `POST /api/users` 201 + name
  - The ReqRes key goes in `x-api-key`.
  - 4 optional bonuses.
  - A short README and a few commits.
  - A 3–5 sentence email reflection, sent by the candidate.
- **B — Recruiter Bot**
  - Ingest the exact 15 candidates and 6 jobs into a relational DB, using a **hand-written schema and hand-written SQL only**.
  - `GET /jobs/{id}/matches` and `GET /candidates/{id}/matches`, ranked, with a score and a short reason.
  - Matching must use skill overlap and experience fit; everything else is ours to choose and defend.
  - README: run instructions, curl examples, the trade-offs write-up, and an AI-use note.
  - Plus `sql_detective.sql`: Q1–Q4 required, Q5 bonus, run against the supplied dataset loaded as-is.
  - Tests and API docs are bonuses.
- **C — Trip Splitter**
  - Vite/React/strict TS/RTK/React Router, with two pages plus a 404.
  - A validated add-expense form with three split modes.
  - An Expenses page with balances, a sorted table, a filter with a total, a confirmed delete, and empty states.
  - Integer paise; no lost paisa; balances sum to 0; Indian formatting.
  - localStorage persistence with a fallback to the sample data.
  - No form or component libraries. Vitest + RTL tests. ESLint.
  - Scripts `dev/build/typecheck/lint/test`. A README of at most ~500 words.

## 2. Recommended architecture (summary)

| Area | Recommendation | ADR |
|---|---|---|
| Repo | Monorepo, 3 independent packages, no root build tooling; SQL Detective in `backend/sql_detective/` | 001 |
| Backend | Python 3.12+ · FastAPI · Pydantic v2 · **psycopg 3 only** · layered `api → services → domain/repositories` | 001, 002 |
| Database | PostgreSQL 16 via Compose (any local PG works); hand-written numbered migrations; idempotent upsert seed from source-exact JSON, one transaction | 002 |
| Schema | `candidates`, `jobs`, `skills`, `tags` + 4 junction tables with `position`; CHECK on availability; explicit ids 1–15 / 1–6; matches computed, not stored | 002, data-model |
| Matching | Pure `score_pair`. 0–100 = 50·skill coverage + 30·experience fit (linear below min) + 10·culture overlap + 10·availability (1 / 0.5 / 0). Zero skill overlap → 0 (still listed). Exact `Fraction` maths; half-up to 1 dp. One shared tie-break comparator; reasons built from the same data | 003 |
| API | 200 ranked list + structured breakdown; 404 unknown; 422 invalid; generic 500; `/health`; OpenAPI at `/docs` | api-contracts |
| SQL Detective | Verbatim schema/seed in a separate DB; identity = `lower(trim(email))`; "applied" = has an interview; distinct counts; `NULLIF` division; `RANK()` keeps ties | 008 |
| Frontend | Domain logic in `src/domain/` (pure TS). RTK slices `members` and `expenses`, memoised selectors for derived data. Form draft in component `useReducer`. Notice via router state | 005 |
| Money | Integer paise; percentages → basis points via string parsing; one largest-remainder `allocate` for equal + percent, ties → trip member order; integer-only INR formatter | 004 |
| Persistence | `services/persistence.ts`: read once at store creation (type-guarded, all-or-nothing, else sample); write via one `store.subscribe`; injected storage | 005 |
| QA | Two Playwright projects (`ui` Chromium, `api` no browser); `testIdAttribute: 'data-test'`; key from `REQRES_API_KEY` via git-ignored `.env`; `LoginPage`; ESLint `no-floating-promises` | 007 |
| Containers | Optional: Compose `db` (+ `api`), non-root backend Dockerfile, healthchecks. Host workflow stays primary; no frontend/QA containers | 006 |
| Security | Env-only secrets with `.env.example` placeholders; parameterised SQL; no stack traces; untrusted localStorage/API bodies narrowed from `unknown`; source PDF/MD and `.env` git-ignored | HLD §5 |

## 3. Implementation sequence and acceptance gates

Each milestone ends with: commands run, exact results, updated traceability statuses, and one or more logical commits. Nothing is pushed without explicit authorisation.

| # | Milestone | Main outputs | Gate |
|---|---|---|---|
| **M1** | Foundation | `git init` (branch `main`); `.gitignore` (PDF, MD transcription, `.env*` except examples, `node_modules`, `.venv`, `dist`, `playwright-report`, `test-results`, caches), `.gitattributes`, `.editorconfig`, root README skeleton, `.env.example` files, `compose.yaml` (db only) | `git status` shows no source docs or secrets; `docker compose up -d db` healthy |
| **M2** | Recruiter Bot core | `pyproject.toml` (pinned), migrations, seed JSON + `seed.py`, `migrate.py`, domain scoring + unit tests, repositories, service, routes, error handlers | unit + integration green; seed ×2 idempotent; both endpoints return expected top matches; ruff + mypy clean |
| **M3** | SQL Detective | `schema.sql`/`seed.sql` (verbatim), `sql_detective.sql`, loader, result tests | Q1–Q5 match the expected sets; row counts 5/7/11/24 |
| **M4** | Backend docs | `backend/README.md` (setup, seed, curl, formula and trade-offs, SQL Detective, tests, limitations, AI note) + captured curl evidence | README commands re-run from scratch |
| **M5** | Trip Splitter domain | Vite scaffold, strict tsconfig, ESLint config, `sample-data.json`, `domain/*` + unit tests (money, allocation, balances, format, validation, persistence parsing) | `typecheck`, `lint`, `test` green; ₹100 ÷ 3 and Σ = 0 tests pass |
| **M6** | Trip Splitter UI | store, hooks, selectors, persistence, routes/layout, form, Expenses page, CSS, RTL tests | all scripts green; manual 360 px + keyboard + reload checks |
| **M7** | Frontend README | ≤ 500 words, 4 topics, remainder rule, persistence rationale | word count recorded |
| **M8** | QA | scaffold in `qa/`, config, 5 required tests → run live → 4 bonuses → README | live run green (key required); no key in git |
| **M9** | Containers (optional) | backend Dockerfile, `.dockerignore`, `api` service, healthchecks | `docker compose up` → `/health` 200; host flow still works |
| **M10** | Integration and polish | finalise HLD/LLD/ADRs to match the code, `docs/handoff/runbook.md`, `docs/handoff/interview-guide.md`, QA reflection draft, `docs/testing/results.md` | CLAUDE.md §7 release gate, every item evidenced |
| **M11** | Final review | recruiter-eye pass: clone from scratch, requirements, seed fidelity, secrets, README truthfulness | acceptance report; remaining gaps stated honestly |

**Order rationale.**
- Backend first (M2–M4): it has the most design risk (scoring, SQL), and it needs Docker running.
- Frontend domain before its UI: money correctness is the top evaluation criterion.
- QA last but timeboxed: it is the smallest piece, and it depends on the user's ReqRes key and the live sites.

**Timing caveat:** Section A's 48-hour window starts "from the time you receive this email". If that clock is already running, **move M8 to right after M1**, since it is only about 2–3 hours of work.

## 4. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| ReqRes key missing, or the API has changed (status codes, auth) | Medium | User creates the key early; verify live in M8; document any deviation honestly; explicit skip without a key |
| SauceDemo DOM / availability changes | Low | Verify locators live; prefer `data-test` ids |
| Docker daemon not running / port 5432 taken | Medium | Start Docker Desktop before M2; `POSTGRES_PORT` override; a local Postgres also works |
| U+200B copied from the PDF into seed files | Medium | Take data from the clean transcription values; fidelity test rejects U+200B |
| Windows CRLF breaking SQL/shell in containers | Medium | `.gitattributes` LF rules |
| Timezone edge on "date not in future" | Low | Local-date comparison with injected `today`; tests around midnight are unnecessary but the logic is pure |
| Over-engineering beyond what the candidate can explain | Medium | Keep the layers thin; no extra libraries; interview guide written alongside the code |
| Library API drift (React Router v7, RTK 2, typescript-eslint flat config, Playwright) | Medium | Check current docs at scaffold time; pin versions; commit lockfiles |
| Section time budgets exceeded | Medium | Required items first; bonuses only after gates pass |

## 5. Assumptions (also in source-audit §8)

1. Candidate/job ids are 1–15 / 1–6 in source order. Experience is measured in years.
2. Score policy as in ADR-003, including the zero-overlap gate and the full (unfiltered) ranking.
3. SQL Detective interpretations as in ADR-008.
4. Trip Splitter:
   - only expenses are persisted; Cancel goes to `/`; the user's local date is "today"
   - zero shares are omitted from splits
   - same-date ties are ordered newest-added first
   - amount input is strict (no commas)
   - split labels are "Equally / Exact amounts / Percentages, N people"
   - delete is confirmed via `window.confirm`
   - the narrow-screen table scrolls horizontally rather than becoming cards
5. The QA API tests skip (with a reason) when no key is set.

## 6. Decisions (updated 2026-10-28)

| # | Decision | Outcome |
|---|---|---|
| 1 | Backend language | **Python/FastAPI — confirmed by candidate.** Section B allows "any programming language". TypeScript is mandated only for Section A (Playwright + TS) and Section C (React + strict TS). |
| 2 | Database | PostgreSQL via Docker (recommended default; proceeding) |
| 3 | Zero-skill-overlap pairs | Listed with score 0 (recommended default; proceeding) |
| 4 | Missing ReqRes key | Skip with a reason (recommended default; the candidate now has a key) |
| 5 | Repo hygiene | `CLAUDE.md` and `docs/handoff/interview-guide.md` are **git-ignored for now**. Adding them later is easy; removing them from public history is not. `docs/` is otherwise committed. |
| 6 | Remote | `https://github.com/TARUN-2305/recruiterflow-assignment.git` (empty at M1). Each push still needs the candidate's go-ahead. |
| 7 | Section A timing | Not yet confirmed. If the 48-hour window is running, QA moves to right after M1. |

## 7. Repo hygiene (pre-agreed)

- **Never committed:** `Recruiterflow_Internship_Assignments.pdf`, `Recruiterflow_Internship_Assignments.md`, any `.env`, local DB volumes, build output, Playwright reports and traces.
- The internal reviewer notes (PDF pp. 5–6) are never quoted in public READMEs.
- Commits are small and logical, with descriptive messages. No push without explicit approval.
