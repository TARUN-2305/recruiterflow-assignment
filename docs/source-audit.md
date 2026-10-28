# Source Audit

Phase 0 audit of the supplied assignment material. **The PDF is authoritative.** The Markdown file is a navigation aid only.

## 1. Source inventory

| File | Path (workspace-relative) | Size | Role |
|---|---|---|---|
| Original brief | `Recruiterflow_Internship_Assignments.pdf` | 718,704 bytes, 19 pages | Authoritative contract |
| Transcription | `Recruiterflow_Internship_Assignments.md` | 31,049 bytes | Search/navigation aid |
| Project instructions | `CLAUDE.md` | 38,841 bytes | Engineering instructions (not a recruiter requirement) |

Workspace state at audit time (2026-10-28): only the three files above exist. The folder is **not a Git repository** yet. Nothing was modified.

Neither source file is to be committed to the public repository (see `implementation-plan.md` §Repo hygiene).

## 2. Method

The PDF could not be rendered to images in this environment (no `pdftoppm`; the in-app browser could not display the local PDF). The PDF was therefore read through its **embedded text layer** with `pdftotext` (poppler) in three modes:

1. `-layout`: to see visual column placement (tables become hard to read).
2. `-raw`: content-stream order, which reads table rows cell by cell in source order.
3. `-raw -enc UTF-8`: to recover non-ASCII glyphs (₹, ÷, –, —, ·) and invisible characters.

Then a **character-level diff** was run between the PDF text and the transcription. Both were normalised by removing whitespace, Markdown syntax (`# * | \``, table separators, page-marker comments) and list-bullet glyphs. Every diff hunk was reviewed by hand (§4).

Separately, the seed data was loaded into scratch in-memory databases and calculators, with nothing written to the project:
- The SQL Detective DDL and INSERTs went into in-memory SQLite. Row counts were checked and draft answers to Q1–Q5 computed (§6).
- The Trip Splitter sample data was run through a draft integer-paise allocation, and the balances were computed and checked to sum to 0 (§7).
- The 15 candidates and 6 jobs were transcribed and checked cell by cell against the `-raw` extraction (§5).

**Limitation:** this was a text-layer review, not a visual one. Visual-only features such as colour, emphasis, or text drawn as images could not be checked. No image-only content was found: every page produced text, and the 19 form-feeds match 19 pages. **Recommended:** before submission, the candidate should spend two minutes looking over pages 7–10 and 17–18 in a PDF viewer to confirm by eye.

## 3. Page-by-page review

| Page | Content | Result |
|---|---|---|
| 1 | Title, "How to use this document", role table, Full Stack instructions | Matches. `-layout` misaligns the role table's third column, but `-raw` confirms the mapping in the transcription: QA→A, Backend→B, Frontend→C, Full Stack→A+B+C. |
| 2 | Contents: A = pp. 3–6, B = pp. 7–14, C = pp. 15–19 | Matches. |
| 3 | Section A overview, Part 1 UI (3 scenarios), Part 2 API intro, ReqRes API key note | Matches. |
| 4 | API scenarios 4–5, tip about 401, Bonus (4 items), Getting Started, docs links, suggested folder tree, "Tests that run" | Matches (tree glyphs differ only in rendering). |
| 5 | What we look for, What you do NOT need, How to submit, evaluation weights (30/20/20/15/15), start of reviewer-only section | Matches. |
| 6 | Reviewer-only section (continued) | Matches. Not a candidate deliverable; see §8 I2. |
| 7 | Section B welcome, scenario, candidates table rows 1–2 | Matches. Hermione's quirk wraps onto p. 8. |
| 8 | Candidates rows 3–9 | Matches. Sheldon's skills and quirk wrap onto p. 9. |
| 9 | Candidates rows 10–15 | Matches. |
| 10 | Jobs table (6 rows), "What to build" items 1–3 | Matches. |
| 11 | Matching algorithm item 4, constraints, SQL Detective intro, DDL for 3 tables | Matches. |
| 12 | `interviews` DDL, all INSERTs up to interview row 6 | Matches. |
| 13 | Interview rows 7–24, Questions 1–5, submission format, What to Submit | Matches. |
| 14 | Time & AI tools, What happens next, Questions | Matches. |
| 15 | Section C intro, problem, Navbar, Add expense fields, Expenses (first 2 bullets) | Matches. The "FRONTEND DEVELOPER INTERN ASSIGNMENT" running header is placed differently (cosmetic). |
| 16 | Remaining Expenses bullets, Validation, Money, Data, field table rows 1–3 | Matches. |
| 17 | Field table rows 4–7, 3 split shapes, sample data start (e1–e3 partial) | Matches. |
| 18 | Sample data end (e3–e6), Technical requirements (first 6) | Matches. The PDF wraps e3/e6 `shares` objects over two lines; the transcription joins them. Values are identical. |
| 19 | No form/component libraries, responsive, accessibility, scripts, What to submit, README topics, AI tools, evaluation, follow-up call | Matches. |

