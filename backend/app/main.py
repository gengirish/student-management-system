from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

from app.core.config import settings
from app.db.session import check_db_connection
from app.routers import auth, courses, enrollments, grades, students, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        upload_root = Path(settings.UPLOAD_DIR)
        (upload_root / "profiles").mkdir(parents=True, exist_ok=True)
    except OSError:
        pass
    yield


app = FastAPI(
    title="Student Management System API",
    description="REST API for authentication, students, courses, enrollments, and grades.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, _exc: IntegrityError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "detail": "This operation conflicts with existing data (for example a duplicate email or student number).",
            "code": "INTEGRITY_ERROR",
        },
    )


@app.exception_handler(OperationalError)
async def operational_error_handler(request: Request, exc: OperationalError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "detail": "The database is not available right now. Please check that PostgreSQL is running and try again.",
            "code": "DATABASE_UNAVAILABLE",
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    if isinstance(exc, OperationalError):
        raise exc
    return JSONResponse(
        status_code=500,
        content={
            "detail": "A data layer error occurred. Please try again later.",
            "code": "DATABASE_ERROR",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.get("/health")
def health() -> dict:
    ok = check_db_connection()
    return {
        "status": "ok" if ok else "degraded",
        "database": "connected" if ok else "disconnected",
    }


static_dir = Path(settings.UPLOAD_DIR)
if static_dir.exists() and any(static_dir.iterdir()):
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(enrollments.router, prefix="/api")
app.include_router(grades.router, prefix="/api")
