import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str | None
    role: RoleRead
    is_active: bool
    permissions: list[str] = Field(default_factory=list)


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = None
    role_code: str


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    role_code: str | None = None
    is_active: bool | None = None


class UserPermissionOverrideUpdate(BaseModel):
    permission_code: str
    granted: bool
