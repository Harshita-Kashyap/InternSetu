"""Request logging with a request ID, and a JSON 500 page that carries the ID (so a user can quote it).

Logged per request: ID, method, path (never the query string, body, headers or token), status, time in ms.
"""
import logging
import re
import time
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.errors import error_body

log = logging.getLogger("internsetu.request")
_VALID_ID = re.compile(r"^[A-Za-z0-9_-]{6,64}$")


def setup_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    logging.getLogger("internsetu").setLevel(level)


class RequestLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("x-request-id", "")
        rid = incoming if _VALID_ID.match(incoming) else uuid.uuid4().hex[:12]
        request.state.request_id = rid
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:  # an unexpected crash: log it with the traceback, answer with a clean JSON error
            ms = int((time.perf_counter() - started) * 1000)
            log.exception("request id=%s %s %s -> 500 (%d ms) unhandled error", rid, request.method, request.url.path, ms)
            response = JSONResponse(
                status_code=500,
                content=error_body("server_error", f"Something went wrong on our side. Please try again. If it keeps happening, tell us this reference: {rid}"),
            )
            response.headers["X-Request-ID"] = rid
            return response
        ms = int((time.perf_counter() - started) * 1000)
        level = logging.DEBUG if request.url.path == "/health" else (logging.WARNING if response.status_code >= 500 else logging.INFO)
        log.log(level, "request id=%s %s %s -> %d (%d ms)", rid, request.method, request.url.path, response.status_code, ms)
        response.headers["X-Request-ID"] = rid
        return response
