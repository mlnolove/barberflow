import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import (
    ConflictError,
    DomainError,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidOrExpiredTokenError,
    NotFoundError,
    PermissionDeniedError,
)
from app.routers import (
    appointments,
    auth,
    customers,
    dashboard,
    employees,
    financial,
    health,
    inventory,
    scheduling_settings,
    services,
    suppliers,
    users,
)

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("barberflow")

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_STATUS_BY_ERROR: dict[type[DomainError], int] = {
    InvalidCredentialsError: 401,
    InvalidOrExpiredTokenError: 401,
    PermissionDeniedError: 403,
    NotFoundError: 404,
    EmailAlreadyExistsError: 409,
    ConflictError: 409,
}


@app.exception_handler(DomainError)
def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    status_code = _STATUS_BY_ERROR.get(type(exc), 400)
    return JSONResponse(status_code=status_code, content={"detail": exc.message})


@app.exception_handler(Exception)
def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Erro não tratado ao processar %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ocorreu um erro inesperado. Tente novamente mais tarde."},
    )


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(customers.router)
app.include_router(services.router)
app.include_router(employees.router)
app.include_router(appointments.router)
app.include_router(scheduling_settings.router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(financial.router)
app.include_router(dashboard.router)
