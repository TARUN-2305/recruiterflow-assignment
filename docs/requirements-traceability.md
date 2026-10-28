# Requirements Traceability Matrix

Source: `Recruiterflow_Internship_Assignments.pdf` (authoritative). Page numbers refer to the PDF.

**Classification**
- `MUST`: required by the brief.
- `BONUS`: optional in the brief.
- `OPT-ENG`: our engineering choice, not a recruiter requirement.
- `OOS`: explicitly not needed, or excluded.
- `USER`: an action only the candidate can perform.

**Status** values: `Planned` → `In progress` → `Done (evidence)` / `Blocked (reason)`. All rows are `Planned` at Phase 0.

"Location" is the planned path. "Evidence" is the planned test or manual verification.

## G — Whole pack

| ID | Page | Requirement | Class | Location | Evidence | Status |
|---|---|---|---|---|---|---|
| G-01 | 1 | Full Stack applicant attempts all three sections (A, B, C) | MUST | `qa/`, `backend/`, `frontend/` | Final acceptance report | Planned |
| G-02 | 1 | Separate repos, or one repo with a clear folder per section, **each with its own README** | MUST | `qa/README.md`, `backend/README.md`, `frontend/README.md` | Review | Planned |
| G-03 | 1 | Partial work allowed; README must say what is missing and what would come next | MUST (conditional) | Section READMEs | Review | Planned |
| G-04 | 2 | Read each whole section; windows/deliverables differ by section | MUST (process) | `implementation-plan.md` | n/a | Done (this audit) |

## A — QA Automation (pp. 3–6)

| ID | Page | Requirement | Class | Location | Evidence | Status |
|---|---|---|---|---|---|---|
| A-ENV-01 | 4 | Node.js 18 or newer | MUST | `qa/package.json` `engines` | `node -v` in README | Done (Node 20+ required by Playwright 1.64; documented in README) |
| A-ENV-02 | 3 | Playwright + TypeScript suite | MUST | `qa/` | `npx playwright test` | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-ENV-03 | 4 | Chromium only is fine | OOS (others) | `qa/playwright.config.ts` | Config review | Done (Chromium only) |
| A-UI-01 | 3 | Valid login as `standard_user`/`secret_sauce`; "Products" title visible | MUST | `qa/tests/ui/login.spec.ts` | Live run | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-UI-02 | 3 | `locked_out_user` login shows an error containing "locked out" | MUST | `qa/tests/ui/login.spec.ts` | Live run | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-UI-03 | 3 | Log in, "Add to cart" on one product, cart badge shows **1** | MUST | `qa/tests/ui/cart.spec.ts` | Live run | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-API-01 | 3 | Use Playwright's built-in `request` fixture; no browser for API tests | MUST | `qa/tests/api/users.spec.ts` | Code review | Done (`api` project uses only `request`) |
| A-API-02 | 3 | ReqRes API key sent in the `x-api-key` header (key from a free ReqRes account) | MUST | `qa/playwright.config.ts` (`extraHTTPHeaders` from `REQRES_API_KEY`), `qa/.env.example` | Live run; no key in git | Done (key from git-ignored `qa/.env`; skip path verified) |
| A-API-03 | 4 | `GET /api/users/2` → status **200**, response has `data.email` | MUST | `qa/tests/api/users.spec.ts` | Live run | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-API-04 | 4 | `POST /api/users` `{ "name": "morpheus", "job": "leader" }` → **201**, response name "morpheus" | MUST | `qa/tests/api/users.spec.ts` | Live run | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-BON-01 | 4 | Remove product from cart; badge disappears | BONUS | `qa/tests/ui/cart.spec.ts` | Live run | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-BON-02 | 4 | Log out via side menu; back on login page | BONUS | `qa/tests/ui/login.spec.ts` | Live run | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-BON-03 | 4 | `GET /api/users/23` → **404** | BONUS | `qa/tests/api/users.spec.ts` | Live run | Done (live run 2026-10-28, `docs/testing/evidence/qa-run.txt`) |
| A-BON-04 | 4 | Login steps in a small helper / Page Object, e.g. `pages/LoginPage.ts` | BONUS | `qa/pages/LoginPage.ts` | Code review | Done (`qa/pages/LoginPage.ts`) |
| A-QUAL-01 | 4 | Clone → `npm install` → `npx playwright test` shows results | MUST | `qa/` | Clean-clone run | Done locally; clean-clone check pending (M11) |
| A-QUAL-02 | 5 | Clear test names, e.g. `'locked out user sees an error'` | MUST | All specs | Review | Done |
| A-QUAL-03 | 5 | Simple locators (`getByRole`/`getByText`/`getByTestId`); `testIdAttribute: 'data-test'` | MUST (quality) | `qa/playwright.config.ts`, specs | Review | Done |
| A-QUAL-04 | 5 | Every test ends with ≥1 `expect`; every Playwright call awaited | MUST | Specs | Review + `@typescript-eslint/no-floating-promises` | Done (lint passes with `no-floating-promises`) |
| A-QUAL-05 | 5 | Short README: install + run | MUST | `qa/README.md` | Review | Done (`qa/README.md`) |
| A-QUAL-06 | 5 | A few commits instead of one | MUST | Git history | `git log` | Done (3 QA commits) |
| A-SUG-01 | 4 | Suggested layout `tests/ui/login.spec.ts`, `tests/ui/cart.spec.ts`, `tests/api/users.spec.ts`, `pages/` | OPT (follow) | `qa/` | Review | Done |
| A-SUB-01 | 5 | Push to a **public** GitHub repo | USER | — | User confirms | Planned |
| A-SUB-02 | 5 | Reply to recruiter email with link within **48 h** | USER | — | User confirms | Planned |
| A-SUB-03 | 5 | 3–5 sentence reflection in that reply: done / stuck + attempts / learned or would improve | USER (we draft) | `docs/handoff/qa-reflection-draft.md` (git-ignored) | User review | Draft ready (private, git-ignored) |
| A-OOS-01 | 5 | CI, Docker, reporting tools | OOS | — | — | n/a |
| A-OOS-02 | 5 | Full framework / every edge case | OOS | — | — | n/a |
| A-OOS-03 | 5 | Checkout, sorting, multi-item cart: beyond the 5 scenarios ("Build a full framework or cover every edge case" is not needed) | OOS | — | — | n/a |

