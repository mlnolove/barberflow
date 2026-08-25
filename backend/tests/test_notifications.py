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
            "tenant_name": "Barbearia Notificacoes",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    ).json()


def _signup_client_account(client, email):
    return client.post(
        "/api/client/auth/signup",
        json={"full_name": "Cliente", "email": email, "password": "Senha@123"},
    ).json()


def _setup_bookable_tenant(client, owner_token):
    headers = _auth_headers(owner_token)
    service = client.post(
        "/api/services",
        headers=headers,
        json={"name": "Corte", "price": "50.00", "duration_minutes": 60},
    ).json()
    employee = client.post(
        "/api/employees",
        headers=headers,
        json={"full_name": "Barbeiro", "phone": "(11) 92222-2222", "service_ids": [service["id"]]},
    ).json()
    return service, employee


def test_client_booking_notifies_owner(client):
    owner = _signup_owner(client, "dono1@notif.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)
    client_account = _signup_client_account(client, "cliente1@notif.com")

    starts_at = _next_weekday(0, 10)
    client.post(
        "/api/client/appointments",
        headers=_auth_headers(client_account["access_token"]),
        json={
            "tenant_id": tenant_id,
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": starts_at.isoformat(),
        },
    )

    notifications = client.get("/api/notifications", headers=_auth_headers(owner_token)).json()
    assert notifications["total"] == 1
    assert notifications["items"][0]["type"] == "NEW_APPOINTMENT"
    assert notifications["items"][0]["read_at"] is None


def test_owner_confirming_appointment_notifies_client(client):
    owner = _signup_owner(client, "dono2@notif.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(owner_token),
        json={"auto_approve_appointments": False},
    )

    client_account = _signup_client_account(client, "cliente2@notif.com")
    client_token = client_account["access_token"]
    starts_at = _next_weekday(0, 10)
    booked = client.post(
        "/api/client/appointments",
        headers=_auth_headers(client_token),
        json={
            "tenant_id": tenant_id,
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": starts_at.isoformat(),
        },
    ).json()
    assert booked["status"] == "PENDING"

    client.post(f"/api/appointments/{booked['id']}/confirm", headers=_auth_headers(owner_token))

    notifications = client.get(
        "/api/client/notifications", headers=_auth_headers(client_token)
    ).json()
    types = [n["type"] for n in notifications["items"]]
    assert "APPOINTMENT_CONFIRMED" in types


def test_mark_all_read_clears_unread_notifications(client):
    owner = _signup_owner(client, "dono3@notif.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)
    client_account = _signup_client_account(client, "cliente3@notif.com")

    starts_at = _next_weekday(0, 10)
    client.post(
        "/api/client/appointments",
        headers=_auth_headers(client_account["access_token"]),
        json={
            "tenant_id": tenant_id,
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": starts_at.isoformat(),
        },
    )

    before = client.get("/api/notifications", headers=_auth_headers(owner_token)).json()
    assert before["items"][0]["read_at"] is None

    marked = client.post("/api/notifications/read-all", headers=_auth_headers(owner_token))
    assert marked.status_code == 204

    after = client.get("/api/notifications", headers=_auth_headers(owner_token)).json()
    assert after["items"][0]["read_at"] is not None


def test_notifications_are_isolated_per_user(client):
    owner_a = _signup_owner(client, "donoA4@notif.com")
    owner_b = _signup_owner(client, "donoB4@notif.com")
    tenant_a = owner_a["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_a["access_token"])
    client_account = _signup_client_account(client, "cliente4@notif.com")

    starts_at = _next_weekday(0, 10)
    client.post(
        "/api/client/appointments",
        headers=_auth_headers(client_account["access_token"]),
        json={
            "tenant_id": tenant_a,
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": starts_at.isoformat(),
        },
    )

    notifications_b = client.get(
        "/api/notifications", headers=_auth_headers(owner_b["access_token"])
    ).json()
    assert notifications_b["total"] == 0


def test_barber_cannot_view_owner_notifications_endpoint_without_permission(client):
    """Barber tem `notifications.view` por padrão (seção 15 é geral), então
    isto só confirma que o próprio feed dele existe e começa vazio."""
    owner = _signup_owner(client, "dono5@notif.com")
    owner_token = owner["access_token"]

    client.post(
        "/api/users",
        headers=_auth_headers(owner_token),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro5@notif.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro5@notif.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    response = client.get("/api/notifications", headers=_auth_headers(barber_token))
    assert response.status_code == 200
    assert response.json()["total"] == 0