## 4. Transcription discrepancies (PDF vs Markdown)

**No substantive discrepancies were found.** No words, numbers, names, values, SQL, or JSON differ. Every diff hunk falls into one of these formatting categories:

| # | Category | Detail | Impact |
|---|---|---|---|
| D1 | **Invisible characters in PDF** | The PDF text layer contains **263 zero-width spaces (U+200B)**. They follow list markers and sit at the **end of most SQL INSERT lines (p. 12–13) and sample-data JSON lines (p. 17–18)**. The transcription has none. | **Real copy-paste hazard.** Seed SQL/JSON pasted straight from the PDF could carry U+200B and break parsing or string equality. Implementation will take data from the clean values and add a test/grep that rejects U+200B in seed files. |
| D2 | Hyphenated wrapping in table cells | The PDF breaks cell text mid-word, e.g. `pattern-recog`/`nition`, `detail-oriente`/`d`, `calm-under-pres`/`sure`, `team-building`/`, optimism`, `stakeholder-man`/`agement`. | Values were reconstructed by joining fragments **without adding characters**. Every result agrees with the transcription. No source hyphen is ambiguous: real hyphens appear mid-fragment elsewhere, e.g. `stakeholder-` + `management`. |
| D3 | Cells split across pages | Hermione's quirk ("…writing a / single line of code.") and Sheldon's skills/quirk ("pattern-recog / nition, research", "insufferable / 100% of the time.") continue on the next page. | The transcription rejoins them correctly. |
| D4 | Bullet glyphs | The PDF uses `•`, `○`, `●`, `o` (nested). The transcription uses `-`. Nesting is flattened in a few places (p. 11, 13, 15). | Cosmetic. |
| D5 | Running headers/footers | PDF footers: "Recruiterflow — Internship Take-Home Assignments Page N" (pp. 1–2) and "Section C · Frontend Developer Intern Assignment" (pp. 16–19). The transcription moves the Section C footer to the top of pp. 16–18, omits it on p. 19, and puts the p. 15 header at the top. | Cosmetic. |
| D6 | Added rule | The transcription adds `---` before the reviewer-only section. | Cosmetic. |
| D7 | Folder-tree glyphs | The box-drawing characters render differently. | Cosmetic. |
| D8 | Code fences | The transcription adds ```` ```sql ```` / ```` ```json ```` fences and splits the INSERT block at the page break. | Cosmetic. The SQL content is identical. |

Glyph check: the PDF contains `₹` (U+20B9), `÷` (U+00F7), `–`, `—` and `·`. The transcription reproduces them all. An earlier Latin-1 extraction dropped `₹`; the UTF-8 extraction confirms it is present in every place the transcription shows it.

## 5. Seed data verification — Recruiter Bot

### Candidates (PDF pp. 7–9): **15 records** ✅

Source order is shown below. **IDs are not in the source**; the `#` column is our proposed surrogate ID (assumption A-B1).

