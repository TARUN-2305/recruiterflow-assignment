# ADR-004 — Trip Splitter money representation, allocation and rounding

- **Status:** Accepted and implemented (M1–M7, 2026-10-28).
- **Mandated by brief?**
  - Amounts are stored as **integer paise** (p. 16).
  - Never lose or invent a paisa; ₹100 ÷ 3 = 33.34 + 33.33 + 33.33.
  - Pick a rule for the extra paisa, use it **everywhere**, and state it in the README.
  - Balances sum to exactly ₹0.
  - Display in Indian format.
- The specific rule and algorithms are our choice.

## Decision

### Representation

| Quantity | Type at runtime | Stored shape (source-faithful) |
|---|---|---|
| Expense amount | integer paise (`number`, `Number.isSafeInteger`) | `amount: 125050` |
| Exact share | integer paise | `shares: { m1: 50000 }` |
| Percentage | **integer basis points** (1% = 100 bp) | stored as the source shape `shares: { m1: 33.33 }`; converted to bp on read, and back to a number only for storage |
| Balance | integer paise (signed) | derived, never stored |

- **No floating-point arithmetic is used in money calculations.** Integers are exact in JS up to 2⁵³. The largest intermediate value is `amount × bp ≤ 10⁸ × 10⁴ = 10¹²`, which is far below 2⁵³ ≈ 9 × 10¹⁵, so `bigint` is unnecessary. A guard asserts safe integers anyway.
- Percent numbers are converted to bp by **string parsing** (`String(33.33)` → `"33.33"` → 3333), not by `x * 100`. JS's shortest-round-trip number formatting makes this exact for any 2-decimal value.

### Parsing user input (strict)

- Amount: trim, then
  - `-…` → **"Amount must be more than ₹0"** (mandated wording)
  - match `^\d+(\.\d{1,2})?$`, else "Enter an amount like 1250.50"
  - paise = `rupees × 100 + paise` from integer substrings
  - `0` → "Amount must be more than ₹0"
  - more than 100,000,000 paise → "Amount must be at most ₹10,00,000.00"
  - more than 2 decimals → "Amount can have at most 2 decimals"
- Exact shares: the same parser, but allowing `0`. A blank input means 0 / not in the split.
- Percent: `^\d{1,3}(\.\d{1,2})?$`, value 0–100 (0–10000 bp).

### Allocation rule — one function for Equal and Percent

`allocate(totalPaise, weights: { memberId, weight }[]) → Record<memberId, paise>` (weights passed in trip member order, which is what breaks ties) uses the **largest-remainder method**:

1. `base_i = floor(total × w_i / W)` and `rem_i = (total × w_i) mod W`
2. `leftover = total − Σ base_i`. This is always less than the number of participants.
3. Give +1 paisa to the `leftover` participants with the **largest `rem_i`**. **Ties go to the member who comes first in the trip's member list** (m1, m2, … order), *not* JSON key order.

- **Equal split** = `allocate` with every weight = 1. All remainders are equal, so the extra paise go to the earliest members in trip order. ₹100 ÷ {m1, m2, m3} → m1 33.34, m2 33.33, m3 33.33. ✔ This matches the brief's example.
- **Percent split** = `allocate` with weights = basis points (W = 10000). Example from the source, e6 ₹1,499.99 at 33.33/33.33/33.34 → m1 499.95, m2 499.95, m3 500.09.
- **Exact split** has no allocation: shares are taken as entered after validation (sum must equal the amount).

**README rule statement (draft):** *"When an amount can't be divided exactly, each person first gets their share rounded down to the paisa. The leftover paise (at most one each) go to the people whose shares were rounded down the most; on a tie, to whoever comes first in the trip's member list (Aarav, Diya, Kabir, Meera, Rohan)."*

### Balances

`balance(m) = Σ amounts m paid − Σ m's allocated shares`. The payer need not be a participant (sample e5). Because every expense's shares sum exactly to its amount, **Σ balances = 0 by construction**. This is asserted in tests over the sample data and over ~1,000 generated expenses (seeded PRNG, so the run is reproducible).

Golden values for the sample data: Aarav +₹18,554.20, Diya −₹3,695.78, Kabir +₹554.08, Meera −₹8,112.50, Rohan −₹7,300.00 (see `source-audit.md` §7).

### Display

`formatINR(paise)` uses integer/string operations: rupees = `floor(|p| / 100)`, paise = `|p| mod 100`, then Indian grouping (last 3 digits, then pairs) → `₹1,00,000.00`. Balance wording: `> 0` "gets back ₹X", `< 0` "owes ₹X" (absolute value), `= 0` "settled up". Tests cross-check the formatter against `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` for a sample of values.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Floats in rupees (`0.1 + 0.2`) | Explicitly unsafe; violates the brief. |
| Extra paisa to the **payer** | Fails when the payer is not in the split (e5). Also, "the payer" is a different rule for equal vs percent. |
| Extra paisa to the **last** member / random | Random is non-deterministic. First-vs-last is arbitrary, but "first in member order" matches the brief's example (33.34 first). |
| Ties broken by JSON key order | e4 lists `m5, m1, m2`, and object key order is an accident of input. Trip member order is stable and explainable. |
| Round each share half-up independently | Can create or lose paise (e.g. 3 × 33.33 = 99.99). |
| `Intl.NumberFormat` for display | Correct, but it needs a float (`paise / 100`). We use our own integer formatter and keep Intl only as a test oracle. |
| `bigint` everywhere | Unnecessary at these magnitudes, and it complicates JSON and Redux serialisation. |
| Store percentages as basis points in JSON | Deviates from the brief's data shape (`"m1": 60`). We convert at the boundary instead. |

## Consequences

- Every money function is pure TS in `src/domain/` and unit-tested without React.
- One remainder rule is applied everywhere (equal and percent) because both go through the same `allocate`.
