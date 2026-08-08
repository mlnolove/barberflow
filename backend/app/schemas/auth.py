from pydantic import BaseModel, EmailStr, Field

from app.schemas.tenant import TenantRead
from app.schemas.user import UserRead


class TenantSignupRequest(BaseModel):
    tenant_name: str = Field(min_length=2, max_length=150)
    owner_full_name: str = Field(min_length=2, max_length=150)
    owner_email: EmailStr
    owner_password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead
    tenant: TenantRead
