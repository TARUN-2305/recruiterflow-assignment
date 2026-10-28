# ADR-001 — Repository layout and technology stack

- **Status:** Accepted and implemented (M1–M7, 2026-10-28).
- **Mandated by brief?** Partly. Section A requires Playwright + TS. Section C requires React + Redux Toolkit + strict TS + React Router. Section B lets us pick **any language and any relational DB**. The repo layout is our choice within p. 1's options.

## Context

A Full Stack applicant submits three independent assignments. Page 1 allows separate repos, or **one repo with a folder per section, each with its own README**. The candidate must be able to explain every line live. Tooling available on the dev machine: Node 24.16, npm 11.13, Python 3.13.13, pip 26, Docker 29 / Compose v5 (daemon currently not running), Git 2.54. `uv` is not installed.

## Decision

**One monorepo, with three independently runnable packages and no shared build tooling:**

```
qa/        Playwright + TypeScript (own package.json)
backend/   Python 3.12+ · FastAPI · Pydantic v2 · psycopg 3 · PostgreSQL 16
           └─ sql_detective/   SQL Detective files (verbatim schema/seed + answers)
frontend/  Vite · React · TypeScript (strict) · Redux Toolkit · React Router · Vitest + RTL
docs/      audit, traceability, plan, architecture, ADRs, testing, handoff
compose.yaml   optional PostgreSQL (+ API) for local dev
```

- There are no npm workspaces or root `package.json`. Each package's README commands work by `cd`-ing into it, which matches what each brief expects a reviewer to run.
- Deviation from the `CLAUDE.md` sample layout: the SQL Detective lives at `backend/sql_detective/`, not a root `sql/`. The brief says the file belongs "in the same repo" as the Part 1 project. Keeping it under `backend/` keeps Section B self-contained if the sections are ever split into separate repos.

## Backend language — alternatives

| Option | Pros | Cons |
|---|---|---|
| **Python + FastAPI + psycopg 3** (recommended) | FastAPI gives typed request/response models and free OpenAPI docs (a listed bonus). psycopg 3 is a thin driver with server-side parameter binding and nothing that writes SQL for you. `fractions.Fraction` makes exact scoring trivial. Very readable for a live walkthrough. Recommended by project instructions. | A second language in the repo (the other two packages are TS). Python packaging on Windows needs a venv. |
| TypeScript + Fastify/Express + `pg` | One language across all three sections. `pg` is also a thin driver. | No built-in exact rational type (scores would need integer scaling). Validation/OpenAPI need extra libraries such as zod/TypeBox (zod is fine in B, but it adds explanation load). |
| Go + `database/sql` + `pgx` | Fast, explicit SQL. | More boilerplate. A heavier lift to explain for an intern-level live change. |

**Recommendation:** Python/FastAPI, **unless the candidate is markedly stronger in TypeScript**. The brief says "use whatever you're strongest in", and that clause outranks our preference. This is the one stack decision the candidate should confirm.

## Python dependency management — alternatives

- **pip + venv, with exact pins in `requirements.txt` (runtime) and `requirements-dev.txt` (tests/lint), plus `requirements.lock` from `pip freeze`** (chosen in M2): no extra tool to install, and familiar to reviewers. `pyproject.toml` holds only tool configuration (pytest, ruff, mypy). The app is run from `backend/` rather than installed as a package, so there is no packaging setup to explain.
- `uv` with `uv.lock`: faster and gives a real lockfile, but it isn't installed and would be one more thing to explain.
- Poetry: heavier than this project needs.

## Frontend stack notes

- **Vite + React + TS** (the brief suggests Vite). Exact versions were checked at scaffold time (M5, 2026-10-28) and pinned: Vite 8.3.4, React 19.3.0, Redux Toolkit 2.13.0, React Router 8.4.0, Vitest 5.0.4, TypeScript 6.0.3.
- **React Router v8, not v7 as first planned.** v8 is the current major. We use only its declarative API (`BrowserRouter`, `Routes`, `Route`, `NavLink`, `useNavigate`, `useLocation`), which I checked from the installed package; framework mode is not used. The trade-off is that v8 requires **Node ≥ 22.22**. That is acceptable now that Node 20 is end-of-life, and the frontend README states it. React Router 7.18.x (Node 20+) would be the fallback if a reviewer is stuck on older Node.
- **Vitest + React Testing Library + jsdom**: Vite-native and Jest-compatible API.
- **Plain CSS** (one small global stylesheet plus a few component-level files). The brief allows any styling, and plain CSS is the least to explain. No CSS framework is needed.
- **Banned:** any form/validation library (RHF, Formik, Zod, Yup…) and any component library (MUI, AntD, Chakra…). These rules apply **only in `frontend/`**.

## Consequences

- Reviewers get the exact commands each brief promised: `npm install && npx playwright test`, `npm install && npm run dev`, plus documented backend steps.
- Two package ecosystems (npm, pip). Accepted.
- No root orchestration. Optionally, a root README table lists each package's commands.