Evaluation weights (p. 5), for prioritisation: coverage 30%, readability/naming 20%, locators/assertions 20%, README + git 15%, reflection 15%.

## B — Recruiter Bot (pp. 7–11, 13–14)

| ID | Page | Requirement | Class | Location | Evidence | Status |
|---|---|---|---|---|---|---|
| B-ING-01 | 10 | Ingestion of candidates and jobs (endpoint or seed script) | MUST | `backend/scripts/seed.py`, `backend/seed/recruiter_bot_seed.json` | Integration test | Planned |
| B-ING-02 | 7–10 | All **15 candidates** and **6 jobs**, field values exactly as source | MUST | Seed JSON | Seed-fidelity unit test (golden values) + row counts | Planned |
| B-ING-03 | — | Seeding repeatable without duplicates | OPT-ENG (CLAUDE.md) | `seed.py` (upserts in one transaction) | Run twice → identical counts | Planned |
| B-SCH-01 | 10 | Own schema for candidates, jobs, and a "match" representation | MUST | `backend/migrations/001_recruiter_bot_schema.sql` | Migration test | Planned |
| B-SQL-01 | 10–11 | **Raw, hand-written SQL only** — no ORM, query builder or SQL generator; hand-written DDL and queries | MUST | `backend/app/repositories/*.py`, `backend/migrations/*.sql` | Dependency review (`psycopg` only); code review | Planned |
| B-DB-01 | 11 | Any relational DB | MUST | PostgreSQL (ADR-002) | — | Planned |
| B-LANG-01 | 11 | Any programming language | MUST (free choice) | Python (ADR-001) | — | Planned |
| B-API-01 | 10 | `GET /jobs/{id}/matches`: ranked candidates, each with a **score** and **short reason** | MUST | `backend/app/api/routes.py` | API integration test + curl evidence | Planned |
| B-API-02 | 10 | `GET /candidates/{id}/matches`: ranked jobs (reverse direction) | MUST | `backend/app/api/routes.py` | API integration test + curl evidence | Planned |
| B-API-03 | — | 404 for unknown id; 422 for malformed id; no stack traces | OPT-ENG | `backend/app/api/errors.py` | Integration tests | Planned |
| B-ALG-01 | 11 | Algorithm **must** account for skill overlap with job's required skills | MUST | `backend/app/domain/matching.py` | Unit tests | Planned |
| B-ALG-02 | 11 | Algorithm **must** account for experience vs job minimum | MUST | `backend/app/domain/matching.py` | Unit tests (below/at/above min) | Planned |
| B-ALG-03 | 11 | Weights, traits, culture keywords, availability, tie-breaking: candidate's choice; must explain and defend | MUST (explain) | ADR-003, `backend/README.md` | Review | Planned |
| B-ALG-04 | — | Both directions use one scoring function; deterministic order | OPT-ENG | `matching.py` | Consistency test over all 90 pairs | Planned |
| B-DOC-01 | 11 | README with curl examples (or Postman) proving the API works | MUST | `backend/README.md` | Commands executed; output captured in `docs/testing/evidence/` | Planned |
| B-DOC-02 | 13 | README: install and run locally | MUST | `backend/README.md` | Clean-setup run | Planned |
| B-DOC-03 | 13 | README: few-paragraph decisions and trade-offs, especially matching | MUST | `backend/README.md` | Review | Planned |
| B-DOC-04 | 13 | README: where AI tools were used | MUST | `backend/README.md` | Review | Planned |
| B-BON-01 | 11 | Tests (nice bonus) | BONUS (our gate: required) | `backend/tests/` | `pytest` | Planned |
| B-BON-02 | 11 | API docs (nice bonus) | BONUS | FastAPI OpenAPI at `/docs` + `docs/architecture/api-contracts.md` | Manual check | Planned |
| B-OOS-01 | 11 | Frontend for the bot | OOS | — | — | n/a |
| B-SQLD-01 | 11–13 | Load the 4 supplied tables **as-is** (no redesign), with supplied rows | MUST | `backend/sql_detective/schema.sql`, `backend/sql_detective/seed.sql` (verbatim) | Row-count test (5/7/11/24); diff vs source | Planned |
| B-SQLD-02 | 13 | Q1: open postings + owning recruiter name | MUST | `backend/sql_detective/sql_detective.sql` | Result test vs expected set | Planned |
| B-SQLD-03 | 13 | Q2: per posting, number of applicants who reached Final | MUST | same | Result test | Planned |
| B-SQLD-04 | 13 | Q3: people who effectively applied to >1 posting (dirty data) | MUST | same | Result test (Ananya, Ben, Elena) | Planned |
| B-SQLD-05 | 13 | Q4: per-recruiter Final conversion (passed ÷ total Final), only recruiters with ≥3 Finals | MUST | same | Result test (Priya 0.75, Daniel 0.50) | Planned |
| B-SQLD-06 | 13 | Q5: window function, top recruiter by Final passes per department | BONUS | same | Result test | Planned |
| B-SQLD-07 | 13 | Single `.sql` file; one query per question; each preceded by a comment with the question number | MUST | same | Review | Planned |
| B-SUB-01 | 13 | Git repo link (public, or private with access) containing the Part 1 project | USER | — | — | Planned |
| B-SUB-02 | 13 | `sql_detective.sql` in the same repo | MUST | `backend/sql_detective/sql_detective.sql` | Review | Planned |
| B-TIME-01 | 14 | ~4 h budget; follow-up walkthrough with "what if" curveballs | USER (prep) | `docs/handoff/interview-guide.md` | — | Planned |

