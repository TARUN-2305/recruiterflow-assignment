"""Error handlers: clear 404s, and a generic 500 that never leaks stack traces or DB details."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.services.matching_service import NotFoundError

logger = logging.getLogger(__name__)


async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(NotFoundError, not_found_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
