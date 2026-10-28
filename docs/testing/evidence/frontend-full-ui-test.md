# Trip Splitter: full UI test (2026-10-28)

Run against `npm run dev` in an embedded Chromium browser. Each check read the live page: URL, heading, rows, balances, notices, field errors, focus and stored data. A snapshot script also summed every displayed balance after each change, to check the ₹0 invariant.

**Method notes**
- Form fields were driven through their real DOM events (native value setter + `input`/`change`, real `click()`), so React's own handlers ran. Several flows also used real key presses.
- The native `window.confirm` dialog blocks automation, so it was replaced in the page by a stand-in that records the question and answers yes or no. The app's delete handler is otherwise unchanged. Both answers are also covered by component tests.

## Results

| Area | Check | Result |
|---|---|---|
| Start-up | Cleared storage → sample data | 6 expenses newest first, ₹42,249.99, balances as in the brief's data, sum 0 ✅ |
| Navigation | Navbar both ways | URL, `<h1>`, tab title and focus (to `<h1>`) change; active link bold, underlined, `aria-current="page"` ✅ |
| Navigation | `/some/unknown/page` | "Page not found", no active nav link, "Back to Expenses" works ✅ |
| Validation | Empty form → Save | Alert + errors beside Description, Amount, Paid by, Category; all `aria-invalid` and linked via `aria-describedby`; focus to Description; nothing saved ✅ |
| Validation | Description | 60 chars OK; 61 → "at most 60 characters"; spaces only → "required" ✅ |
| Validation | Amount | `-5`, `0`, `0.00` → **"Amount must be more than ₹0"**; `1.234` → decimals; `abc`, `1,250` → format; `1000000.01` → "at most ₹10,00,000.00"; `1000000`, `0.01`, `1250.5` OK ✅ |
| Validation | Date | tomorrow → "cannot be in the future"; empty → "required"; today and 2024-02-29 OK ✅ |
| Validation | Equal split | nobody selected → "Select at least one member to split between" ✅ |
| Validation | Exact split | 50 + 37.50 of ₹100 → **"₹12.50 left to assign"**; 60 + 45 → "₹5.00 over the total"; −10 → "Must be ₹0 or more"; 1.005 → "At most 2 decimal places"; all blank → "₹100.00 left to assign" ✅ |
| Validation | Percent split | 33.33 × 3 → "add up to 99.99%"; 50 + 60 → "110%"; 120 / −1 → "between 0 and 100"; 10.125 → decimals ✅ |
| Form | Mode switching | Each mode keeps its own typed values; labels "Aarav (₹)" / "Aarav (%)" ✅ |
| Save | Equal ₹1,000 between Aarav, Diya, Kabir, **paid by Rohan** (outside the split) | Stored `equal [m1,m2,m3]`; Aarav carries the extra paisa ✅ |
| Save | Exact ₹2,500.50 = 1,250.25 + 1,250.25 | Stored `{m4:125025, m5:125025}`; "Exact amounts, 2 people" ✅ |
| Save | Percent ₹333.33 at 33.33/33.33/33.34 | Stored `{m1:33.33, m2:33.33, m3:33.34}`; leftover 2 paise to the largest remainders ✅ |
| Balances | After the three saves | Aarav +₹18,443.09, Diya −₹4,140.21, Kabir +₹109.62, Meera −₹6,862.25, Rohan −₹7,550.25. **Identical to the hand calculation**; sum 0; total ₹46,083.82 ✅ |
| Cancel | Typed values, then Cancel | Back on `/`, nothing saved ✅ |
| Filter | Every category | Food 2 / ₹4,250.00 · Travel 4 / ₹4,833.32 · Stay 1 / ₹24,000.00 · Activities 2 / ₹13,000.50 · Other → empty state → "Show all categories" restores; balances unaffected ✅ |
| Delete | Confirm = no | Expense kept ✅ |
| Delete | Confirm = yes | Removed at once; balances back to the exact pre-expense values; "Deleted …" notice; focus to "All expenses" ✅ |
| Persistence | Reload | Changes kept; notices not replayed ✅ |
| Persistence | Delete everything, reload | "No expenses yet." + link; filter hidden; everyone "settled up"; empty list kept after reload ✅ |
| Persistence | Tampered record (amount −500) | Rejected; sample data shown; tampered text never displayed ✅ |
| Responsive | 360 px: Expenses, form in all 3 modes, form with all errors, 404 | Nothing past 360 px; table scrolls inside its card ✅ |
| Responsive | 768 px | **Issue found:** table (720 px min) clipped the Delete column. **Fixed:** min-width 640 px → whole table visible ✅ |
| Accessibility | Tap targets | **Issue found:** 404 "Back to Expenses" was under 24 px tall. **Fixed:** button style, 44 px ✅ |
| Keyboard | Skip link, delete, dismiss | Skip link first and visible, moves focus to `<main>`; Enter on a Delete button deletes after confirm; Shift+Tab → Dismiss → Enter closes the notice ✅ |
| Console | Whole session | No errors or warnings ✅ |

After the two fixes: `npm run typecheck`, `npm run lint`, `npm test` (132/132) and `npm run build` all pass.

## Noted, not changed

- **Amounts with thousands separators (`1,250`) are rejected** with "Enter an amount in rupees, for example 1250.50". This is the strict format chosen in Phase 0 (source audit I17). Accepting `1,250` and Indian-style `1,00,000` would be friendlier; it is a small change to `parseHundredths` if wanted.
