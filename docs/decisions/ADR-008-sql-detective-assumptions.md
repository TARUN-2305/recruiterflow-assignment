# ADR-008 — SQL Detective: loading, identity and counting assumptions

- **Status:** Proposed (Phase 0)
- **Mandated by brief?**
  - Load the dataset **as-is (don't redesign it)**.
  - Answer Q1–Q4, and Q5 (bonus, window function).
  - Submit one `.sql` file with one query per question, each preceded by a comment noting the question number (p. 11–13).
- Interpretations are ours, because the brief says ambiguity is "partly on purpose".

## Decision

### Files (`backend/sql_detective/`)

| File | Content |
|---|---|
| `schema.sql` | The four `CREATE TABLE` statements **verbatim**, with no FKs or constraints added and no U+200B characters |
| `seed.sql` | The four `INSERT` statements **verbatim** |
| `sql_detective.sql` | **The deliverable.** `-- Q1` … `-- Q5`, each with a one-line assumption comment and one query |

These are loaded into a separate database, `hiring_ops`, via `scripts/load_sql_detective.py`, or via `psql -f` inside the db container. A pytest loads them into a fresh test schema and asserts each query's exact result set.

### Interpretations

| Q | Interpretation | Expected result (supplied data) |
|---|---|---|
| Q1 | `status = 'open'`, `LEFT JOIN recruiters` so an open posting stays visible even if its recruiter row were missing (same result as an inner join on this data) | 4 rows: postings 1, 2, 4, 5 |
| Q2 | `COUNT(DISTINCT applicant_id)` of Final-stage interviews per posting. `LEFT JOIN` so postings with 0 appear. `DISTINCT` protects against the same applicant having more than one Final row on a posting. | 1→2, 2→2, 3→1, 4→2, 5→0, 6→0, 7→2 |
| Q3 | Person identity = `LOWER(TRIM(email))`, not name: names can collide between different people, and email is the stronger identifier. "Applied to a posting" = has ≥ 1 interview row for it (there is no applications table). Count `DISTINCT job_posting_id` per identity, `HAVING > 1`. | Ananya Rao (records 1 & 2 → postings 1, 4); Ben Turner (1, 3); Elena Popescu (2, 7) |
| Q4 | Join interviews → postings → recruiters. Denominator = **all** Final-stage interviews, as worded ("total Final-stage interviews"), so pending and no-show would count. Numerator = `outcome = 'passed'`. `HAVING COUNT(*) >= 3`. Use `100.0 * … / NULLIF(…, 0)` to avoid integer division and divide-by-zero. Show passed, total and the rate. | Priya Shah 3/4 = 75.00%; Daniel Ortiz 2/4 = 50.00% |
| Q5 | CTE: passed Final interviews per (department, recruiter), then `RANK() OVER (PARTITION BY department ORDER BY placements DESC)`, keep rank 1. `RANK` keeps ties. Departments with 0 placements produce no row. | Data → Fatima Al-Sayed (1); Engineering → Priya Shah (3) |

### Noted but not changed

- Elena's two postings (2, 7) are both titled "Backend Engineer I". We count them as **two postings** because the question says "job posting". A commented alternative grouping by title is included for discussion.
- Interviews 7, 23 and 24 are Finals with no earlier stage. Not relevant to any question.
- No Final interview is pending or no-show, so Q4 results are the same under either denominator definition.

### Dialect

The answer queries use standard SQL: `CASE` inside `SUM` rather than PostgreSQL-only `FILTER`, CTEs, and `RANK()`. The one exception is Q3's `STRING_AGG(DISTINCT … ORDER BY …)` column, which is PostgreSQL syntax and is commented as such; it only lists the posting ids for readability, and the answer does not depend on it. The supplied DDL (`INT`, `VARCHAR`, `DATE`, trailing `--` comments) is valid PostgreSQL as written.

### Verified results (2026-10-28, PostgreSQL 16.14)

`python -m scripts.load_sql_detective` loads 5/7/11/24 rows, and all five answers match the table above (`docs/testing/evidence/sql-detective-results.txt`). `tests/integration/test_sql_detective.py` asserts each result exactly. It also adds one extra placement to prove Q5 returns both recruiters when there is a tie.

## Alternatives considered

- Q3 identity by `full_name`: catches Ananya, but would wrongly merge distinct people who share a name. Rejected as the primary rule; mentioned in a comment.
- Q3 identity by `LOWER(email)` without `TRIM`: equivalent on this data. `TRIM` is cheap insurance.
- Q2 counting interview rows instead of distinct applicants: gives the same numbers here, but is wrong in general.
- Q4 excluding pending (`outcome IS NULL`) from the denominator: arguably fairer for in-flight pipelines, but it contradicts the literal wording. Documented as an alternative.
- Q5 `ROW_NUMBER()`: arbitrarily drops ties. Rejected.
