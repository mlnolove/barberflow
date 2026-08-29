import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.exceptions import DomainError, NotFoundError
from app.models.subscription import (
    BillingInterval,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.repositories.subscription_plan_repository import SubscriptionPlanRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.subscription import SubscriptionPlanRead, SubscriptionRead
from app.services import audit_service

_USABLE_STATUSES = {SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE}
_PERIOD_BY_INTERVAL = {
    BillingInterval.MONTHLY: timedelta(days=30),
    BillingInterval.ANNUAL: timedelta(days=365),
}


def effective_status(subscription: Subscription) -> SubscriptionStatus:
    """Status "de verdade" no momento da leitura — sem depender de um job
    agendado para expirar assinaturas: um TRIAL/ACTIVE cujo período já
    passou é tratado como EXPIRED, mesmo que a coluna ainda diga o status
    antigo (não há scheduler/cron nesta infraestrutura)."""
    if subscription.status in (SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED):
        return subscription.status
    if subscription.current_period_end < datetime.now(UTC):
        return SubscriptionStatus.EXPIRED
    return subscription.status


def is_usable(subscription: Subscription) -> bool:
    return effective_status(subscription) in _USABLE_STATUSES


def to_read(subscription: Subscription) -> SubscriptionRead:
    return SubscriptionRead(
        id=subscription.id,
        plan=SubscriptionPlanRead.model_validate(subscription.plan),
        status=effective_status(subscription),
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        cancelled_at=subscription.cancelled_at,
    )


def list_plans(db: Session) -> list[SubscriptionPlan]:
    return SubscriptionPlanRepository(db).list_active()


def provision_trial_subscription(
    db: Session, tenant_id: uuid.UUID, plan: SubscriptionPlan
) -> Subscription:
    """Chamado no signup do proprietário — toda barbearia nasce com um
    período de teste (seção 11: "período de teste, se futuramente
    utilizado"), sem exigir cartão nem gateway configurado. Recebe o plano
    já buscado (e validado) pelo chamador, em vez de buscar de novo pelo
    código — `auth_service.signup_tenant` já precisa fazer essa consulta
    pra validar o `plan_code` antes de criar o tenant."""
    now = datetime.now(UTC)
    subscription = Subscription(
        plan_id=plan.id,
        status=SubscriptionStatus.TRIAL,
        current_period_start=now,
        current_period_end=now + timedelta(days=plan.trial_days),
    )
    return SubscriptionRepository(db, tenant_id).add(subscription)


def activate_subscription(subscription: Subscription) -> None:
    """Chamado quando um pagamento de assinatura é confirmado (webhook do
    gateway) — move para ACTIVE e abre um novo período a partir de agora,
    pelo intervalo do plano contratado. Não comita: quem chama decide o
    momento, junto com o `Payment` que originou a ativação."""
    period = _PERIOD_BY_INTERVAL[subscription.plan.billing_interval]
    now = datetime.now(UTC)
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.current_period_start = now
    subscription.current_period_end = now + period
    subscription.cancel_at_period_end = False


def get_current_subscription(db: Session, tenant_id: uuid.UUID) -> Subscription:
    subscription = SubscriptionRepository(db, tenant_id).get_current()
    if subscription is None:
        raise NotFoundError("Esta barbearia não tem assinatura configurada.")
    return subscription


def cancel_subscription(db: Session, tenant_id: uuid.UUID, user_id: uuid.UUID) -> Subscription:
    subscription = get_current_subscription(db, tenant_id)
    if effective_status(subscription) not in _USABLE_STATUSES:
        raise DomainError("Esta assinatura já não está ativa.")

    subscription.cancelled_at = datetime.now(UTC)
    if subscription.status is SubscriptionStatus.TRIAL:
        # Sem pagamento efetivado no período de teste, não há "período já
        # pago" a preservar — cancela na hora.
        subscription.status = SubscriptionStatus.CANCELLED
    else:
        # ACTIVE: mantém o acesso até o fim do período já cobrado, prática
        # padrão de SaaS.
        subscription.cancel_at_period_end = True

    audit_service.log_user_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="subscription.cancel",
        resource_type="subscription",
        resource_id=subscription.id,
    )
    db.commit()
    return subscription
