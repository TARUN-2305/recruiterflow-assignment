# Low-Level Design (proposal, Phase 0)

Final names may change slightly during implementation; this document will be updated to match the code.

---

## Part B — Recruiter Bot (`backend/`)

### B.1 Modules and dependency direction

```
app/
├── main.py            # create_app(): FastAPI app, routers, exception handlers
├── config.py          # Settings from env (DATABASE_URL) — no secrets in code
├── api/
│   ├── routes.py      # GET /health, /jobs/{id}/matches, /candidates/{id}/matches
│   ├── schemas.py     # Pydantic response DTOs
│   └── errors.py      # NotFoundError → 404; catch-all → 500 {"detail": "Internal server error"}
├── services/
│   └── matching_service.py   # use-cases: matches_for_job(conn, id), matches_for_candidate(conn, id)
├── domain/
│   ├── models.py      # frozen dataclasses: CandidateProfile, JobProfile, MatchResult, ScoreBreakdown
│   └── matching.py    # score_pair(), rank_key(), build_reason(), round_half_up(); named weight constants
├── repositories/
│   ├── candidates.py  # get_candidate_profile(conn, id), list_candidate_profiles(conn)
│   └── jobs.py        # get_job_profile(conn, id), list_job_profiles(conn)
└── db/
    └── connection.py  # get_connection() FastAPI dependency (yield psycopg.Connection)
migrations/001_recruiter_bot_schema.sql
scripts/migrate.py · scripts/seed.py · scripts/load_sql_detective.py
seed/recruiter_bot_seed.json
sql_detective/schema.sql · seed.sql · sql_detective.sql
tests/unit/ · tests/integration/
```

Dependency direction is `api → services → (domain, repositories) → db`.
- `domain` imports nothing from the other layers.
- `repositories` return domain models, never raw tuples.
- Routes never contain SQL.

### B.2 Domain models

```python
Availability = Literal["Immediate", "2 weeks", "Not looking"]

@dataclass(frozen=True)
class CandidateProfile:
    id: int; name: str; years_experience: int; availability: Availability
    skills: tuple[str, ...]; traits: tuple[str, ...]; quirk: str

@dataclass(frozen=True)
class JobProfile:
    id: int; title: str; min_experience: int
    required_skills: tuple[str, ...]; culture_keywords: tuple[str, ...]; tagline: str

@dataclass(frozen=True)
class MatchResult:
    candidate: CandidateProfile; job: JobProfile
    score: Fraction                      # exact; rounded only in the DTO
    skill_fraction: Fraction; experience_fraction: Fraction
    culture_fraction: Fraction; availability_fraction: Fraction
    matched_skills: tuple[str, ...]; missing_skills: tuple[str, ...]
    matched_keywords: tuple[str, ...]
    reason: str
```

Tuples keep the source order, so reasons list skills in the job's order.

### B.3 Scoring (see ADR-003)

```python
SKILL_WEIGHT, EXPERIENCE_WEIGHT, CULTURE_WEIGHT, AVAILABILITY_WEIGHT = 50, 30, 10, 10
AVAILABILITY_FRACTION = {"Immediate": Fraction(1), "2 weeks": Fraction(1, 2), "Not looking": Fraction(0)}

def score_pair(c: CandidateProfile, j: JobProfile) -> MatchResult: ...
def rank_key(r: MatchResult, display_name: str, entity_id: int) -> tuple: 
    return (-r.score, -r.skill_fraction, -r.experience_fraction, display_name.casefold(), entity_id)
def round_half_up(x: Fraction, places: int = 1) -> Decimal: ...
```

### B.4 Repository SQL (illustrative; parameter `%s` only)

```sql
-- get_job_profile
SELECT j.id, j.title, j.min_experience, j.tagline,
       COALESCE(ARRAY(SELECT s.name FROM job_required_skills js JOIN skills s ON s.id = js.skill_id
                      WHERE js.job_id = j.id ORDER BY js.position), '{}') AS required_skills,
       COALESCE(ARRAY(SELECT t.name FROM job_culture_keywords jk JOIN tags t ON t.id = jk.tag_id
                      WHERE jk.job_id = j.id ORDER BY jk.position), '{}') AS culture_keywords
FROM jobs j
WHERE j.id = %s;
```

`list_candidate_profiles` uses the same pattern without the `WHERE`, `ORDER BY c.id`. Correlated `ARRAY(...)` subqueries avoid the row multiplication you would get from joining two junction tables at once (the same trap Q2 warns about). Reads use autocommit or a single short transaction. No writes happen at runtime.

