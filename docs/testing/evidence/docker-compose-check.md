# Docker Compose check (2026-10-28)

Docker 29.4.3, Compose v5.1.3, Windows 11. A separate Compose project was used so the run started from an empty database volume and did not touch the dev database.

```text
$ POSTGRES_PORT=5440 API_PORT=8010 docker compose -p rf-verify up -d --build --wait
 Container rf-verify-db-1 Healthy
 Container rf-verify-api-1 Healthy
api Up 6 seconds (healthy) 127.0.0.1:8010->8000/tcp
db Up 23 seconds (healthy) 127.0.0.1:5440->5432/tcp

$ docker compose -p rf-verify run --rm api python -m scripts.migrate     # twice
Applied: 001_recruiter_bot_schema.sql
No pending migrations.

$ docker compose -p rf-verify run --rm api python -m scripts.seed        # twice
Seeded 15 candidates and 6 jobs.
Seeded 15 candidates and 6 jobs.

$ docker compose -p rf-verify run --rm api python -m scripts.load_sql_detective
Loaded: recruiters 5, job_postings 7, applicants 11, interviews 24

$ curl -s http://127.0.0.1:8010/health
{"status":"ok"}
$ curl -s http://127.0.0.1:8010/jobs/1/matches        (summarised)
Backend Detective -> 15 matches; top Sherlock H. 95.0
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8010/jobs/999/matches
404

$ docker compose -p rf-verify exec -T api id
uid=10001(app) gid=10001(app) groups=10001(app)
$ docker image inspect rf-verify-api --format '{{range .Config.Env}}...'   # grep pass|database_url
no credentials in image env

$ docker compose -p rf-verify stop db
$ curl -s http://127.0.0.1:8010/health
{"status":"unavailable"}  <- HTTP 503
$ curl -s http://127.0.0.1:8010/jobs/1/matches
{"detail":"Internal server error"}  <- HTTP 500
$ docker compose -p rf-verify logs api | grep <password>
(no matches)

$ docker compose -p rf-verify down -v
 Volume rf-verify_pgdata Removed
```

Afterwards: `docker compose up -d db` (default project) starts only PostgreSQL, and `pytest` on the host still passes (63 tests).
