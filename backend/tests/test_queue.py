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
            "tenant_name": "Barbearia Fila",
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


def _setup_queue_tenant(client, owner_token):
    headers = _auth_headers(owner_token)
    client.patch("/api/settings/tenant", headers=headers, json={"scheduling_mode": "QUEUE"})
    # A fila usa "a barbearia está aberta agora" (não uma data futura como o
    # agendamento) — garante que hoje está aberto independente de em qual
    # dia da semana os testes rodarem (o seed padrão fecha aos domingos).
    today_weekday = datetime.now(TZ).weekday()
    client.patch(
        f"/api/settings/business-hours/{today_weekday}",
        headers=headers,
        json={"is_open": True, "open_time": "00:00:00", "close_time": "23:59:00"},
    )
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
    return service, employee


def test_clients_join_queue_and_get_increasing_positions(client):
    owner = _signup_owner(client, "dono1@queue.com")
    tenant_id = owner["tenant"]["id"]
    service, _ = _setup_queue_tenant(client, owner["access_token"])

    client_a = _signup_client_account(client, "clienteA1@queue.com")
    client_b = _signup_client_account(client, "clienteB1@queue.com")

    entry_a = client.post(
        "/api/client/queue",
        headers=_auth_headers(client_a["access_token"]),
        json={"tenant_id": tenant_id, "service_id": service["id"]},
    )
    assert entry_a.status_code == 201
    assert entry_a.json()["position"] == 1
    assert entry_a.json()["status"] == "WAITING"

    entry_b = client.post(
        "/api/client/queue",
        headers=_auth_headers(client_b["access_token"]),
        json={"tenant_id": tenant_id, "service_id": service["id"]},
    )
    assert entry_b.json()["position"] == 2


