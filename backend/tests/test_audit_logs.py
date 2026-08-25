from datetime import datetime, timedelta, timezone

TZ = timezone(timedelta(hours=-3))


def _next_weekday(target_weekday: int, hour: int) -> datetime:
    now = datetime.now(TZ)
    days_ahead = (target_weekday - now.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    target_date = (now + timedelta(days=days_ahead)).date()
    return datetime(target_date.year, target_date.month, target_date.day, hour, 0, tzinfo=TZ)


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Auditoria",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    ).json()


def test_subscription_cancel_creates_audit_log_entry(client):
    owner = _signup_owner(client, "dono1@audit.com")
    headers = _auth_headers(owner["access_token"])

    client.post("/api/subscription/cancel", headers=headers)

    logs = client.get("/api/audit-logs", headers=headers).json()
    assert logs["total"] == 1
    entry = logs["items"][0]
    assert entry["action"] == "subscription.cancel"
    assert entry["actor_type"] == "USER"
    assert entry["resource_type"] == "subscription"


def test_permission_override_creates_audit_log_entry(client):
    owner = _signup_owner(client, "dono2@audit.com")
    owner_token = owner["access_token"]
    headers = _auth_headers(owner_token)

    barber = client.post(
        "/api/users",
        headers=headers,
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro2@audit.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    ).json()

    client.put(
        f"/api/users/{barber['id']}/permissions",
        headers=headers,
        json={"permission_code": "finance.view", "granted": True},
    )

    logs = client.get("/api/audit-logs", headers=headers).json()
    action_names = [log["action"] for log in logs["items"]]
    assert "user_permission.override" in action_names


def test_voiding_transaction_creates_audit_log_entry(client):
    owner = _signup_owner(client, "dono3@audit.com")
    headers = _auth_headers(owner["access_token"])

    customer = client.post(
        "/api/customers", headers=headers, json={"full_name": "Cliente", "phone": "(11) 91111-1111"}
    ).json()
    service = client.post(
        "/api/services",
        headers=headers,
        json={"name": "Corte", "price": "40.00", "duration_minutes": 30},
    ).json()
    employee = client.post(
        "/api/employees",
        headers=headers,
        json={"full_name": "Barbeiro", "phone": "(11) 92222-2222", "service_ids": [service["id"]]},
    ).json()
    starts_at = _next_weekday(0, 10)
    appointment = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": starts_at.isoformat(),
        },
    ).json()
    client.post(f"/api/appointments/{appointment['id']}/confirm", headers=headers)
    client.post(f"/api/appointments/{appointment['id']}/start", headers=headers)
    client.post(
        f"/api/appointments/{appointment['id']}/complete",
        headers=headers,
        json={"payment_method_code": "pix"},
    )
    transaction_id = client.get("/api/financial/transactions", headers=headers).json()["items"][0][
        "id"
    ]

    client.post(
        f"/api/financial/transactions/{transaction_id}/void",
        headers=headers,
        json={"reason": "Lançamento duplicado."},
    )

    logs = client.get("/api/audit-logs", headers=headers).json()
    action_names = [log["action"] for log in logs["items"]]
    assert "financial_transaction.void" in action_names


def test_audit_logs_require_audit_permission(client):
    owner = _signup_owner(client, "dono4@audit.com")
    owner_token = owner["access_token"]

    client.post(
        "/api/users",
        headers=_auth_headers(owner_token),
        json={
            "full_name": "Gerente",
            "email": "gerente4@audit.com",
            "password": "Senha@123",
            "role_code": "MANAGER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "gerente4@audit.com", "password": "Senha@123"}
    )
    manager_token = login.json()["access_token"]

    response = client.get("/api/audit-logs", headers=_auth_headers(manager_token))
    assert response.status_code == 403


def test_audit_logs_are_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA5@audit.com")
    owner_b = _signup_owner(client, "donoB5@audit.com")

    client.post("/api/subscription/cancel", headers=_auth_headers(owner_a["access_token"]))

    logs_b = client.get("/api/audit-logs", headers=_auth_headers(owner_b["access_token"])).json()
    assert logs_b["total"] == 0
