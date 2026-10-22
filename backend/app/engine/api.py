"""FastAPI server.   Start:  python -m uvicorn src.api:app --host 127.0.0.1 --port 8000
Docs (auto-generated):  http://127.0.0.1:8000/docs
"""
import logging
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Body, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .engine import (DuplicateInternship, EngineUnavailable, RecommendationEngine, get_default_engine)
from .profile import InputError

log = logging.getLogger("internsetu")
VERSION = "1.0.0"


class RecommendRequest(BaseModel):
    profile: dict = Field(description="Candidate profile using canonical taxonomy IDs (see README).")
    k: int = Field(5, ge=3, le=5, description="How many recommendations to return (3 to 5).")
    method: Literal["hybrid", "baseline", "tfidf", "semantic"] = Field(
        "hybrid", description="Ranking method. 'baseline' and 'tfidf' need no model download.")


def _error(status, error, details=None):
    return JSONResponse(status_code=status, content={"error": error, "details": details or []})


def _readable(err):
    where = ".".join(str(p) for p in err["loc"] if p != "body") or "request body"
    return f"{where}: {err['msg']}"


def create_app(engine=None, preload=True):
    @asynccontextmanager
    async def lifespan(app):
        if preload:
            try:
                app.state.engine.preload()
            except EngineUnavailable as e:
                log.warning("Semantic model not available at start-up: %s", e)
        yield

    app = FastAPI(title="InternSetu Recommendation Engine", version=VERSION, lifespan=lifespan,
                  description="Eligibility-first, explainable internship recommendations.")
    app.state.engine = engine or get_default_engine()

    @app.exception_handler(RequestValidationError)
    async def bad_request(request: Request, exc: RequestValidationError):
        return _error(422, "The request is not valid.", [_readable(e) for e in exc.errors()])

    @app.exception_handler(InputError)
    async def bad_input(request: Request, exc: InputError):
        return _error(422, "The request is not valid.", exc.problems)

    @app.exception_handler(EngineUnavailable)
    async def unavailable(request: Request, exc: EngineUnavailable):
        return _error(503, "A ranking component is not available.", [str(exc)])

    @app.exception_handler(DuplicateInternship)
    async def duplicate(request: Request, exc: DuplicateInternship):
        return _error(409, "Internship already exists.", [str(exc)])

    @app.get("/health")
    def health():
        return {"status": "ok", "version": VERSION, **app.state.engine.status()}

    @app.post("/recommend")
    def recommend(req: RecommendRequest):
        return app.state.engine.recommend(req.profile, k=req.k, method=req.method)

    @app.post("/internships", status_code=201)
    def add_internship(record: dict = Body(..., description="One internship record (see README).")):
        rec, saved = app.state.engine.add_internship(record)
        return {"message": "Internship added.", "internship_id": rec["internship_id"],
                "saved_to_disk": saved, "internships_in_catalog": len(app.state.engine.internships)}

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception):
        log.exception("Unexpected error")
        return _error(500, "Unexpected server error.", [f"{type(exc).__name__}: {exc}"])

    return app


app = create_app()
