from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import CurrentUserDep
from app.core.exceptions import InvalidOrExpiredTokenError
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, TenantSignupRequest
from app.schemas.client_auth import PasswordResetConfirm, PasswordResetRequest
from app.schemas.subscription import SubscriptionPlanRead
from app.schemas.tenant import TenantRead
from app.schemas.user import UserRead
from app.services import auth_service, password_reset_service, subscription_service
from app.services.password_reset_service import ResetRealm
from app.services.permission_service import get_effective_permissions

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    is_production = settings.ENVIRONMENT != "development"
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=is_production,
        # "none" em produção: o app nativo (Capacitor) carrega o WebView de
        # `https://localhost`, uma origem diferente da API — sem isso o
        # navegador nunca envia o cookie de refresh nas requisições
        # cross-origin. "none" exige Secure=True, daí a amarração com
        # is_production acima. Em dev local, "lax" é suficiente e evita
        # precisar de HTTPS na máquina do desenvolvedor.
        samesite="none" if is_production else "lax",
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


@router.get("/signup-plans", response_model=list[SubscriptionPlanRead])
def signup_plans(db: Session = Depends(get_db)):
    """Planos disponíveis para escolha na criação da barbearia — endpoint
    público (sem login) porque é consultado antes de existir qualquer
    conta."""
    return subscription_service.list_plans(db)


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=201,
    dependencies=[Depends(rate_limit("staff_signup"))],
)
def signup(payload: TenantSignupRequest, response: Response, db: Session = Depends(get_db)):
    result = auth_service.signup_tenant(db, payload)
    _set_refresh_cookie(response, result.refresh_token)
    return _to_auth_response(db, result)


@router.post(
    "/login", response_model=AuthResponse, dependencies=[Depends(rate_limit("staff_login"))]
)
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


@router.post(
    "/password-reset/request",
    status_code=204,
    dependencies=[Depends(rate_limit("staff_password_reset"))],
)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    password_reset_service.request_reset(db, ResetRealm.STAFF, payload.email)


@router.post("/password-reset/confirm", status_code=204)
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    password_reset_service.confirm_reset(db, payload.token, payload.new_password)
