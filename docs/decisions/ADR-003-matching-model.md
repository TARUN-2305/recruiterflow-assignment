# ADR-003 — Matching model, score formula and explainability

- **Status:** Accepted and implemented (M1–M7, 2026-10-28).
- **Mandated by brief?** The algorithm **must** account for (1) skill overlap with the job's required skills and (2) experience fit against the job's minimum (p. 11). Everything else — weights, traits/culture, availability, tie-breaking — is our choice, and we must be "ready to explain and defend" it.

## Decision

### One pure scoring function, two views

`score_pair(candidate, job) -> MatchResult` is a pure function in `app/domain/matching.py`. It has no DB access and no I/O.
- `GET /jobs/{id}/matches` scores that job against **every** candidate.
- `GET /candidates/{id}/matches` scores that candidate against **every** job.

Both endpoints call the same function and the same sort comparator. A test asserts that every one of the 15 × 6 = 90 pairs gets the identical score and reason from both directions.

### Score: 0–100, four components

| Component | Weight | Fraction (0–1) | Rationale |
|---|---|---|---|
| **Skill coverage** | **50** | matched required skills ÷ number of required skills | Primary signal and a required factor. Measured against the *job's* list, so extra unrelated candidate skills neither help nor hurt. |
| **Experience fit** | **30** | `1` if years ≥ min; otherwise `years ÷ min` (linear partial credit); `1` if min = 0 | Required factor. Partial credit means "1 year short" is not treated the same as "no experience". No over-qualification penalty: we have no data (salary, seniority band) to justify one. |
| **Culture alignment** | **10** | candidate traits ∩ job culture keywords ÷ number of culture keywords (exact token match) | A weak, self-described signal, so it gets a low weight. These are fictional tags; **we do not claim they predict performance**. |
| **Availability** | **10** | Immediate = 1, 2 weeks = 0.5, Not looking = 0 | Recruiting-practical. "Not looking" candidates are **penalised (−10), never filtered out**: a recruiter may still want to approach them. |

**Relevance gate:** if a pair matches **zero** required skills, its score is **0**. Its reason says "No required skills matched (0/N)". The pair still appears in the response, ranked last.
Why: without the gate, Ron S. (woodworking) would score 40/100 for Backend Detective on experience and availability alone, which is misleading. Experience only matters if it is experience in something the job needs.

```
if matched == 0:  score = 0
else:             score = 50·skill + 30·experience + 10·culture + 10·availability
```

### Exactness and rounding

- Components are computed with Python `fractions.Fraction`, so there is no float drift. For example, 2/3 coverage is exactly 100/3 points.
- **Ranking uses the exact value.**
- The response's `score` is rounded **half-up to 1 decimal place** (`floor(10·x + ½) / 10`, done on the Fraction). Unit tests cover the .x5 boundaries.
- Component points in the breakdown use the same rounding. Because of rounding, the displayed components may not sum exactly to the displayed total; this is documented.

### Deterministic ordering (same comparator both directions)

1. exact score ↓
2. skill coverage ↓ (the required factor wins ties)
3. experience fit ↓
4. display name (candidate name or job title), case-insensitive ↑
5. id ↑

`rank` is the 1-based position after sorting. Ties are broken, never shared, so the output is fully deterministic.

### Normalisation

Skill, trait and keyword comparisons use `casefold()` + `strip()`. Source labels are already normalised, so display values are identical to the source. **No synonyms or fuzzy matching**: `calm` ≠ `calm-under-pressure`, and `public-speaking` ≠ `public speaking`. Inventing equivalences would mean inventing data. This is documented as a known limitation.

### Reasons (generated only from contributing data)

These are assembled from the same `MatchResult` fields that produced the score. Example (Dwight S. → Sales Engineer):

> `Matches 2/3 required skills (sales, negotiation); missing public-speaking. 9 yrs experience (min 3). Available immediately. No culture keyword overlap (enthusiastic, persistent).`

The response also carries a structured `breakdown` (matched/missing skills, matched keywords, per-component points), so the reason can be checked against the numbers.

## Resulting rankings on the seed data (prototype, Phase 0)

The weights were sanity-checked with a throwaway script. Pairs with zero skill overlap (score 0) are omitted below for brevity.

| Job | Ranked (score) |
|---|---|
| Backend Detective | Sherlock H. 95.0 · Sheldon C. 56.7 |
| Rapid Prototyping Engineer | Rick S. 90.0 · MacGyver 85.0 · Tony S. 85.0 |
| Developer Relations Lead | Elle W. 90.0 · Hermione G. 85.0 · Leslie K. 65.0 · Sheldon C. 65.0 · Ted L. 65.0 · Michael S. 55.0 |
| Engineering Manager, Chaos Team | Miranda P. 63.3 · Leslie K. 61.7 · Ted L. 61.7 · Olivia P. 51.7 · Michael S. 46.7 · Tony S. 46.7 |
| Incident Commander | Olivia P. 90.0 · Katniss E. 78.3 · Dwight S. 56.7 · Miranda P. 51.7 · Ron S. 46.7 |
| Sales Engineer | Dwight S. 73.3 · Michael S. 68.3 · Ted L. 61.7 · Elle W. 56.7 · Leslie K. 56.7 · Hermione G. 51.7 · Olivia P. 51.7 · Miranda P. 46.7 · Ron S. 46.7 |

Reading these as a sanity check: Sherlock → Backend Detective and Olivia → Incident Commander come out on top. Michael S. ranks second for Sales Engineer only because he is "Not looking", which is an explainable trade-off. Every candidate matches at least one job.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Jaccard similarity for skills (∩ ÷ ∪) | Penalises candidates for having extra skills the job doesn't need (MacGyver's chemistry would lower his Rapid Prototyping score). Coverage of the *job's* requirements is the recruiter's question. |
| Hard filters (exclude Not looking, exclude below-min experience) | Hides candidates silently. Project instructions require penalties, not hidden exclusion. A score of 0 with a reason is more transparent. |
| Return only pairs with score > 0 | Shorter output, but it is still a filter. We return the full ranking so both directions have a fixed size (15 / 6). **Decided by the candidate (Phase 0):** list every pair. A `min_score` query parameter remains a small possible extension. |
| Multiplicative model (skill × experience × …) | Any zero kills the score, and partial contributions are harder to explain. The additive model plus a single explicit gate is easier to defend. |
| Over-qualification penalty | No source data to calibrate it. Would be an invented judgement. |
| Scoring in SQL | Possible, but it splits the policy across SQL and Python and makes boundary unit tests need a DB. SQL is used for retrieval (joins, `array_agg`); Python does the scoring. |
| Persisting a `matches` table | 90 pairs are computed in microseconds, and a cache would need invalidation on every edit. "Match" is therefore represented as a computed value object (`MatchResult`), with documented API shape. |
| ML / embeddings | Out of scope; unexplainable for this dataset. |

## Consequences / risks

- The weights are a judgement call, defended by the table above. The interview guide will cover "what if" changes (e.g. weighting experience higher, treating `2 weeks` as 0.75). Each change is a one-constant edit in `matching.py`, with named constants and no magic numbers.
- Tests needed: zero/partial/full overlap; years below/at/above min; min = 0 guard; each availability value; culture none/some/all; gate behaviour; rounding boundaries; tie-break order; 90-pair direction consistency; reason text built from the same data.