| # | Name | Skills (source order) | Yrs | Availability | Traits | Quirk |
|---|---|---|---|---|---|---|
| 1 | Sherlock H. | deduction, pattern-recognition, forensics | 8 | Immediate | analytical, blunt | Solves problems by eliminating the impossible; occasionally insufferable in standups. |
| 2 | Hermione G. | research, time-management, public-speaking | 4 | 2 weeks | detail-oriented, overachiever | Reads the entire documentation before writing a single line of code. |
| 3 | Tony S. | systems-design, rapid-prototyping, leadership | 12 | Not looking | confident, innovative | Ships an MVP overnight, refuses to write tests. |
| 4 | Leslie K. | project-management, stakeholder-management, public-speaking | 6 | Immediate | tenacious, organized | Has a binder for everything, including the binder. |
| 5 | Ron S. | woodworking, minimalism, negotiation | 15 | Not looking | stubborn, principled | Refuses to use more than one monitor. |
| 6 | Rick S. | systems-design, rapid-prototyping, chemistry | 20 | Immediate | genius, reckless | Solution works, mechanism deeply concerning. |
| 7 | Elle W. | persuasion, research, public-speaking | 3 | Immediate | optimistic, sharp | Underestimated in every standup, correct in every retro. |
| 8 | MacGyver | rapid-prototyping, resourcefulness, chemistry, systems-design | 10 | 2 weeks | calm, improviser | Fixes production outages with duct tape and a paperclip metaphor. |
| 9 | Sheldon C. | theoretical-analysis, pattern-recognition, research | 9 | Immediate | rigid, brilliant | Correct 95% of the time, insufferable 100% of the time. |
| 10 | Katniss E. | precision, strategy, crisis-management | 5 | Immediate | resilient, decisive | Excellent under pressure, terrible with public speaking. |
| 11 | Michael S. | sales, public-speaking, team-building | 11 | Not looking | enthusiastic, chaotic | World's best boss, according to a mug he bought himself. |
| 12 | Olivia P. | crisis-management, negotiation, strategy, leadership | 13 | 2 weeks | decisive, intense | Handles it. Whatever it is. |
| 13 | Ted L. | team-building, optimism, mentorship, public-speaking | 7 | Immediate | empathetic, persistent | Turns every technical setback into a folksy metaphor. |
| 14 | Miranda P. | leadership, negotiation, stakeholder-management, precision | 18 | Not looking | demanding, decisive | Reviews every PR personally. Says nothing. Everyone panics. |
| 15 | Dwight S. | sales, negotiation, security, loyalty | 9 | Immediate | intense, loyal | Assistant to the regional backend engineer. |

Derived facts, used in design and tests:
- Availability values: `Immediate` (8), `2 weeks` (3), `Not looking` (4). This is a closed set of exactly 3 values.
- 5 candidates have 4 skills (MacGyver, Olivia, Ted, Miranda, Dwight); 10 have 3, for 50 candidate–skill links. Every candidate has 2 traits (30 links, 27 distinct). Jobs have 16 required-skill links and 12 culture-keyword links. *(Corrected in M2: the Phase 0 draft said 4 and 11, missing Dwight. The DB row counts after seeding exposed the error.)*
- 27 distinct candidate skills. 13 appear in no job: chemistry, loyalty, mentorship, minimalism, optimism, persuasion, precision, project-management, resourcefulness, security, theoretical-analysis, time-management, woodworking.
- All source skill/trait/keyword labels are already lower-case and hyphenated with no surrounding spaces. Normalisation is therefore an identity on source data, but it is still enforced for safety.
- Traits that equal some culture keyword: analytical, decisive, empathetic, enthusiastic, innovative, organized, persistent. **`calm` (MacGyver) is not the same token as `calm-under-pressure`** (Incident Commander). We will not fuzzy-match them (see ADR-003).
- The apostrophe in "World's" and the `%` in Sheldon's quirk must be preserved exactly. This is one reason we use parameterised SQL rather than string building.

### Jobs (PDF p. 10): **6 records** ✅

| # | Title | Required skills | Min exp | Culture keywords | Tagline |
|---|---|---|---|---|---|
| 1 | Backend Detective | deduction, pattern-recognition, forensics | 3 | analytical, autonomous | We have a bug. We have no leads. We have you. |
| 2 | Rapid Prototyping Engineer | rapid-prototyping, systems-design | 2 | innovative, fast-paced | Ship first, document never (kidding — please document). |
| 3 | Developer Relations Lead | public-speaking, research | 2 | energetic, curious | Explain complex things to confused humans, cheerfully. |
| 4 | Engineering Manager, Chaos Team | team-building, stakeholder-management, leadership | 5 | empathetic, organized | Herd cats. The cats are senior engineers. |
| 5 | Incident Commander | crisis-management, strategy, negotiation | 4 | decisive, calm-under-pressure | 3am page. You're the one who picks up. |
| 6 | Sales Engineer | sales, public-speaking, negotiation | 3 | enthusiastic, persistent | Sell the vision, then go build it. |

Notes: the title "Engineering Manager, Chaos Team" contains a comma, so CSV is a poor seed format. The tagline of job 2 contains an em dash (U+2014), which must be preserved. The "Min Experience" unit is not stated; years is assumed, matching the candidates' "Experience (yrs)" (assumption A-B2).

## 6. Seed data verification — SQL Detective (PDF pp. 11–13)

| Table | Rows | Verified |
|---|---|---|
| `recruiters` | 5 | ✅ |
| `job_postings` | 7 | ✅ |
| `applicants` | 11 | ✅ |
| `interviews` | 24 | ✅ |

