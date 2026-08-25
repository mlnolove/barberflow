import uuid
from datetime import UTC, datetime, timedelta

from app.models.subscription import Subscription, SubscriptionStatus
from app.repositories.subscription_plan_repository import SubscriptionPlanRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.services import subscription_service


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Assinatura",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    ).json()


def test_signup_provisions_trial_subscription(client):
    owner = _signup_owner(client, "dono1@sub.com")
    response = client.get("/api/subscription", headers=_auth_headers(owner["access_token"]))
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "TRIAL"
    assert body["plan"]["code"] == "monthly"
    assert body["cancel_at_period_end"] is False


def test_list_plans_returns_seeded_catalog(client):
    owner = _signup_owner(client, "dono2@sub.com")
    response = client.get("/api/subscription/plans", headers=_auth_headers(owner["access_token"]))
    assert response.status_code == 200
    codes = {p["code"] for p in response.json()}
    assert codes == {"monthly", "annual"}


def test_cancel_trial_subscription_cancels_immediately(client):
    owner = _signup_owner(client, "dono3@sub.com")
    headers = _auth_headers(owner["access_token"])

    cancelled = client.post("/api/subscription/cancel", headers=headers)
    assert cancelled.status_code == 200
    body = cancelled.json()
    assert body["status"] == "CANCELLED"
    assert body["cancel_at_period_end"] is False

    still = client.get("/api/subscription", headers=headers)
    assert still.json()["status"] == "CANCELLED"


def test_cancelling_twice_fails(client):
    owner = _signup_owner(client, "dono4@sub.com")
    headers = _auth_headers(owner["access_token"])

    client.post("/api/subscription/cancel", headers=headers)
    second = client.post("/api/subscription/cancel", headers=headers)
    assert second.status_code == 400


def test_manager_cannot_view_subscription(client):
    owner = _signup_owner(client, "dono5@sub.com")
    owner_token = owner["access_token"]

    client.post(
        "/api/users",
        headers=_auth_headers(owner_token),
        json={
            "full_name": "Gerente",
            "email": "gerente5@sub.com",
            "password": "Senha@123",
            "role_code": "MANAGER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "gerente5@sub.com", "password": "Senha@123"}
    )
    manager_token = login.json()["access_token"]

    response = client.get("/api/subscription", headers=_auth_headers(manager_token))
    assert response.status_code == 403


def test_subscription_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA6@sub.com")
    owner_b = _signup_owner(client, "donoB6@sub.com")

    client.post("/api/subscription/cancel", headers=_auth_headers(owner_a["access_token"]))

    still_active = client.get(
        "/api/subscription", headers=_auth_headers(owner_b["access_token"])
    ).json()
    assert still_active["status"] == "TRIAL"


def test_cancelling_active_subscription_defers_to_period_end(client, db_session):
    owner = _signup_owner(client, "dono7@sub.com")
    tenant_id = owner["tenant"]["id"]
    user_id = uuid.UUID(owner["user"]["id"])

    repo = SubscriptionRepository(db_session, tenant_id)
    subscription = repo.get_current()
    plan = SubscriptionPlanRepository(db_session).get_by_code("monthly")
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.plan_id = plan.id
    now = datetime.now(UTC)
    subscription.current_period_start = now
    subscription.current_period_end = now + timedelta(days=30)
    db_session.commit()

    cancelled = subscription_service.cancel_subscription(db_session, tenant_id, user_id)
    assert cancelled.status == SubscriptionStatus.ACTIVE
    assert cancelled.cancel_at_period_end is True
    assert cancelled.cancelled_at is not None


def test_effective_status_treats_expired_period_as_expired():
    subscription = Subscription(
        status=SubscriptionStatus.TRIAL,
        current_period_start=datetime.now(UTC) - timedelta(days=20),
        current_period_end=datetime.now(UTC) - timedelta(days=1),
    )
    assert subscription_service.effective_status(subscription) == SubscriptionStatus.EXPIRED
    assert subscription_service.is_usable(subscription) is False
