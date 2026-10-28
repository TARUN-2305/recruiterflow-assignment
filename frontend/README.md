# Trip Splitter

Record shared trip expenses, split them three ways (equally, exact amounts, percentages) and see who owes whom. React, Redux Toolkit, strict TypeScript, React Router and `localStorage`.

## 1. Run it

You need **Node.js 22.22 or newer** (React Router 8 requires it).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run typecheck  # tsc, strict
npm run lint       # ESLint + typescript-eslint
npm run build
```

Everything in the brief is implemented. Not finished: there is no way to edit an expense or the trip members (the brief doesn't ask for either).

**Extra-paisa rule.** Each person first gets their share rounded down to the paisa. The few leftover paise go one each to whoever lost the most in rounding. On a tie, they go to whoever comes first in the member list (Aarav, Diya, Kabir, Meera, Rohan). So ₹100 split equally between three is ₹33.34 + ₹33.33 + ₹33.33. Equal and percentage splits both use this one rule (`src/domain/allocation.ts`).

## 2. Three decisions

**All money logic is plain TypeScript in `src/domain/`, with integers only.** Amounts are integer paise and percentages are basis points (33.33% = 3333). Input is parsed from the typed text, so `"1250.50"` becomes `125050` without any floating-point maths. Because each expense's shares always add up to its amount, balances always total exactly ₹0. Tests check this over the sample data and 500 generated trips, as well as ₹100 ÷ 3. Components only render and handle events.

**Redux holds only members and expenses; everything else is derived or local.** Balances and the newest-first list come from memoised selectors, so they can't fall out of sync. The form's half-typed values live in the form component. Redux only ever receives a fully validated expense. The category filter is page state, and the "Expense added" message travels with the navigation.

**localStorage is read and written in one file, `src/services/persistence.ts`.** It reads once, when the store is created. The saved data is checked record by record without type casts; if anything is missing or invalid, the app starts from the sample data. It writes from a single store subscription whenever the expenses change. Keeping this out of components and reducers means one place to read, test and change, and reducers stay pure. The same validator also checks `sample-data.json` at startup.

## 3. With another day

- Editing an expense, reusing the same form.
- A "settle up" view: the fewest payments that clear every balance.
- A table that becomes cards on phones; today it scrolls sideways below about 720 px.
- Browser end-to-end tests (Playwright) for the full add, reload and delete flow.

## 4. AI use

I used Claude Code, an AI coding assistant. It helped plan the design, draft the code and tests, and check the app in a browser at 360 px and with a keyboard. I chose the approach and reviewed every file, and I can explain and change any part of it without the assistant.