The DDL and all INSERT rows match between the PDF and the transcription, apart from the U+200B issue in D1. The DDL has **no foreign keys**, and we must keep it that way ("load it as-is"). Every reference resolves anyway: 0 dangling `applicant_id`/`job_posting_id` values were found.

Data "messiness" found, relevant to the questions:
1. **Ananya Rao appears twice** as applicants 1 and 2, with emails `ananya.rao@mail.com` and `Ananya.Rao@mail.com`, which differ only in case. She interviewed for posting 1 and posting 4. This is the intended Q3 trap.
2. **Elena Popescu (6)** interviewed for postings 2 and 7. Both are titled "Backend Engineer I", but they are different postings with different dates (recruiter is Daniel Ortiz for both).
3. **Ben Turner (3)** interviewed for postings 1 and 3.
4. Three postings share the title "Backend Engineer I" (ids 1, 2, 7).
5. Final-stage interviews with no earlier stage for the same applicant+posting: ids 7, 23, 24.
6. Interviews on non-open postings: 7, 23, 24 (all on closed postings).
7. The only `NULL` outcome is interview 22, a Technical (pending) one. **There are no pending or no-show Final interviews**, so the Q4 denominator choice does not change the answer, though it is still documented.
8. There is no `applications` table. "Applied to a posting" must be inferred from `interviews` (assumption A-SQL1).

Draft answers, computed in a scratch SQLite database. They will be re-validated in PostgreSQL:
- **Q1** open postings: 1 Backend Engineer I – Priya Shah; 2 Backend Engineer I – Daniel Ortiz; 4 Backend Engineer II – Priya Shah; 5 DevOps Engineer – Wei Zhang.
- **Q2** distinct applicants reaching Final, per posting: 1→2, 2→2, 3→1, 4→2, 5→0, 6→0, 7→2.
- **Q3** people with interviews on more than one posting, identity = `lower(trim(email))`: **Ananya Rao** (applicant ids 1+2; postings 1, 4), **Ben Turner** (postings 1, 3), **Elena Popescu** (postings 2, 7). A naive `GROUP BY applicant_id` misses Ananya.
- **Q4** recruiters with at least 3 Final interviews: Priya Shah 3/4 = 0.75; Daniel Ortiz 2/4 = 0.50. Fatima has only 1 Final interview; Wei and Grace have 0.
- **Q5** top recruiter by Final-stage passes, per department: Engineering → Priya Shah (3); Data → Fatima Al-Sayed (1). Infrastructure has no placements, so no row.

## 7. Seed data verification — Trip Splitter (PDF pp. 17–18)

- **Members: 5** ✅ m1 Aarav, m2 Diya, m3 Kabir, m4 Meera, m5 Rohan.
- **Expenses: 6** ✅

| id | Description | Amount (paise) | Paid by | Date | Category | Split |
|---|---|---|---|---|---|---|
| e1 | Villa booking | 2400000 | m1 | 2026-03-12 | Stay | equal m1–m5 |
| e2 | Beach shack dinner | 325000 | m2 | 2026-03-12 | Food | equal m1–m4 |
| e3 | Scuba diving | 1050000 | m3 | 2026-03-13 | Activities | exact m3/m4/m5 = 350000 each |
| e4 | Scooter rental | 200000 | m5 | 2026-03-13 | Travel | percent m5 50, m1 25, m2 25 (**key order m5, m1, m2**) |
| e5 | Groceries | 100000 | m4 | 2026-03-14 | Food | equal m1–m3 (**payer m4 not in split**) |
| e6 | Airport cab | 149999 | m1 | 2026-03-15 | Travel | percent m1 33.33, m2 33.33, m3 33.34 (**does not divide evenly**) |

Total of all expenses: 4,224,999 paise = **₹42,249.99**. The data is built to exercise the edge cases:
- e5 has a payer outside the split.
- e6 has a remainder of 2 paise under percentage allocation.
- e4's key order differs from member order, so the remainder rule must not depend on JSON key order.
- e1/e2 and e3/e4 share dates, so "newest first" needs a tie-breaker.

Draft balances, using the largest-remainder rule with ties broken by trip-member order (ADR-004):
e5 → m1 33334, m2 33333, m3 33333. e6 → m1 49995, m2 49995, m3 50009.

| Member | Balance (paise) | Display |
|---|---|---|
| Aarav (m1) | +1,855,420 | gets back ₹18,554.20 |
| Diya (m2) | −369,578 | owes ₹3,695.78 |
| Kabir (m3) | +55,408 | gets back ₹554.08 |
| Meera (m4) | −811,250 | owes ₹8,112.50 |
| Rohan (m5) | −730,000 | owes ₹7,300.00 |
| **Sum** | **0** | ✅ invariant holds |

