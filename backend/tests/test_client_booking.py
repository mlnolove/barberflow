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


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Cliente",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    )
    return response.json()


def _signup_client_account(client, email):
    response = client.post(
        "/api/client/auth/signup",
        json={"full_name": "Cliente", "email": email, "password": "Senha@123"},
    )
    return response.json()


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


def _book(client, client_token, tenant_id, employee_id, service_id, starts_at, **overrides):
    payload = {
        "tenant_id": tenant_id,
        "employee_id": employee_id,
        "service_id": service_id,
        "starts_at": _iso(starts_at),
    }
    payload.update(overrides)
    return client.post(
        "/api/client/appointments", headers=_auth_headers(client_token), json=payload
    )


def test_client_booking_auto_confirms_by_default(client):
    owner = _signup_owner(client, "dono1@cliente.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    client_account = _signup_client_account(client, "cliente1@cliente.com")
    client_token = client_account["access_token"]

    starts_at = _next_weekday(0, 10)
    response = _book(client, client_token, tenant_id, employee["id"], service["id"], starts_at)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "CONFIRMED"
    assert body["barbershop"]["id"] == tenant_id
    # preço vem sempre do banco, nunca do payload do cliente
    assert body["price"] == "50.00"


def test_client_booking_ignores_client_supplied_price(client):
    owner = _signup_owner(client, "dono2@cliente.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)
    client_account = _signup_client_account(client, "cliente2@cliente.com")

    starts_at = _next_weekday(0, 10)
    response = _book(
        client,
        client_account["access_token"],
        tenant_id,
        employee["id"],
        service["id"],
        starts_at,
        price="1.00",
    )
    assert response.status_code == 201
    assert response.json()["price"] == "50.00"


def test_client_booking_stays_pending_when_auto_approve_disabled(client):
    owner = _signup_owner(client, "dono3@cliente.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(owner_token),
        json={"auto_approve_appointments": False},
    )

    client_account = _signup_client_account(client, "cliente3@cliente.com")
    starts_at = _next_weekday(0, 10)
    response = _book(
        client, client_account["access_token"], tenant_id, employee["id"], service["id"], starts_at
    )
    assert response.status_code == 201
    assert response.json()["status"] == "PENDING"


def test_client_can_list_and_cancel_own_appointment(client):
    owner = _signup_owner(client, "dono4@cliente.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)
    client_account = _signup_client_account(client, "cliente4@cliente.com")
    client_token = client_account["access_token"]

    starts_at = _next_weekday(0, 10)
    booked = _book(client, client_token, tenant_id, employee["id"], service["id"], starts_at).json()

    listed = client.get(
        "/api/client/appointments",
        headers=_auth_headers(client_token),
        params={"scope": "upcoming"},
    )
    assert listed.status_code == 200
    assert any(a["id"] == booked["id"] for a in listed.json())

    cancelled = client.post(
        f"/api/client/appointments/{booked['id']}/cancel",
        headers=_auth_headers(client_token),
        json={"reason": "Não vou conseguir comparecer."},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"


def test_client_cannot_access_another_clients_appointment(client):
    owner = _signup_owner(client, "dono5@cliente.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    client_a = _signup_client_account(client, "clienteA5@cliente.com")
    client_b = _signup_client_account(client, "clienteB5@cliente.com")

    starts_at = _next_weekday(0, 10)
    booked = _book(
        client, client_a["access_token"], tenant_id, employee["id"], service["id"], starts_at
    ).json()

    get_by_b = client.get(
        f"/api/client/appointments/{booked['id']}",
        headers=_auth_headers(client_b["access_token"]),
    )
    assert get_by_b.status_code == 404

    cancel_by_b = client.post(
        f"/api/client/appointments/{booked['id']}/cancel",
        headers=_auth_headers(client_b["access_token"]),
        json={"reason": "tentativa indevida"},
    )
    assert cancel_by_b.status_code == 404


def test_client_cannot_cancel_past_deadline(client):
    owner = _signup_owner(client, "dono6@cliente.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    # Prazo maior que qualquer intervalo possível entre "agora" e o próximo
    # horário útil escolhido pelo teste (até ~7 dias) — garante que o
    # cancelamento sempre estará fora do prazo, de forma determinística.
    client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(owner_token),
        json={"cancellation_deadline_minutes": 20000},
    )

    client_account = _signup_client_account(client, "cliente6@cliente.com")
    client_token = client_account["access_token"]
    starts_at = _next_weekday(0, 10)
    booked = _book(client, client_token, tenant_id, employee["id"], service["id"], starts_at).json()

    response = client.post(
        f"/api/client/appointments/{booked['id']}/cancel",
        headers=_auth_headers(client_token),
        json={"reason": "Vou chegar atrasado."},
    )
    assert response.status_code == 400


def test_client_booking_respects_same_conflict_rules_as_staff(client):
    owner = _signup_owner(client, "dono7@cliente.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    client_a = _signup_client_account(client, "clienteA7@cliente.com")
    client_b = _signup_client_account(client, "clienteB7@cliente.com")

    starts_at = _next_weekday(0, 10)
    first = _book(
        client, client_a["access_token"], tenant_id, employee["id"], service["id"], starts_at
    )
    assert first.status_code == 201

    overlapping = starts_at + timedelta(minutes=10)
    second = _book(
        client, client_b["access_token"], tenant_id, employee["id"], service["id"], overlapping
    )
    assert second.status_code == 409
