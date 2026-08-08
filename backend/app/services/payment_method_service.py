import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.payment_method import PaymentMethod
from app.repositories.payment_method_repository import PaymentMethodRepository

DEFAULT_PAYMENT_METHODS: list[tuple[str, str]] = [
    ("dinheiro", "Dinheiro"),
    ("pix", "PIX"),
    ("debito", "Débito"),
    ("credito", "Crédito"),
    ("outros", "Outros"),
]


def seed_default_payment_methods(db: Session, tenant_id: uuid.UUID) -> None:
    """Idempotente: não faz nada se o tenant já tiver formas de pagamento."""
    if PaymentMethodRepository(db, tenant_id).list_all():
        return
    for code, name in DEFAULT_PAYMENT_METHODS:
        db.add(PaymentMethod(tenant_id=tenant_id, code=code, name=name))
    db.flush()


def list_payment_methods(db: Session, tenant_id: uuid.UUID) -> list[PaymentMethod]:
    return PaymentMethodRepository(db, tenant_id).list_all()


def get_payment_method(
    db: Session, tenant_id: uuid.UUID, payment_method_id: uuid.UUID
) -> PaymentMethod:
    method = PaymentMethodRepository(db, tenant_id).get_by_id(payment_method_id)
    if method is None:
        raise NotFoundError("Forma de pagamento não encontrada.")
    return method


def set_payment_method_active(
    db: Session, tenant_id: uuid.UUID, payment_method_id: uuid.UUID, is_active: bool
) -> PaymentMethod:
    method = get_payment_method(db, tenant_id, payment_method_id)
    method.is_active = is_active
    db.commit()
    return method