### B.5 Transactions

- `migrate.py`: each migration file and its `schema_migrations` insert run in one transaction.
- `seed.py`: the whole seed is one transaction (`with conn.transaction():`), and row counts are asserted before commit.
- API: read-only.

### B.6 Error model

| Case | Status | Body |
|---|---|---|
| Non-integer / ≤ 0 id | 422 | FastAPI validation body (`detail: [...]`) |
| Unknown id | 404 | `{"detail": "Job 42 not found"}` / `{"detail": "Candidate 42 not found"}` |
| DB unreachable / unexpected | 500 | `{"detail": "Internal server error"}`. Logged server-side without the connection string. |
| `GET /health` | 200 | `{"status": "ok"}`. Optional `SELECT 1`; returns 503 if the DB is down. |

### B.7 Seed loader

1. `json.load`, then Pydantic models (`SeedCandidate`, `SeedJob`). Rejects unknown availability values, negative years and duplicate ids.
2. A fidelity test compares the JSON with a golden copy of the PDF table (`tests/unit/test_seed_fidelity.py`).
3. SQL steps:
   - `INSERT INTO skills (name) VALUES (%s) ON CONFLICT (name) DO NOTHING`
   - `INSERT INTO candidates (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET ... = EXCLUDED....`
   - `DELETE FROM candidate_skills WHERE candidate_id = %s`, then insert with `(SELECT id FROM skills WHERE name = %s)` and `position`.

---

## Part C — Trip Splitter (`frontend/src/`)

### C.1 Layout

```
src/
├── main.tsx                     # createRoot, <Provider>, <BrowserRouter>
├── app/App.tsx                  # <Routes>: "/", "/expenses/new", "*"
├── app/Layout.tsx               # <header><nav> NavLink×2 (aria-current) + <main><Outlet/>
├── data/sample-data.json        # verbatim from PDF
├── domain/                      # pure TS, no React imports
│   ├── types.ts                 # Member, Category, Split, Expense, ExpenseDraft, FieldErrors
│   ├── money.ts                 # parseRupeesToPaise, parsePercentToBasisPoints, percentNumberToBasisPoints
│   ├── allocation.ts            # allocate(), sharesFor(expense, members)
│   ├── balances.ts              # computeBalances(), describeBalance()
│   ├── format.ts                # formatINR(), describeSplit()
│   ├── expenses.ts              # sortNewestFirst(), filterByCategory(), totalOf()
│   ├── validation.ts            # validateExpenseDraft(draft, members, today, newId)
│   └── parsePersisted.ts        # isExpense()/parseExpenses(unknown) type guards (shared by sample + storage)
├── store/
│   ├── index.ts                 # makeStore(preloaded), RootState, AppDispatch
│   ├── hooks.ts                 # useAppDispatch = useDispatch.withTypes<AppDispatch>() etc.
│   ├── membersSlice.ts          # initial = sample members
│   ├── expensesSlice.ts         # expenseAdded, expenseDeleted
│   └── selectors.ts             # selectSortedExpenses, selectBalances (createSelector)
├── services/persistence.ts      # loadExpenses(storage), startPersistence(store, storage)
├── features/expenses/           # AddExpenseForm, SplitFields, BalancesList, ExpensesTable, CategoryFilter
├── pages/                       # ExpensesPage, AddExpensePage, NotFoundPage
└── styles/                      # app.css (+ small per-feature css)
```

### C.2 Types

```ts
export type MemberId = string;
export interface Member { id: MemberId; name: string }
export const CATEGORIES = ['Food', 'Travel', 'Stay', 'Activities', 'Other'] as const; // `as const` is a literal assertion, not a type cast
export type Category = (typeof CATEGORIES)[number];
export type Paise = number;                    // integer, validated
export type Split =
  | { type: 'equal'; memberIds: MemberId[] }
  | { type: 'exact'; shares: Record<MemberId, Paise> }
  | { type: 'percent'; shares: Record<MemberId, number> };   // percent, ≤ 2 dp
export interface Expense {
  id: string; description: string; amount: Paise; paidBy: MemberId;
  date: string /* YYYY-MM-DD */; category: Category; split: Split;
}
```

> `as const` (a const assertion) does not count as a type cast in the brief's sense. It is noted in the README to pre-empt the question.

### C.3 Redux state

```ts
{ members: { list: Member[] }, expenses: { items: Expense[] } }   // items in insertion order
```