## C — Trip Splitter (pp. 15–19)

| ID | Page | Requirement | Class | Location | Evidence | Status |
|---|---|---|---|---|---|---|
| C-NAV-01 | 15 | Navbar links: Expenses (`/`), Add expense (`/expenses/new`); current page visibly marked | MUST | `frontend/src/app/Layout.tsx` | RTL test (`aria-current`) + manual | Planned |
| C-NAV-02 | 15 | Any other URL → simple "Page not found" with link to Expenses | MUST | `frontend/src/pages/NotFoundPage.tsx` | RTL test | Planned |
| C-FORM-01 | 15 | Description (text) field | MUST | `frontend/src/features/expenses/AddExpenseForm.tsx` | RTL | Planned |
| C-FORM-02 | 15 | Amount in ₹, up to 2 decimals | MUST | same | RTL + unit | Planned |
| C-FORM-03 | 15 | Paid by, chosen from trip members | MUST | same | RTL | Planned |
| C-FORM-04 | 15 | Date | MUST | same | RTL | Planned |
| C-FORM-05 | 15 | Category: Food, Travel, Stay, Activities, Other | MUST | same + `domain/types.ts` | RTL | Planned |
| C-FORM-06 | 15 | Split: Equally (selected members), Exact amounts (₹ per member), Percentages (per member) | MUST | same | RTL per mode | Planned |
| C-FORM-07 | 15 | Save adds the expense, then goes to Expenses with an "added" message | MUST | same + `pages/ExpensesPage.tsx` | RTL (successful save) | Planned |
| C-FORM-08 | 15 | Cancel goes back without saving | MUST | same | RTL | Planned |
| C-EXP-01 | 15 | Per-member balance: "gets back ₹X" / "owes ₹X" / "settled up" | MUST | `features/expenses/BalancesList.tsx` | RTL + unit (golden sample balances) | Planned |
| C-EXP-02 | 15 | Table, newest date first; columns Date, Description, Category, Paid by, Amount, Split (e.g. "Equally, 4 people") | MUST | `features/expenses/ExpensesTable.tsx` | RTL + unit (sort) | Planned |
| C-EXP-03 | 16 | Category filter; total of currently shown expenses | MUST | `pages/ExpensesPage.tsx` | RTL | Planned |
| C-EXP-04 | 16 | Delete after user confirms; balances update immediately | MUST | `ExpensesTable.tsx`, `expensesSlice.ts` | RTL (confirm yes/no) | Planned |
| C-EXP-05 | 16 | Clear empty state: no expenses; none in chosen category | MUST | `ExpensesPage.tsx` | RTL | Planned |
| C-VAL-01 | 16 | On Save: error next to **every** invalid field; save nothing | MUST | `domain/validation.ts`, form | Unit + RTL | Planned |
| C-VAL-02 | 16 | Description required, ≤ 60 chars | MUST | `validation.ts` | Unit (0, 60, 61 chars) | Planned |
| C-VAL-03 | 16 | Amount required, > ₹0, ≤ ₹10,00,000, ≤ 2 decimals; negative → **"Amount must be more than ₹0"** | MUST | `domain/money.ts`, `validation.ts` | Unit (exact string) | Planned |
| C-VAL-04 | 16 | Paid by, date, category required; date not in the future | MUST | `validation.ts` | Unit (injected today) | Planned |
| C-VAL-05 | 16 | Equal: at least one member selected | MUST | `validation.ts` | Unit | Planned |
| C-VAL-06 | 16 | Exact: each ≥ ₹0; sum equals amount exactly; else show left/over, e.g. **"₹12.50 left to assign"** | MUST | `validation.ts` | Unit (left / over / exact) | Planned |
| C-VAL-07 | 16 | Percent: each 0–100, ≤ 2 decimals; total exactly 100 | MUST | `validation.ts` | Unit | Planned |
| C-MONEY-01 | 16 | Balance = paid − own shares; positive = gets back | MUST | `domain/balances.ts` | Unit | Planned |
| C-MONEY-02 | 16 | Payer need not be in split | MUST | `balances.ts` | Unit (sample e5) | Planned |
| C-MONEY-03 | 16 | Never lose/invent a paisa; ₹100 ÷ 3 = 33.34 + 33.33 + 33.33 | MUST | `domain/allocation.ts` | Unit (required case) | Planned |
| C-MONEY-04 | 16 | One rule for the extra paisa, used everywhere, stated in README | MUST | `allocation.ts`, ADR-004, `frontend/README.md` | Unit + review | Planned |
| C-MONEY-05 | 16 | Balances sum to exactly ₹0 | MUST | `balances.ts` | Unit (sample + generated cases) | Planned |
| C-MONEY-06 | 16 | Indian number format, e.g. ₹1,00,000.00 | MUST | `domain/format.ts` | Unit | Planned |
| C-MONEY-07 | 16 | Amounts stored as integer paise (₹1,250.50 = 125050) | MUST | `domain/types.ts`, `money.ts` | Unit | Planned |
| C-DATA-01 | 16 | No backend; start from the supplied sample data (e.g. `src/data/sample-data.json`) | MUST | `frontend/src/data/sample-data.json` (verbatim) | Fidelity unit test | Planned |
| C-DATA-02 | 16 | Survive reload via `localStorage`; nothing saved / unreadable → sample data | MUST | `frontend/src/services/persistence.ts` | Unit + RTL reload simulation + manual | Planned |
| C-DATA-03 | 16–17 | Member `{id, name}`; Expense `id, description, amount (int paise), paidBy, date (YYYY-MM-DD), category, split` | MUST | `domain/types.ts` | Typecheck | Planned |
| C-DATA-04 | 17 | Split discriminated by `type`: equal `{memberIds}`, exact `{shares: paise}`, percent `{shares: percent}` | MUST | `domain/types.ts` | Typecheck + unit | Planned |
| C-DATA-05 | 17 | Write the TS types yourself | MUST | `domain/types.ts` | Review | Planned |
| C-TECH-01 | 18 | React + TypeScript, self-scaffolded (Vite suggested); React Router | MUST | `frontend/` | `npm run build` | Planned |
| C-TECH-02 | 18 | `"strict": true`; `npm run typecheck` zero errors | MUST | `frontend/tsconfig*.json` | Command output | Planned |
| C-TECH-03 | 18 | No `any`, `@ts-ignore`, `@ts-expect-error`; avoid `as` and `!` (comment if unavoidable) | MUST | All TS | ESLint rules + grep in acceptance | Planned |
| C-TECH-04 | 18 | Redux Toolkit holds members and expenses; typed `useAppDispatch`/`useAppSelector` | MUST | `frontend/src/store/` | Review + tests | Planned |
| C-TECH-05 | 18 | Where localStorage is read/written is your call; **say why in README** | MUST | ADR-005, `frontend/README.md` | Review | Planned |
| C-TECH-06 | 18 | Money parsing, splitting, balances, validation as plain TS functions testable without React | MUST | `frontend/src/domain/` | Unit tests import no React | Planned |
| C-TECH-07 | 18 | Vitest/Jest + RTL; at minimum split/balance logic incl. ₹100 ÷ 3, and form invalid-errors + valid-save | MUST | `frontend/src/**/*.test.ts(x)` | `npm test` | Planned |
| C-TECH-08 | 18 | ESLint with typescript-eslint; `npm run lint` passes | MUST | `frontend/eslint.config.js` | Command output | Planned |
| C-TECH-09 | 19 | No form/validation libraries; no component libraries | MUST | `frontend/package.json` | Dependency review | Planned |
| C-TECH-10 | 19 | Responsive to 360 px (table may scroll or become cards) | MUST | `frontend/src/styles/` | Manual at 360 px (browser pane) | Planned |
| C-TECH-11 | 19 | Visible labels; errors next to fields; whole app works by keyboard | MUST | Components | RTL (label queries) + manual keyboard pass | Planned |
| C-TECH-12 | 19 | Scripts: `dev`, `build`, `typecheck`, `lint`, `test` | MUST | `frontend/package.json` | Run each | Planned |
| C-SUB-01 | 19 | Runnable with `npm install` + `npm run dev` | MUST | `frontend/` | Clean-clone run | Planned |
| C-DOC-01 | 19 | README ≤ ~500 words: run + unfinished; 3 decisions + why; another-day improvements; AI use in 2–3 sentences | MUST | `frontend/README.md` | Word count + review | Planned |
| C-AI-01 | 19 | Candidate can explain every line; drives the live change without AI | USER (prep) | `docs/handoff/interview-guide.md` | — | Planned |
| C-OOS-01 | 19 | Visual polish, animations, extra features: not evaluated | OOS | — | — | n/a |

