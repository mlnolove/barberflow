from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import CurrentClientDep
from app.core.exceptions import InvalidOrExpiredTokenError
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.schemas.client_auth import (
    ClientAuthResponse,
    ClientLoginRequest,
    ClientSignupRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
)
from app.schemas.client_profile import ClientRead
from app.services import client_auth_service, password_reset_service
from app.services.password_reset_service import ResetRealm

router = APIRouter(prefix="/api/client/auth", tags=["client-auth"])

REFRESH_COOKIE_NAME = "client_refresh_token"
REFRESH_COOKIE_PATH = "/api/client/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    is_production = settings.ENVIRONMENT != "development"
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


def _to_auth_response(result: client_auth_service.ClientAuthResult) -> ClientAuthResponse:
    return ClientAuthResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        client=ClientRead.model_validate(result.client),
    )


@router.post(
    "/signup",
    response_model=ClientAuthResponse,
    status_code=201,
    dependencies=[Depends(rate_limit("client_signup"))],
)
def signup(payload: ClientSignupRequest, response: Response, db: Session = Depends(get_db)):
    result = client_auth_service.signup(db, payload)
    _set_refresh_cookie(response, result.refresh_token)
    return _to_auth_response(result)


@router.post(
    "/login", response_model=ClientAuthResponse, dependencies=[Depends(rate_limit("client_login"))]
)
def login(payload: ClientLoginRequest, response: Response, db: Session = Depends(get_db)):
    result = client_auth_service.login(db, payload)
    _set_refresh_cookie(response, result.refresh_token)
    return _to_auth_response(result)


@router.post("/refresh", response_model=ClientAuthResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise InvalidOrExpiredTokenError()
    result = client_auth_service.refresh_access_token(db, refresh_token)
    _set_refresh_cookie(response, result.refresh_token)
    return _to_auth_response(result)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        client_auth_service.logout(db, refresh_token)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


@router.get("/me", response_model=ClientRead)
def me(current_client: CurrentClientDep):
    return ClientRead.model_validate(current_client.client)


@router.post(
    "/password-reset/request",
    status_code=204,
    dependencies=[Depends(rate_limit("client_password_reset"))],
)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    password_reset_service.request_reset(db, ResetRealm.CLIENT, payload.email)


@router.post("/password-reset/confirm", status_code=204)
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    password_reset_service.confirm_reset(db, payload.token, payload.new_password)