- Reducers: `expenseAdded(Expense)` pushes onto the list; `expenseDeleted(id)` filters it out.
- Selectors: `selectMembers`, `selectExpenses`, `selectSortedExpenses` (date desc, then insertion index desc), and `selectBalances` (memoised; returns `{ memberId, name, paise }[]` in member order).
- The filtered list and total are computed in the page with `useMemo(filterByCategory(...))`, because the filter is local state.

### C.4 Form model

- Draft state: `{ description, amount, paidBy, date, category, splitType, equalSelected: Record<MemberId, boolean>, exactInputs: Record<MemberId, string>, percentInputs: Record<MemberId, string> }`. It is managed by `useReducer`, all fields are raw strings or booleans, and the per-mode inputs persist when the user switches split type.
- Defaults: empty fields, `date` = today, all members selected for Equal.
- `validateExpenseDraft` returns `{ ok: true; expense } | { ok: false; errors: FieldErrors }`, where `FieldErrors` = `Partial<Record<'description'|'amount'|'paidBy'|'date'|'category'|'split', string>> & { shares?: Record<MemberId, string> }`.
- Rules (C-VAL-01..07):
  - Every field is validated independently, so all errors appear at once.
  - Split errors are computed only when the amount parses, because left/over needs the total. Otherwise the split shows per-share format errors only.
  - The exact sum message reads `"₹12.50 left to assign"` or `"₹12.50 over the total"`.
  - Percent sum message: `"Percentages add up to 90%; they must total 100%"`.
- Accessibility:
  - `<form noValidate>`. Every control has a `<label htmlFor>`.
  - Errors sit in `<p id="…-error">` next to their field, linked with `aria-describedby`, and the field gets `aria-invalid`.
  - On a failed submit, focus moves to the first invalid control.
  - Split type is a `<fieldset><legend>` of radios. Member checkboxes and inputs are labelled with member names.
- Cancel: `navigate('/')`. Save: dispatch, then `navigate('/', { state: { notice: 'Expense "Dinner" added.' } })`.

### C.5 Expenses page

- The notice comes from `location.state`. It is copied into local state, then `navigate('.', { replace: true, state: null })`. It is shown in a `role="status"` region.
- Balances: a list of "Aarav — gets back ₹18,554.20".
- Filter: `<label>Category <select>` with "All" plus 5 options.
- Total: "Showing N expenses · Total ₹X".
- Table: `<table>` with `<caption>`, `<th scope="col">`, and a delete `<button aria-label="Delete Villa booking">` → `window.confirm('Delete "Villa booking"?')` → dispatch.
- Empty states:
  - no expenses → "No expenses yet." plus a link to Add expense
  - filter has no rows → "No expenses in Food." plus a "Show all" button
- At ≤ 640 px the table sits in a horizontally scrollable `<div role="region" aria-label="Expenses" tabIndex={0}>`, so keyboard users can scroll it.

### C.6 Allocation, balances, formatting

See ADR-004 for the algorithms. `sharesFor(expense, members)` returns `Record<MemberId, Paise>` for any split type. It is the single function used by balances (and by tests).

### C.7 ESLint

typescript-eslint `strictTypeChecked` with these rules:
- `@typescript-eslint/no-explicit-any`: error
- `ban-ts-comment`: error
- `no-non-null-assertion`: error
- `consistent-type-assertions: { assertionStyle: 'never' }`: error, with a documented disable comment if ever unavoidable
- react-hooks rules

---

## Part A — QA (`qa/`)

See ADR-007. Fixtures are Playwright's built-in `page` and `request`. `LoginPage` is a class wrapping `page` with `goto()`, `login(username, password)`, `error` (a Locator). There are no custom fixtures unless they remove real repetition.

### Edge / error paths covered across parts

- **Backend:**
  - unknown or invalid ids
  - DB down → 500/503
  - a job with min_experience 0 (guard)
  - a candidate with no skills (gate)
  - a duplicate seed run
- **Frontend:**
  - corrupt or old localStorage
  - storage quota errors
  - a deleted member reference
  - amounts like `"-5"`, `"0"`, `"1.234"`, `"abc"`, `"1000000.01"`
  - exact shares over or under the total
  - percent totalling 99.99
  - future date
  - a description exactly 60 and 61 characters long
  - deleting the last expense → empty state
  - a filter with no rows
- **QA:**
  - missing API key → explicit skip
  - external site down → test failure, reported honestly
