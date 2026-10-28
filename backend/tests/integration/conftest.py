"""Integration fixtures: a real PostgreSQL test database, rebuilt once per test session."""

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from psycopg.conninfo import conninfo_to_dict

import app.config  # noqa: F401  (loads backend/.env so TEST_DATABASE_URL is available)
from app.db.connection import Connection, connect, get_database_url
from app.main import create_app
from scripts.migrate import apply_migrations
from scripts.seed import load_seed, seed


@pytest.fixture(scope="session")
def db_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL", "").strip()
    if not url:
        pytest.skip("TEST_DATABASE_URL is not set: integration tests need PostgreSQL (see README)")
    # Safety net: this fixture wipes the schema, so refuse anything but a *_test database.
    dbname = conninfo_to_dict(url).get("dbname", "")
    if not str(dbname).endswith("_test"):
        pytest.fail(f"TEST_DATABASE_URL must point at a database ending in _test, got {dbname!r}")

    with connect(url) as conn:
        conn.execute("DROP SCHEMA public CASCADE")
        conn.execute("CREATE SCHEMA public")
        apply_migrations(conn)
        seed(conn, load_seed())
    return url


@pytest.fixture
def conn(db_url: str) -> Iterator[Connection]:
    with connect(db_url) as connection:
        yield connection


@pytest.fixture
def client(db_url: str) -> Iterator[TestClient]:
    application = create_app()
    application.dependency_overrides[get_database_url] = lambda: db_url
    with TestClient(application) as test_client:
        yield test_client
