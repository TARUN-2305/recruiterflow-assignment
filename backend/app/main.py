"""FastAPI application. Run (from backend/): uvicorn app.main:app --reload"""

from fastapi import FastAPI

from app.api.errors import register_error_handlers
from app.api.routes import router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Recruiter Bot",
        version="1.0.0",
        description="Ranks candidates for jobs and jobs for candidates (hand-written SQL).",
    )
    app.include_router(router)
    register_error_handlers(app)
    return app


app = create_app()
