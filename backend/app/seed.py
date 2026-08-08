"""Popula o banco com roles, permissões e uma barbearia de demonstração.

Uso: python -m app.seed
Idempotente: pode ser executado múltiplas vezes sem duplicar dados.
"""

import logging

from sqlalchemy.orm import Session

from app.core.permissions import ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, ROLE_DEFINITIONS
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.permission import Permission, RolePermission
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.services.payment_method_service import seed_default_payment_methods
from app.services.scheduling_settings_service import seed_default_business_hours

logger = logging.getLogger("barberflow.seed")

DEMO_PASSWORD = "Demo@1234"  # nosec: apenas para ambiente de demonstração/dev


def _seed_permissions(db: Session) -> dict[str, Permission]:
    existing = {p.code: p for p in db.query(Permission).all()}
    for code in ALL_PERMISSIONS:
        if code not in existing:
            module = code.split(".")[0]
            permission = Permission(code=code, module=module)
            db.add(permission)
            existing[code] = permission
    db.flush()
    return existing


def _seed_roles(db: Session, permissions: dict[str, Permission]) -> dict[str, Role]:
    existing = {r.code: r for r in db.query(Role).all()}
    for code, name in ROLE_DEFINITIONS.items():
        role = existing.get(code)
        if role is None:
            role = Role(code=code, name=name)
            db.add(role)
            db.flush()
            existing[code] = role

        assigned = {
            rp.permission_id
            for rp in db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
        }
        for perm_code in DEFAULT_ROLE_PERMISSIONS[code]:
            permission = permissions[perm_code]
            if permission.id not in assigned:
                db.add(RolePermission(role_id=role.id, permission_id=permission.id))
    db.flush()
    return existing


def _seed_demo_tenant(db: Session, roles: dict[str, Role]) -> None:
    tenant = db.query(Tenant).filter(Tenant.slug == "elite-barber").one_or_none()
    if tenant is None:
        tenant = Tenant(
            name="Elite Barber",
            slug="elite-barber",
            phone="(11) 99999-0000",
            email="contato@elitebarber.com",
            city="São Paulo",
            onboarding_completed=True,
        )
        db.add(tenant)
        db.flush()

    demo_users = [
        ("Administrador Demo", "admin@elitebarber.com", "OWNER"),
        ("Barbeiro Demo", "barbeiro@elitebarber.com", "BARBER"),
        ("Recepção Demo", "recepcao@elitebarber.com", "RECEPTIONIST"),
    ]
    for full_name, email, role_code in demo_users:
        if db.query(User).filter(User.email == email).one_or_none() is not None:
            continue
        db.add(
            User(
                tenant_id=tenant.id,
                full_name=full_name,
                email=email,
                hashed_password=hash_password(DEMO_PASSWORD),
                role_id=roles[role_code].id,
            )
        )
    db.flush()


def _seed_business_hours_for_all_tenants(db: Session) -> None:
    for tenant in db.query(Tenant).all():
        seed_default_business_hours(db, tenant.id)


def _seed_payment_methods_for_all_tenants(db: Session) -> None:
    for tenant in db.query(Tenant).all():
        seed_default_payment_methods(db, tenant.id)


def run_seed() -> None:
    db = SessionLocal()
    try:
        permissions = _seed_permissions(db)
        roles = _seed_roles(db, permissions)
        _seed_demo_tenant(db, roles)
        _seed_business_hours_for_all_tenants(db)
        _seed_payment_methods_for_all_tenants(db)
        db.commit()
        logger.info("Seed concluído com sucesso.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_seed()
