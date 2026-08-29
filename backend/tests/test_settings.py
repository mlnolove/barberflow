from datetime import datetime, timedelta, timezone

TZ = timezone(timedelta(hours=-3))


def _next_weekday(target_weekday: int, hour: int, minute: int = 0) -> datetime:
    now = datetime.now(TZ)
    days_ahead = (target_weekday - now.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    target_date = (now + timedelta(days=days_ahead)).date()
    return datetime(target_date.year, target_date.month, target_date.day, hour, minute, tzinfo=TZ)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _signup_owner(client, email="dono@config.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Config",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    )
    return response.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _create_customer(client, token, **overrides):
    payload = {"full_name": "Cliente Config", "phone": "(11) 91111-1111"}
    payload.update(overrides)
    return client.post("/api/customers", headers=_auth_headers(token), json=payload).json()


def _create_service(client, token, **overrides):
    payload = {"name": "Corte", "price": "40.00", "duration_minutes": 30}
    payload.update(overrides)
    return client.post("/api/services", headers=_auth_headers(token), json=payload).json()


def _create_employee(client, token, service_ids, **overrides):
    payload = {
        "full_name": "Barbeiro Config",
        "phone": "(11) 92222-2222",
        "service_ids": service_ids,
    }
    payload.update(overrides)
    return client.post("/api/employees", headers=_auth_headers(token), json=payload).json()


def test_get_tenant_settings_returns_defaults(client):
    owner = _signup_owner(client, "owner1@config.com")
    response = client.get("/api/settings/tenant", headers=_auth_headers(owner["access_token"]))
    assert response.status_code == 200
    body = response.json()
    assert body["min_advance_minutes"] == 30
    assert body["max_advance_days"] == 60
    assert body["allow_cancellation"] is True
    assert body["primary_color"] == "#0F172A"


def test_update_tenant_business_info(client):
    owner = _signup_owner(client, "owner2@config.com")
    token = owner["access_token"]
    response = client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(token),
        json={
            "name": "Nova Barbearia",
            "phone": "(11) 98888-7777",
            "address": "Rua das Tesouras, 100",
            "city": "São Paulo",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Nova Barbearia"
    assert body["address"] == "Rua das Tesouras, 100"


def test_update_tenant_appearance_colors(client):
    owner = _signup_owner(client, "owner3@config.com")
    token = owner["access_token"]
    response = client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(token),
        json={
            "primary_color": "#123456",
            "secondary_color": "#abcdef",
            "logo_url": "https://x.test/logo.png",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["primary_color"] == "#123456"
    assert body["secondary_color"] == "#ABCDEF"
    assert body["logo_url"] == "https://x.test/logo.png"


def test_update_tenant_with_invalid_color_fails(client):
    owner = _signup_owner(client, "owner4@config.com")
    response = client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(owner["access_token"]),
        json={"primary_color": "blue"},
    )
    assert response.status_code == 422


def test_update_tenant_scheduling_settings(client):
    owner = _signup_owner(client, "owner5@config.com")
    token = owner["access_token"]
    response = client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(token),
        json={"min_advance_minutes": 120, "max_advance_days": 14, "allow_cancellation": False},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["min_advance_minutes"] == 120
    assert body["max_advance_days"] == 14
    assert body["allow_cancellation"] is False


def test_manager_cannot_edit_settings(client):
    owner = _signup_owner(client, "owner6@config.com")
    token = owner["access_token"]
    client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Gerente",
            "email": "gerente6@config.com",
            "password": "Senha@123",
            "role_code": "MANAGER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "gerente6@config.com", "password": "Senha@123"}
    )
    manager_token = login.json()["access_token"]

    response = client.patch(
        "/api/settings/tenant", headers=_auth_headers(manager_token), json={"name": "Hackeado"}
    )
    assert response.status_code == 403

    view_response = client.get("/api/settings/tenant", headers=_auth_headers(manager_token))
    assert view_response.status_code == 403


def test_min_advance_minutes_enforced_on_appointment_creation(client):
    owner = _signup_owner(client, "owner7@config.com")
    token = owner["access_token"]
    headers = _auth_headers(token)
    client.patch("/api/settings/tenant", headers=headers, json={"min_advance_minutes": 60 * 24 * 3})

    customer = _create_customer(client, token)
    service = _create_service(client, token)
    employee = _create_employee(client, token, [service["id"]])
    # "amanhã" (não "a próxima segunda", que pode ser até 7 dias no futuro
    # dependendo de que dia o teste roda — não violaria uma antecedência
    # mínima de 3 dias em boa parte da semana) garante estar sempre dentro
    # da janela de 3 dias bloqueada por `min_advance_minutes` acima,
    # independente do dia em que a suíte é executada.
    starts_at = (datetime.now(TZ) + timedelta(days=1)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )

    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": _iso(starts_at),
        },
    )
    assert response.status_code == 400


