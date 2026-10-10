"""One error format for the whole API:

{"error": {"code": "...", "message": "...", "fields": [{"field": "...", "message": "..."}]}}

`code` is stable (frontends can translate it); `fields` is only present for
validation errors so the UI can show the message next to the right input.
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str, fields: list[dict] | None = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.fields = fields


def error_body(code: str, message: str, fields: list[dict] | None = None) -> dict:
    body: dict = {"code": code, "message": message}
    if fields:
        body["fields"] = fields
    return {"error": body}


async def _api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message, exc.fields))


async def _http_error_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(f"http_{exc.status_code}", str(exc.detail)),
    )


async def _validation_error_handler(request: Request, exc: RequestValidationError):
    fields = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", ()) if p not in ("body", "query", "path")]
        msg = str(err.get("msg", "Invalid value"))
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        fields.append({"field": ".".join(loc), "message": msg})
    return JSONResponse(
        status_code=422,
        content=error_body("validation_error", "Please check the highlighted fields.", fields),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
