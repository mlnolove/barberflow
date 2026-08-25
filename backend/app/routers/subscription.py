from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.schemas.subscription import CheckoutResponse, SubscriptionPlanRead, SubscriptionRead
from app.services import payment_service, subscription_service

router = APIRouter(prefix="/api/subscription", tags=["subscription"])


@router.get("/plans", response_model=list[SubscriptionPlanRead])
def list_plans(
    current_user: CurrentUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    return subscription_service.list_plans(db)


@router.get("", response_model=SubscriptionRead)
def get_subscription(
    current_user: CurrentUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    subscription = subscription_service.get_current_subscription(db, current_user.tenant_id)
    return subscription_service.to_read(subscription)


@router.post("/cancel", response_model=SubscriptionRead)
def cancel_subscription(
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    subscription = subscription_service.cancel_subscription(
        db, current_user.tenant_id, current_user.user.id
    )
    return subscription_service.to_read(subscription)


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    payment, checkout_url = payment_service.create_subscription_checkout(
        db, current_user.tenant_id, current_user.user.email
    )
    return CheckoutResponse(
        payment_id=payment.id, checkout_url=checkout_url, status=payment.status.value
    )
