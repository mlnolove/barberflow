import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.payment_gateway import get_payment_gateway
from app.models.notification import NotificationType
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.subscription import Subscription
from app.repositories.payment_repository import PaymentRepository, find_payment_by_external_id
from app.repositories.user_repository import find_tenant_owner
from app.services import notification_service, subscription_service


def _notify_owner(
    db: Session, tenant_id: uuid.UUID, type_: NotificationType, title: str, body: str
) -> None:
    owner = find_tenant_owner(db, tenant_id)
    if owner is not None:
        notification_service.notify_user(
            db, tenant_id=tenant_id, user_id=owner.id, type_=type_, title=title, body=body
        )


def create_subscription_checkout(
    db: Session, tenant_id: uuid.UUID, payer_email: str
) -> tuple[Payment, str | None]:
    """Cria a cobrança da assinatura atual. Sem gateway real configurado
    (`SandboxPaymentGateway`), o pagamento é aprovado na hora — não há
    quem confirme um webhook que nunca vai chegar."""
    subscription = subscription_service.get_current_subscription(db, tenant_id)
    plan = subscription.plan

    payment = PaymentRepository(db, tenant_id).add(
        Payment(
            purpose=PaymentPurpose.SUBSCRIPTION,
            subscription_id=subscription.id,
            amount=plan.price,
            status=PaymentStatus.PENDING,
        )
    )

    gateway = get_payment_gateway()
    checkout = gateway.create_checkout(
        amount=plan.price,
        description=f"Assinatura {plan.name} — BarberFlow",
        external_reference=str(payment.id),
        payer_email=payer_email,
    )
    payment.external_payment_id = checkout.external_payment_id
    payment.gateway = "mercadopago" if checkout.checkout_url else "sandbox"

    if checkout.checkout_url is None:
        payment.status = PaymentStatus.PAID
        payment.paid_at = datetime.now(UTC)
        subscription_service.activate_subscription(subscription)
        _notify_owner(
            db,
            tenant_id,
            NotificationType.PAYMENT_CONFIRMED,
            "Pagamento confirmado",
            f"Assinatura {plan.name} renovada com sucesso.",
        )

    db.commit()
    return payment, checkout.checkout_url


def process_webhook(db: Session, *, headers: dict[str, str], payload: dict) -> None:
    """Idempotente: um webhook duplicado (o próprio Mercado Pago reenvia em
    caso de timeout) não reprocessa um pagamento já marcado como PAID."""
    gateway = get_payment_gateway()
    event = gateway.handle_webhook(headers=headers, payload=payload)
    if event is None:
        return

    payment = find_payment_by_external_id(db, event.external_payment_id)
    if payment is None or payment.status == PaymentStatus.PAID:
        return

    if event.status == "approved":
        payment.status = PaymentStatus.PAID
        payment.paid_at = datetime.now(UTC)
        if payment.purpose == PaymentPurpose.SUBSCRIPTION and payment.subscription_id:
            subscription = db.get(Subscription, payment.subscription_id)
            if subscription is not None:
                subscription_service.activate_subscription(subscription)
        _notify_owner(
            db,
            payment.tenant_id,
            NotificationType.PAYMENT_CONFIRMED,
            "Pagamento confirmado",
            "Seu pagamento foi confirmado.",
        )
    elif event.status in ("rejected", "cancelled"):
        payment.status = PaymentStatus.FAILED
        _notify_owner(
            db,
            payment.tenant_id,
            NotificationType.PAYMENT_FAILED,
            "Falha no pagamento",
            "Não conseguimos confirmar seu pagamento. Tente novamente.",
        )

    db.commit()
