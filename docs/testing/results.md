# Final acceptance report (2026-10-28)

Release gate run on a **fresh clone from GitHub** (`git clone https://github.com/TARUN-2305/recruiterflow-assignment.git`, commit `91590f4`, plus the documentation and test-hygiene commit that follows it). The only files added to the clone were the git-ignored `.env` files a reviewer creates from the templates.

Environment: Windows 11, Node 24.16.0, Python 3.13.13, Docker 29.4.3, PostgreSQL 16.14 (container), Chromium headless shell 156.

## Release gate

| # | Gate item | Result | Evidence |
|---|---|---|---|
| 1 | Clean installs, builds, typechecks, lints, tests | **Pass.** QA: `npm install` (0 vulnerabilities), typecheck ✓, lint ✓, **8/8 Playwright tests passed live**. Backend: venv + `pip install -r requirements-dev.txt`, **63/63 pytest**, ruff check ✓, ruff format ✓, mypy strict ✓. Frontend: `npm install` (0 vulnerabilities), typecheck ✓, lint ✓, **132/132 Vitest**, build ✓ | This report; `evidence/qa-run.txt` |
| 2 | Migrations and seed twice; idempotent; counts | **Pass.** Fresh databases: "Applied: 001…", then "No pending migrations". Seed ×2: 15 candidates / 6 jobs both times; junction counts unchanged (50/16/30/12); a failure part-way rolls back | `backend/tests/integration/test_database.py`; `evidence/docker-compose-check.md` |
| 3 | SQL Detective on the exact supplied data | **Pass.** 5/7/11/24 rows; Q1–Q5 match the expected results; Q5 ties tested | `evidence/sql-detective-results.txt`; `backend/tests/integration/test_sql_detective.py` |
| 4 | Both Recruiter Bot endpoints, saved output | **Pass.** `/jobs/{id}/matches` and `/candidates/{id}/matches` return full deterministic rankings with score, reason and breakdown; 404/422/500 behave; all 90 pairs agree in both directions | `evidence/recruiter-bot-curl.txt` |
| 5 | QA against the live external sites; key handling | **Pass.** saucedemo.com and reqres.in reachable; 5 required + 3 bonus tests pass. The key is read from git-ignored `qa/.env`; without it the API tests show as skipped. Observation: ReqRes also answered without a key that day and returned 403 for an invalid key; documented in `qa/README.md` | `evidence/qa-run.txt` |
| 6 | Frontend after reload; responsive | **Pass.** A real browser reload keeps added expenses; corrupt storage falls back to the sample data; nothing overflows at 360 px; a keyboard-only add-expense flow works | `evidence/frontend-manual-checks.md` |
| 7 | No `.env`, credentials, source PDF/transcription, DB files or build output in Git | **Pass.** No tracked `.env`, PDF, transcription, `CLAUDE.md`, `node_modules`, `dist`, caches or reports; API key and DB password absent from all tracked content; no personal paths or emails; all commits use the GitHub noreply identity | Scan below |
| 8 | READMEs vs their instructions; nothing unimplemented described as done | **Pass.** `frontend/README.md` = 499 words (467 excluding commands), covering the 4 required topics, the rounding rule and the localStorage rationale. Backend README has setup, curl, trade-offs and AI note. QA README has install/run. Limitations are stated in each | Section READMEs |
| 9 | Traceability updated; acceptance report | **Pass.** Every MUST row is Done with evidence. Remaining open rows are candidate actions (see below) | `docs/requirements-traceability.md` |
| 10 | Interview walkthrough prepared | **Pass.** Private guide written: architecture, SQL, scoring, identity handling, paise maths, state and storage boundary, tests, compromises, 8 practice changes | `docs/handoff/interview-guide.md` (git-ignored) |

## Hygiene scan (tracked files only)

```text
tracked files that should never be tracked:     none
API key / DB password in tracked content:       not present
zero-width spaces in source:                    none (two literal U+200B in backend test files, introduced
                                                by ruff format rewriting "​" escapes, were found by
                                                this scan and replaced with chr(0x200B))
personal paths or email addresses:              none
reviewer-only text from the brief:              none
commit authors:                                 TARUN-2305 <240145873+TARUN-2305@users.noreply.github.com> only
```

## Deviations from the brief (all documented where they apply)

| Item | Brief | Delivered | Why |
|---|---|---|---|
| QA Node version | 18+ | 20+ | Playwright 1.64 requires Node 20 (Node 18 is end-of-life) |
| Frontend Node version | not stated | 22.22+ | React Router 8 requires it |
| ReqRes "requires an API key" | as stated | key always sent; also observed working without one | Observed behaviour recorded honestly |
| QA folder | "create a new folder" with `npm init playwright` | `qa/` inside one repo | p. 1 allows one repo with a folder per section |

## Known limitations (also in the READMEs)

- Recruiter Bot: no write API or auth; exact-text skill matching (no synonyms); one DB connection per request; dev DB uses the container's superuser (localhost-only).
- Trip Splitter: expenses cannot be edited; members are fixed; the table scrolls sideways on narrow screens rather than turning into cards.
- QA: depends on two public sites being up.

## Still to do by the candidate

| Item | Traceability |
|---|---|
| Send the QA reply email with the repo link and a 3–5 sentence reflection within the 48-hour window (draft: `docs/handoff/qa-reflection-draft.md`, git-ignored) | A-SUB-02, A-SUB-03 |
| Share the repo link for Sections B and C as each brief asks | B-SUB-01, C-SUB-01 |
| Confirm the AI-use paragraphs in `backend/README.md` and `frontend/README.md` are accurate in your own words | B-DOC-04, C-DOC-01 |
| Prepare for the walkthrough and live change without AI help | B-TIME-01, C-AI-01 |