def test_max_advance_days_enforced_on_appointment_creation(client):
    owner = _signup_owner(client, "owner8@config.com")
    token = owner["access_token"]
    headers = _auth_headers(token)
    client.patch("/api/settings/tenant", headers=headers, json={"max_advance_days": 1})

    customer = _create_customer(client, token)
    service = _create_service(client, token)
    employee = _create_employee(client, token, [service["id"]])
    starts_at = _next_weekday(0, 10)

    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": _iso(starts_at),
        },
    )
    assert response.status_code == 400


def test_allow_cancellation_false_blocks_cancel(client):
    owner = _signup_owner(client, "owner9@config.com")
    token = owner["access_token"]
    headers = _auth_headers(token)
    customer = _create_customer(client, token)
    service = _create_service(client, token)
    employee = _create_employee(client, token, [service["id"]])
    starts_at = _next_weekday(0, 10)
    appointment = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": _iso(starts_at),
        },
    ).json()

    client.patch("/api/settings/tenant", headers=headers, json={"allow_cancellation": False})

    response = client.post(
        f"/api/appointments/{appointment['id']}/cancel",
        headers=headers,
        json={"reason": "Teste"},
    )
    assert response.status_code == 400


def test_business_hours_break_blocks_appointment(client):
    owner = _signup_owner(client, "owner10@config.com")
    token = owner["access_token"]
    headers = _auth_headers(token)

    starts_at = _next_weekday(0, 10)
    weekday = starts_at.weekday()
    client.patch(
        f"/api/settings/business-hours/{weekday}",
        headers=headers,
        json={
            "is_open": True,
            "open_time": "09:00:00",
            "close_time": "19:00:00",
            "break_start_time": "12:00:00",
            "break_end_time": "13:00:00",
        },
    )

    customer = _create_customer(client, token)
    service = _create_service(client, token)
    employee = _create_employee(client, token, [service["id"]])

    lunch_time = starts_at.replace(hour=12, minute=15)
    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": _iso(lunch_time),
        },
    )
    assert response.status_code == 400

    outside_break = starts_at.replace(hour=14, minute=0)
    ok_response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": _iso(outside_break),
        },
    )
    assert ok_response.status_code == 201


def test_settings_are_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA@config.com")
    owner_b = _signup_owner(client, "donoB@config.com")

    client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(owner_a["access_token"]),
        json={"name": "Barbearia A Renomeada", "min_advance_minutes": 999},
    )

    body_b = client.get(
        "/api/settings/tenant", headers=_auth_headers(owner_b["access_token"])
    ).json()
    assert body_b["name"] != "Barbearia A Renomeada"


def test_manage_tenant_photos(client):
    owner = _signup_owner(client, "fotos@config.com")
    headers = _auth_headers(owner["access_token"])

    created = client.post(
        "/api/settings/photos", headers=headers, json={"url": "https://cdn.example.com/1.jpg"}
    )
    assert created.status_code == 201
    photo_id = created.json()["id"]

    listed = client.get("/api/settings/photos", headers=headers)
    assert listed.status_code == 200
    assert any(p["id"] == photo_id for p in listed.json())

    deleted = client.delete(f"/api/settings/photos/{photo_id}", headers=headers)
    assert deleted.status_code == 204

    listed_after = client.get("/api/settings/photos", headers=headers)
    assert listed_after.json() == []


def test_tenant_photos_are_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "fotosA@config.com")
    owner_b = _signup_owner(client, "fotosB@config.com")

    client.post(
        "/api/settings/photos",
        headers=_auth_headers(owner_a["access_token"]),
        json={"url": "https://cdn.example.com/a.jpg"},
    )

    listed_b = client.get("/api/settings/photos", headers=_auth_headers(owner_b["access_token"]))
    assert listed_b.json() == []