These figures become golden test fixtures.

## 8. Internal inconsistencies and ambiguities in the PDF itself

These are reported, not silently resolved. Our chosen interpretations are in `implementation-plan.md` §Assumptions and the ADRs.

| # | Location | Observation | Proposed handling |
|---|---|---|---|
| I1 | A, p. 3 | "Both sites are public, free and need no sign-up" conflicts with the note that ReqRes needs a free account and API key. | Follow the specific note: supply the key via the `REQRES_API_KEY` env var. The user must create the key. |
| I2 | A, p. 5–6 | The PDF includes a section addressed to reviewers rather than candidates. | Used only as context for scope. It confirms what the candidate-facing text already says: 5 core tests, bonuses optional. Its content is not reproduced in this repository. |
| I3 | A, p. 4 | Getting Started says to create a new folder with `npm init playwright@latest`. | p. 1 explicitly allows one repo with `qa/`. Scaffold inside `qa/`. |
| I4 | A p. 5 vs C p. 19 | QA: "a few commits instead of one". Frontend: "We do not look at … number of commits". | Meaningful, logically separated commits throughout. |
| I5 | B, pp. 7–10 | Candidates and jobs have **no IDs**, but the endpoints use `{id}`. | Integer surrogate IDs in source order (1–15, 1–6), fixed in seed data so they stay stable across reseeds. |
| I6 | B, p. 10 | "Min Experience" has no unit. | Years. |
| I7 | B, p. 10 | "however you choose to represent a 'match'" | Computed on read from current data; not persisted (ADR-003). |
| I8 | B, p. 13 | Q2 "how many applicants": distinct people or rows? Include postings with 0? | Distinct `applicant_id` per posting, all postings included (0 where none). Person-level dedup would not change any per-posting count here; documented. |
| I9 | B, p. 13 | Q3 "effectively applied": the identity rule is unstated, and so is the meaning of "applied" (there is no applications table). | Identity = `lower(trim(email))`. "Applied to posting P" = has ≥1 interview row for P. Distinct postings, not distinct titles; the title-level alternative is documented. |
| I10 | B, p. 13 | Q4 denominator "total Final-stage interviews": should pending/no-show count? | Literal reading: all Final-stage rows, including pending. No such rows exist in the data; documented. |
| I11 | B, p. 13 | Q5 "the recruiter": ties are not addressed. | `RANK()` keeps all tied recruiters. Departments with 0 placements are omitted. |
| I12 | C, p. 16 | "save the expenses in localStorage". Members are not mentioned and there is no UI to edit them. | Persist expenses only (versioned); members always come from sample data (ADR-005). |
| I13 | C, p. 15 | "Cancel goes back": browser history back, or to Expenses? | Navigate to `/` (Expenses). History-back could leave the app on a deep link. |
| I14 | C, p. 16 | "The date cannot be in the future": which timezone? | The user's local calendar date. `today` is injected into the validator for testability. |
| I15 | C, p. 16 | Exact/percent: is a member with ₹0 / 0% "part of" the expense? | Zero/blank shares are omitted from the stored `shares`. A member is in the split iff they have a key. The "N people" count comes from this. |
| I16 | C, p. 15 | "newest date first" does not define same-date order. | Secondary key: most recently added first (reverse insertion order). Deterministic. |
| I17 | C, p. 16 | The amount input format is unspecified (commas? leading `+`?). | Accept digits with an optional `.` and 1–2 decimals, after trimming. A leading `-` produces the mandated negative message. Anything else gets a format error. Documented. |
| I18 | C, p. 16 | Only the negative-amount error wording is mandated, plus the "₹12.50 left to assign" example. | Use these strings exactly. Other messages are our own wording. |
| I19 | C, p. 15 | Split column example is given only for Equal ("Equally, 4 people"). | "Exact amounts, 3 people" and "Percentages, 3 people", following the form's labels. Singular "1 person". |
| I20 | All | Section windows differ: A = 48 h; B = ~4 h over "a few days"; C = none stated. | The submission timing is the user's responsibility; noted in the plan. |

## 9. Source-derived facts vs assumptions

- **Source facts** appear in §5–§7 and in `requirements-traceability.md` with page references.
- **Assumptions** are A-B1/A-B2 (IDs, units), A-SQL1 ("applied" = has interview), and I8–I19 above. Each is carried into an ADR or the implementation plan and must appear in the relevant README.