## OPT-ENG — Engineering recommendations (not recruiter requirements)

| ID | Recommendation | Location | Status |
|---|---|---|---|
| E-01 | Monorepo root README with quick-starts | `README.md` | Planned |
| E-02 | `.gitignore`, `.gitattributes` (LF), `.editorconfig`, `.env.example` files; never commit `.env` or source PDF/MD | root + packages | Planned |
| E-03 | Tiny handwritten-SQL migration runner with a `schema_migrations` table | `backend/scripts/migrate.py` | Planned |
| E-04 | `GET /health` for container healthcheck | `backend/app/api/routes.py` | Planned |
| E-05 | Docker Compose: PostgreSQL (+ optional API service); backend Dockerfile, non-root | `compose.yaml`, `backend/Dockerfile` | Planned |
| E-06 | Ruff (lint + format) and mypy for backend | `backend/pyproject.toml` | Planned |
| E-07 | ESLint `no-floating-promises` in `qa/` to enforce "every call awaited" | `qa/eslint.config.js` | Planned |
| E-08 | Architecture docs (HLD/LLD/ERD/API), ADRs, test strategy, interview guide | `docs/` | In progress |
| E-09 | Generated-case invariant tests for money (seeded PRNG, no extra library) | `frontend/src/domain/*.test.ts` | Planned |
| E-10 | Least-privilege DB role for the app | `compose` init script | Planned (optional; see ADR-006) |

## OOS — Deliberately excluded

Microservices, auth, caching, pagination, CI pipelines, cloud deployment, Kubernetes, a frontend container, multi-browser QA, persisted match tables, fuzzy/synonym skill matching, and a members editor in Trip Splitter.
