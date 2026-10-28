# Trip Splitter: manual checks (2026-10-28)

Environment: `npm run dev` (Vite 8.3.4) opened in an embedded Chromium browser pane, localStorage cleared first. Everything below was observed directly, not inferred.

| Check | How | Result |
|---|---|---|
| First load uses the sample data | Cleared localStorage, reloaded | 6 expenses, total ₹42,249.99. Balances: Aarav gets back ₹18,554.20, Diya owes ₹3,695.78, Kabir gets back ₹554.08, Meera owes ₹8,112.50, Rohan owes ₹7,300.00 |
| Active page is visibly marked | Looked at both pages | Current link is bold, blue, underlined and on a tinted background; `aria-current="page"` set |
| 360 px width, Expenses page | Viewport emulated at 360×740 | Header wraps, one balance per row, no element extends past 360 px. The table (720 px minimum at the time; 640 px since the full UI test) scrolls sideways inside its own focusable region (allowed by the brief) |
| 360 px width, Add expense form | Same | All fields full width; no element extends past 360 px |
| Keyboard only: add an expense | Tab, typing, arrow keys, Space and Enter only | Focus order: skip link → Expenses → Add expense → Description → Amount → Paid by → Date (4 native stops) → Category → split radios → member checkboxes → Save. Unticked Rohan with Space; Enter on Save submitted |
| After save | Same flow | Back on `/` with focus on the "Expenses" heading. Notice: "Added “Kayak rental” (₹1,000.00)." New row first: "28 Oct 2026 · Kayak rental · Activities · Diya · ₹1,000.00 · Equally, 4 people". Diya now owes ₹2,945.78 (= −3,695.78 + 1,000 − 250) |
| Survives reload | `location.reload()` | Still 7 rows with the same balances; the "Added" notice did **not** reappear |
| Unreadable saved data | Set the storage key to `{corrupt`, reloaded | Fell back to the sample data (6 expenses, ₹42,249.99) |
| Validation display | Amount `-5`, Aarav exact share `1.234`, Save | Alert "Some fields need attention. Nothing has been saved yet." Errors under each field: Description is required · Amount must be more than ₹0 · Choose who paid · Choose a category · At most 2 decimal places (Aarav). Focus moved to Description |
| Console | Read browser console after all of the above | No errors or warnings (only Vite/React dev info lines) |
| Production build | `npm run build` | typecheck passed; 126 modules; JS 303.90 kB (97.46 kB gzip), CSS 5.72 kB |

Not checked manually: the delete confirmation dialog, because a native `window.confirm` blocks the automated browser. It is covered by component tests for both confirm = yes and confirm = no (`src/pages/ExpensesPage.test.tsx`).
