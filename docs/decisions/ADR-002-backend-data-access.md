# ADR-002 — Database, data access and migrations for Recruiter Bot

- **Status:** Proposed (Phase 0)
- **Mandated by brief?** "Any relational database … interact with it via **raw, hand-written SQL** — no ORMs or query-builder abstractions" (p. 11). "Hand-written DDL and hand-written queries, full stop" (p. 10). The choice of database and driver is ours.

## Decision

1. **PostgreSQL 16** (run with Docker Compose for local dev; any local Postgres works too, via `DATABASE_URL`).
2. **psycopg 3** (sync) as the only DB library. Every statement is a string literal in a repository module, with `%s` placeholders. Values are always passed as parameters.
3. **Hand-written migrations.** Numbered `.sql` files in `backend/migrations/` are applied by a ~40-line `scripts/migrate.py`. It records applied files in a `schema_migrations` table and runs each file in a transaction.
4. **Seed.** `backend/seed/recruiter_bot_seed.json` (source-exact data, explicit IDs) is loaded by `scripts/seed.py` using hand-written parameterised `INSERT … ON CONFLICT … DO UPDATE` upserts. Junction rows for each seeded entity are deleted and re-inserted. Everything runs in **one transaction**, and the script asserts 15/6 row counts before committing.
5. **Separate SQL Detective database** (`hiring_ops`), loaded from **verbatim** copies of the supplied DDL and INSERTs. It is never mixed with the bot schema.

## Alternatives considered

### Database

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **PostgreSQL** | Strong typing, `CHECK`/FK constraints, `array_agg … ORDER BY`, window functions, `ON CONFLICT`. Industry default, so it is easy to defend in the interview. Compose makes setup one command. | Reviewer needs Docker or a local Postgres. | **Chosen** |
| SQLite (stdlib `sqlite3`) | Zero infrastructure; clone-and-run. Supports window functions (≥ 3.25) and `ON CONFLICT`. | Weak typing (dates as text, loose affinity). FKs off by default. Less representative of production. | Strong runner-up. Choose it if the reviewer-friction concern outweighs the production-parity argument. |
| MySQL | Common. | Weaker `CHECK` history, fiddlier `ON DUPLICATE KEY`. No advantage here. | Rejected |

### Data-access style

| Option | Verdict |
|---|---|
| **Thin driver + repository functions holding literal SQL** | **Chosen.** Complies with the brief and is easy to read. |
| SQLAlchemy Core / ORM, SQLModel, Prisma, Knex, PyPika, peewee | **Forbidden** by the brief (query builders and ORMs generate SQL). |
| `aiosql`-style "SQL files loaded by name" | Technically raw SQL, but it is an extra abstraction that hides queries from the route code. Rejected for explainability. |
| asyncpg + `async def` routes | Faster under load, which is irrelevant at 15 × 6 rows. It also brings async complexity. Rejected. |

### Connection handling

- **Chosen:** a FastAPI dependency that opens one connection per request (`psycopg.connect(DATABASE_URL)`) and closes it afterwards. It is trivial to explain and to override in tests.
- **Upgrade path, documented but not built:** `psycopg_pool.ConnectionPool` created at app lifespan.

### Seeding

- **Chosen:** idempotent upserts with explicit IDs, so `GET /jobs/1/matches` always means Backend Detective.
- Rejected: `TRUNCATE … RESTART IDENTITY` and re-insert. Simple, but destructive to anything else in the tables.
- Rejected: a POST ingestion endpoint. It would be a write API with no auth, which is out of scope. The brief allows a seed script.

### Seed source format

- **Chosen:** JSON. It is structured, language-neutral, and easy to diff against the PDF. CSV is unsuitable because the title "Engineering Manager, Chaos Team" contains a comma.
- Rejected: a `seed.sql` full of INSERT literals. Also acceptable under the brief, but it is harder to validate in a fidelity test and duplicates the junction-row logic.

## Rules enforced in code review / tests

- No f-strings, `%` formatting or `+` concatenation building SQL with runtime values. Table and column names are fixed literals.
- `psycopg` is the only DB dependency. The acceptance check greps `pyproject.toml` for banned packages.
- Multi-step writes (migrations, seed) happen inside explicit transactions.
- Credentials come only from `DATABASE_URL` (env). `.env.example` holds placeholders.

## Consequences

- One `docker compose up -d db` (or a local Postgres) is needed before running the API or integration tests.
- Integration tests run against a real Postgres test database (`recruiter_bot_test`), never a mock. This catches SQL errors that unit tests can't.