def test_staff_can_list_call_start_and_complete_queue(client):
    owner = _signup_owner(client, "dono2@queue.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, _ = _setup_queue_tenant(client, owner_token)
    client_account = _signup_client_account(client, "cliente2@queue.com")

    client.post(
        "/api/client/queue",
        headers=_auth_headers(client_account["access_token"]),
        json={"tenant_id": tenant_id, "service_id": service["id"]},
    )

    listed = client.get("/api/queue", headers=_auth_headers(owner_token))
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["status"] == "WAITING"

    called = client.post("/api/queue/call-next", headers=_auth_headers(owner_token))
    assert called.status_code == 200
    assert called.json()["status"] == "CALLED"
    entry_id = called.json()["id"]

    started = client.post(f"/api/queue/{entry_id}/start", headers=_auth_headers(owner_token))
    assert started.json()["status"] == "IN_SERVICE"

    completed = client.post(
        f"/api/queue/{entry_id}/complete",
        headers=_auth_headers(owner_token),
        json={"payment_method_code": "pix"},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"

    transactions = client.get(
        "/api/financial/transactions", headers=_auth_headers(owner_token)
    ).json()
    assert transactions["total"] == 1
    assert transactions["items"][0]["amount"] == "40.00"


def test_client_can_cancel_own_queue_entry(client):
    owner = _signup_owner(client, "dono3@queue.com")
    tenant_id = owner["tenant"]["id"]
    service, _ = _setup_queue_tenant(client, owner["access_token"])
    client_account = _signup_client_account(client, "cliente3@queue.com")
    client_token = client_account["access_token"]

    entry = client.post(
        "/api/client/queue",
        headers=_auth_headers(client_token),
        json={"tenant_id": tenant_id, "service_id": service["id"]},
    ).json()

    cancelled = client.post(
        f"/api/client/queue/{entry['id']}/cancel",
        headers=_auth_headers(client_token),
        json={"reason": "Não posso mais esperar."},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"


def test_next_client_position_drops_after_someone_leaves(client):
    owner = _signup_owner(client, "dono4@queue.com")
    tenant_id = owner["tenant"]["id"]
    service, _ = _setup_queue_tenant(client, owner["access_token"])
    client_a = _signup_client_account(client, "clienteA4@queue.com")
    client_b = _signup_client_account(client, "clienteB4@queue.com")

    entry_a = client.post(
        "/api/client/queue",
        headers=_auth_headers(client_a["access_token"]),
        json={"tenant_id": tenant_id, "service_id": service["id"]},
    ).json()
    entry_b = client.post(
        "/api/client/queue",
        headers=_auth_headers(client_b["access_token"]),
        json={"tenant_id": tenant_id, "service_id": service["id"]},
    ).json()
    assert entry_b["position"] == 2

    client.post(
        f"/api/client/queue/{entry_a['id']}/cancel",
        headers=_auth_headers(client_a["access_token"]),
        json={"reason": "Desisti."},
    )

    refreshed_b = client.get(
        f"/api/client/queue/{entry_b['id']}", headers=_auth_headers(client_b["access_token"])
    ).json()
    assert refreshed_b["position"] == 1


def test_booking_appointment_fails_when_tenant_is_in_queue_mode(client):
    owner = _signup_owner(client, "dono5@queue.com")
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_queue_tenant(client, owner["access_token"])
    client_account = _signup_client_account(client, "cliente5@queue.com")

    starts_at = _next_weekday(0, 10)
    response = client.post(
        "/api/client/appointments",
        headers=_auth_headers(client_account["access_token"]),
        json={
            "tenant_id": tenant_id,
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": starts_at.isoformat(),
        },
    )
    assert response.status_code == 400


def test_joining_queue_fails_when_tenant_is_in_time_slot_mode(client):
    owner = _signup_owner(client, "dono6@queue.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    headers = _auth_headers(owner_token)
    service = client.post(
        "/api/services",
        headers=headers,
        json={"name": "Corte", "price": "40.00", "duration_minutes": 30},
    ).json()
    client_account = _signup_client_account(client, "cliente6@queue.com")

    response = client.post(
        "/api/client/queue",
        headers=_auth_headers(client_account["access_token"]),
        json={"tenant_id": tenant_id, "service_id": service["id"]},
    )
    assert response.status_code == 400


def test_availability_is_empty_for_queue_mode_tenant(client):
    owner = _signup_owner(client, "dono7@queue.com")
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_queue_tenant(client, owner["access_token"])

    response = client.get(
        f"/api/client/barbershops/{tenant_id}/availability",
        params={
            "employee_id": employee["id"],
            "service_id": service["id"],
            "date": _next_weekday(0, 10).date().isoformat(),
        },
    )
    assert response.status_code == 200
    assert response.json()["slots"] == []


def test_staff_can_add_walk_in_customer_to_queue(client):
    owner = _signup_owner(client, "dono8@queue.com")
    owner_token = owner["access_token"]
    headers = _auth_headers(owner_token)
    service, _ = _setup_queue_tenant(client, owner_token)
    customer = client.post(
        "/api/customers",
        headers=headers,
        json={"full_name": "Cliente Balcão", "phone": "(11) 93333-3333"},
    ).json()

    response = client.post(
        "/api/queue",
        headers=headers,
        json={"customer_id": customer["id"], "service_id": service["id"]},
    )
    assert response.status_code == 201
    assert response.json()["customer"]["full_name"] == "Cliente Balcão"


def test_queue_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA9@queue.com")
    owner_b = _signup_owner(client, "donoB9@queue.com")
    tenant_a = owner_a["tenant"]["id"]
    service, _ = _setup_queue_tenant(client, owner_a["access_token"])
    client_account = _signup_client_account(client, "cliente9@queue.com")

    client.post(
        "/api/client/queue",
        headers=_auth_headers(client_account["access_token"]),
        json={"tenant_id": tenant_a, "service_id": service["id"]},
    )

    listed_b = client.get("/api/queue", headers=_auth_headers(owner_b["access_token"]))
    assert listed_b.json() == []
