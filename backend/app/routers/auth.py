from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import CurrentUserDep
from app.core.exceptions import InvalidOrExpiredTokenError
from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, TenantSignupRequest
from app.schemas.tenant import TenantRead
from app.schemas.user import UserRead
from app.services import auth_service
from app.services.permission_service import get_effective_permissions

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


def _to_auth_response(db: Session, result: auth_service.AuthResult) -> AuthResponse:
    permissions = sorted(get_effective_permissions(db, result.user))
    user_read = UserRead.model_validate(result.user)
    user_read = user_read.model_copy(update={"permissions": permissions})
    return AuthResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=user_read,
        tenant=TenantRead.model_validate(result.tenant),
    )


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: TenantSignupRequest, response: Response, db: Session = Depends(get_db)):
    result = auth_service.signup_tenant(db, payload)
    _set_refresh_cookie(response, result.refresh_token)
    return _to_auth_response(db, result)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    result = auth_service.login(db, payload)
    _set_refresh_cookie(response, result.refresh_token)
    return _to_auth_response(db, result)


@router.post("/refresh", response_model=AuthResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise InvalidOrExpiredTokenError()
    result = auth_service.refresh_access_token(db, refresh_token)
    _set_refresh_cookie(response, result.refresh_token)
    return _to_auth_response(db, result)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        auth_service.logout(db, refresh_token)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUserDep, db: Session = Depends(get_db)):
    user_read = UserRead.model_validate(current_user.user)
    return user_read.model_copy(update={"permissions": sorted(current_user.permissions)})
