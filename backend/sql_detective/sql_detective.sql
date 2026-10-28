-- SQL Detective: answers to Questions 1-5.
-- Run against the dataset loaded unchanged from schema.sql and seed.sql (PostgreSQL 16).
-- Load and run everything with: python -m scripts.load_sql_detective  (from backend/)
--
-- Assumptions used throughout (see docs/decisions/ADR-008-sql-detective-assumptions.md):
--   * There is no applications table, so "applied to a posting" means the applicant has at
--     least one interview row for that posting.
--   * A person is identified by LOWER(TRIM(email)). The same person can appear as two applicant
--     rows (Ananya Rao: ananya.rao@mail.com / Ananya.Rao@mail.com). Names alone are not used,
--     because two different people can share a name.
--   * Standard SQL is used except where noted (STRING_AGG is PostgreSQL syntax).


-- Q1: All currently open job postings, with the name of the recruiter who owns each one.
-- LEFT JOIN keeps an open posting visible even if its recruiter row were missing.
SELECT jp.id    AS job_posting_id,
       jp.title,
       jp.department,
       jp.opened_date,
       r.name   AS recruiter_name
  FROM job_postings jp
  LEFT JOIN recruiters r ON r.id = jp.recruiter_id
 WHERE jp.status = 'open'
 ORDER BY jp.id;


-- Q2: For each job posting, how many applicants reached the Final interview stage?
-- Counts DISTINCT applicants, so an applicant with two Final rows on one posting counts once.
-- The LEFT JOIN (with the stage filter in the ON clause) keeps postings with zero as 0.
-- Counting distinct people by email instead gives the same numbers on this data.
SELECT jp.id                          AS job_posting_id,
       jp.title,
       COUNT(DISTINCT i.applicant_id) AS applicants_reached_final
  FROM job_postings jp
  LEFT JOIN interviews i
         ON i.job_posting_id = jp.id
        AND i.stage = 'Final'
 GROUP BY jp.id, jp.title
 ORDER BY jp.id;


-- Q3: Every person who effectively applied to more than one job posting.
-- The trap: Ananya Rao has two applicant rows whose emails differ only in letter case, so
-- grouping by applicant id (or by raw email) misses her. We group by the normalised email.
-- Postings are counted as distinct postings, not distinct titles (Elena Popescu's two
-- postings, 2 and 7, are both titled "Backend Engineer I" but are separate postings).
WITH person_postings AS (
    SELECT LOWER(TRIM(a.email)) AS person_email,
           a.id                 AS applicant_id,
           a.full_name,
           i.job_posting_id
      FROM applicants a
      JOIN interviews i ON i.applicant_id = a.id
)
SELECT person_email,
       MIN(full_name)                                       AS full_name,
       COUNT(DISTINCT applicant_id)                         AS applicant_records,
       COUNT(DISTINCT job_posting_id)                       AS postings_applied_to,
       STRING_AGG(DISTINCT job_posting_id::text, ', '
                  ORDER BY job_posting_id::text)            AS job_posting_ids  -- PostgreSQL
  FROM person_postings
 GROUP BY person_email
HAVING COUNT(DISTINCT job_posting_id) > 1
 ORDER BY person_email;


-- Q4: Final-stage conversion rate per recruiter (passed / total Final-stage interviews),
--     only for recruiters with at least 3 Final-stage interviews.
-- The denominator is every Final-stage interview, as the question words it, so pending (NULL)
-- and no_show outcomes would count against the rate. This data has none at the Final stage.
-- 100.0 forces decimal division (integer division would give 0); NULLIF guards against /0.
SELECT r.id     AS recruiter_id,
       r.name   AS recruiter_name,
       SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END) AS final_passed,
       COUNT(*) AS final_interviews,
       ROUND(100.0 * SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END)
                   / NULLIF(COUNT(*), 0), 2)                 AS conversion_rate_pct
  FROM recruiters r
  JOIN job_postings jp ON jp.recruiter_id = r.id
  JOIN interviews i    ON i.job_posting_id = jp.id
 WHERE i.stage = 'Final'
 GROUP BY r.id, r.name
HAVING COUNT(*) >= 3
 ORDER BY conversion_rate_pct DESC, r.id;


-- Q5 (bonus): Using a window function, the recruiter with the most successful placements
--             (passed at the Final stage) per department.
-- RANK() keeps every recruiter tied for first in a department (ROW_NUMBER would drop one
-- arbitrarily). Departments with no placements (Infrastructure) produce no row.
WITH placements AS (
    SELECT jp.department,
           r.id     AS recruiter_id,
           r.name   AS recruiter_name,
           COUNT(*) AS placements
      FROM interviews i
      JOIN job_postings jp ON jp.id = i.job_posting_id
      JOIN recruiters r    ON r.id = jp.recruiter_id
     WHERE i.stage = 'Final'
       AND i.outcome = 'passed'
     GROUP BY jp.department, r.id, r.name
),
ranked AS (
    SELECT department,
           recruiter_name,
           placements,
           RANK() OVER (PARTITION BY department ORDER BY placements DESC) AS department_rank
      FROM placements
)
SELECT department,
       recruiter_name,
       placements
  FROM ranked
 WHERE department_rank = 1
 ORDER BY department, recruiter_name;
