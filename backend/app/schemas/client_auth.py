from pydantic import BaseModel, EmailStr, Field

from app.schemas.client_profile import ClientRead


class ClientSignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = None


class ClientLoginRequest(BaseModel):
    email: EmailStr
    password: str


class ClientAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    client: ClientRead


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
