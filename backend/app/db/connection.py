"""Database connections. psycopg is used directly; every query is hand-written SQL."""

from collections.abc import Iterator
from typing import Annotated

import psycopg
from fastapi import Depends
from psycopg.rows import TupleRow

from app.config import database_url

Connection = psycopg.Connection[TupleRow]


def connect(url: str) -> Connection:
    # Autocommit: reads need no transaction; multi-step writes open one explicitly
    # with `conn.transaction()`.
    return psycopg.connect(url, autocommit=True)


def get_database_url() -> str:
    """FastAPI dependency (tests override it to point at the test database)."""
    return database_url()


def get_connection(url: Annotated[str, Depends(get_database_url)]) -> Iterator[Connection]:
    """FastAPI dependency: one connection per request, closed afterwards."""
    with connect(url) as conn:
        yield conn
