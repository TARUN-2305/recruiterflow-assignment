# ADR-005 — Trip Splitter state ownership and localStorage persistence

- **Status:** Accepted and implemented (M1–M7, 2026-10-28).
- **Mandated by brief?**
  - Redux Toolkit holds members and expenses, with typed hooks (p. 18).
  - Expenses survive reload via `localStorage`; if nothing is saved, or the saved data can't be read, use the sample data (p. 16).
  - "Where you read and write localStorage is your call; say why in the README."

## Decision

### What lives where

| State | Owner | Why |
|---|---|---|
| `members` (5 fixed) | Redux `membersSlice` (initialised from sample data; no reducers that modify it) | Brief requires members in Redux. There is no UI to edit them. |
| `expenses` | Redux `expensesSlice` (`expenseAdded`, `expenseDeleted`) | Shared by the Expenses page (table, balances) and the form (on save). |
| Balances, sorted and filtered lists, totals | **Derived** with memoised selectors (`createSelector`) over pure domain functions | Never stored, so they can never go stale. "Balances update straight away" comes for free. |
| Form draft (raw strings, split mode, per-member inputs, errors) | **Component state** (`useState` in `AddExpenseForm`) | Local and ephemeral. Redux only ever receives a fully validated `Expense`. |
| Category filter | Component state on the Expenses page | View-only concern; not required to survive navigation. |
| "Expense added" message | Router navigation state (`navigate('/', { state: { notice } })`), read once and then cleared with `replace` | A one-shot message tied to the navigation. Clearing it means a reload or Back doesn't replay it. It keeps transient UI out of Redux. |

### Persistence boundary: `src/services/persistence.ts`

- **Read once, at store creation:** `loadExpenses(storage, members) → Expense[] | null`. It reads inside `try` (storage can throw), runs `JSON.parse` inside `try`, checks `version === 1`, then calls `parseExpenses(unknown, members)` from `src/domain/parse.ts`. `createAppStore(storage)` uses the sample data whenever the result is `null`.
- **Write via a single store subscriber:** `startPersistence(store, storage)` subscribes to the store. When `state.expenses` changes (reference check), it writes `{ "version": 1, "expenses": [...] }` under the key `trip-splitter:v1`. Writes are wrapped in `try/catch` (quota exceeded, private mode); a failure is logged and the app keeps working in memory.
- `storage` is injected (a `Pick<Storage, 'getItem' | 'setItem'>`), so tests use an in-memory fake.
- **Components never touch localStorage.**

### Defensive validation of saved state (no casts)

`parseExpenses(value: unknown, members)` (and `parseTripData` for the sample file) uses type guards to narrow `unknown`, with no `as`. It checks:
- the version
- that `expenses` is an array
- per expense: non-empty string ids, unique ids, description 1–60 chars, safe-integer amount in 1…100,000,000, `paidBy` ∈ members, `date` is a real `YYYY-MM-DD` calendar date, `category` ∈ the 5 values
- `split`:
  - equal: non-empty, unique, known member ids
  - exact: known ids, integer paise ≥ 0, sum = amount
  - percent: known ids, 0–100 with ≤ 2 decimals, sum = 10000 bp

**All-or-nothing:** if any record is invalid, we fall back to the sample data. This is predictable and easy to explain; partial salvage could silently drop a user's expense while keeping others.
The **same validator runs on `sample-data.json`** at startup, so the JSON import is narrowed to typed data without a cast. A unit test proves the sample passes.

Date-not-in-future is **not** applied to stored data. It is a form-entry rule, and stored data shouldn't become invalid as the clock moves.

### What is persisted

Expenses only. Members always come from the sample data (they can't change). This keeps the stored schema minimal. If saved expenses reference a member id that doesn't exist, validation fails and we fall back to the sample.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| `redux-persist` | An extra dependency that hides the boundary we're asked to explain. It also doesn't validate. |
| RTK listener middleware (`createListenerMiddleware`) for writes | Also clean, and it could target only the `expenseAdded`/`expenseDeleted` actions. `store.subscribe` is simpler to explain for one slice. Either is defensible; the listener is a ready alternative if the interviewer prefers action-based writes. |
| Reading/writing localStorage inside reducers | Reducers must be pure; side effects there are a Redux anti-pattern. |
| Reading/writing in components (`useEffect`) | Scatters storage logic and races between pages. |
| Flash message in Redux `ui` slice | Works, but it puts throw-away UI state in the global store, and the brief evaluates "how state is split". Router state is a better fit. |
| Category filter in URL `?category=` | Nice-to-have (shareable, survives reload) but not asked for. A small optional upgrade. |
| Partial recovery of valid records | Unpredictable for users; harder to test and explain. |

## Consequences

- One file explains persistence end-to-end, so the README rationale is a single paragraph.
- Tests:
  - load valid → state restored
  - load corrupt JSON / wrong version / bad record → sample
  - add or delete → storage written
  - storage throwing → app still works
  - an RTL "reload" test: render, add an expense, unmount, render again with the same fake storage → the expense is still there.
