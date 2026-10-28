# Test Strategy (proposal, Phase 0)

Principle: test **behaviour at the boundaries the brief cares about**, meaning money correctness, scoring policy, SQL answers, and the five QA scenarios. Avoid tests that only mirror the implementation. Never weaken a test or a lint rule to get a pass.

## Section A — QA

| Layer | What | Tool |
|---|---|---|
| Required | A-UI-01..03, A-API-03..04 (5 tests) | Playwright, live sites |
| Bonus | remove-from-cart, logout, GET /users/23 → 404, `LoginPage` | Playwright |
| Static | `tsc --noEmit`; ESLint `no-floating-promises` (proves "every call awaited") | npm scripts `typecheck`, `lint` |

Acceptance:
- `npx playwright test` is green with a key set.
- With no key, the API tests show as **skipped with a reason**, and this is documented.
- Every test has ≥ 1 `expect`.
- Each test is run once against the live sites and the output is saved to `docs/testing/evidence/qa-run.txt` (no secrets).

## Section B — Recruiter Bot

| Layer | Examples | Needs DB |
|---|---|---|
| **Unit — scoring** | full / partial / zero overlap (gate → 0); years below / exactly at / above min; min = 0 guard; each availability value (Not looking penalised, not excluded); culture none / some / all; `calm` ≠ `calm-under-pressure`; rounding half-up boundaries (e.g. 73.25 → 73.3, 73.24 → 73.2); tie-break order (score → coverage → experience → name → id); reasons list exactly the matched/missing items | No |
| **Unit — seed fidelity** | JSON has 15 / 6 records; golden comparison of every field against a hand-checked copy of the PDF tables; no U+200B; ids unique | No |
| **Integration — DB** | migrate on an empty DB; seed **twice** → counts 15/6 and junction counts unchanged; constraint violations rejected (bad availability) | Yes (`recruiter_bot_test`) |
| **Integration — HTTP** | both endpoints 200 with sorted ranks; 404 unknown; 422 invalid; **90-pair consistency** (job view == candidate view per pair); top match sanity (job 1 → Sherlock 95.0) | Yes |
| **SQL Detective** | load verbatim files into a fresh schema; row counts 5/7/11/24; each of Q1–Q5 equals the expected set from `source-audit.md` §6 | Yes |
| Static | `ruff check`, `ruff format --check`, `mypy app` | No |

DB test isolation: a session fixture drops and recreates the schema in `recruiter_bot_test`, then runs the migrations. Tests never touch the dev DB. If `TEST_DATABASE_URL` is unset, integration tests are **skipped with a visible reason**. The unit suite stays runnable without Docker.

## Section C — Trip Splitter

| Layer | Examples |
|---|---|
| **Unit — money** | `parseRupeesToPaise`: `"1250.50"`→125050, `"0.01"`→1, `"1000000"`→100000000, `"1000000.01"` → max error, `"-5"` → exact text **"Amount must be more than ₹0"**, `"0"` → same, `"1.234"` → decimals error, `""` → required, `"abc"` → format; percent parsing including `"33.33"` → 3333 and `"100.01"` → error; `percentNumberToBasisPoints(33.33)` → 3333 |
| **Unit — allocation** | **₹100 ÷ 3 → 3334 / 3333 / 3333 (m1 gets the extra)**; ₹0.02 ÷ 3; 1 paisa ÷ 5; percent e6 → 49995 / 49995 / 50009; key-order independence (e4); Σ shares = amount for every case |
| **Unit — balances** | sample golden balances (+1855420, −369578, +55408, −811250, −730000); payer-not-in-split (e5); **Σ = 0 over sample and ~1,000 generated expenses** (seeded PRNG, all three split types); `describeBalance` wording, including "settled up" |
| **Unit — format** | `formatINR`: 0 → ₹0.00; 1 → ₹0.01; 100000 → ₹1,000.00; 10000000 → ₹1,00,000.00; 4224999 → ₹42,249.99; 1234567890 → ₹1,23,45,678.90; cross-checked against `Intl.NumberFormat('en-IN')`; `describeSplit` → "Equally, 4 people", "Exact amounts, 3 people", "Percentages, 3 people", "…, 1 person" |
| **Unit — validation** | each rule C-VAL-02..07 (60 vs 61 chars; future date with injected `today`; equal with none selected; exact left / over / exact ("₹12.50 left to assign"); percent 0–100, 2 dp, total 100); **all errors reported at once**; a valid draft → a correctly shaped `Expense` (zero shares omitted) |
| **Unit — persistence** | valid round-trip; missing key → null; corrupt JSON / wrong version / unknown member / bad split sum → null; storage `setItem` throwing → no crash; sample data passes the validator |
| **Component (RTL)** | navbar active link (`aria-current="page"`); unknown route → Not found + link; **invalid submit shows errors beside every invalid field and dispatches nothing**; **valid submit adds the expense, navigates to `/` and shows the notice**; Cancel saves nothing; delete with `confirm` → false keeps the row, → true removes it and balances update; category filter + total; both empty states; reload simulation via shared fake storage |
| Static | `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm run build` |
| Manual | 360 px width in the browser pane; keyboard-only pass (Tab order, Enter/Space, focus to first error); reload persistence in a real browser |

## Whole-repo release gate

This follows CLAUDE.md §7. Each item is recorded with command output in `docs/testing/results.md`:
- clean installs
- all lint / type / test / build scripts
- migrate + seed twice
- SQL Detective results
- curl output for both endpoints
- the live QA run
- frontend reload + responsive check
- `git status` hygiene (no `.env`, PDF, MD transcription, DB files, `dist/`, `playwright-report/`)
- README word count and truthfulness review
- traceability statuses updated
