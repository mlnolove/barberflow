from datetime import datetime, timedelta, timezone

TZ = timezone(timedelta(hours=-3))


def _next_weekday_date(target_weekday: int) -> str:
    now = datetime.now(TZ)
    days_ahead = (target_weekday - now.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return (now + timedelta(days=days_ahead)).date().isoformat()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Disponibilidade",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    ).json()


def _setup_bookable_tenant(client, owner_token, duration_minutes=60):
    headers = _auth_headers(owner_token)
    service = client.post(
        "/api/services",
        headers=headers,
        json={"name": "Corte", "price": "50.00", "duration_minutes": duration_minutes},
    ).json()
    employee = client.post(
        "/api/employees",
        headers=headers,
        json={"full_name": "Barbeiro", "phone": "(11) 92222-2222", "service_ids": [service["id"]]},
    ).json()
    return service, employee


def test_availability_lists_hourly_slots_within_business_hours(client):
    owner = _signup_owner(client, "dono1@disp.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    day = _next_weekday_date(0)  # segunda, aberto 09h-19h por padrão
    response = client.get(
        f"/api/client/barbershops/{tenant_id}/availability",
        params={"employee_id": employee["id"], "service_id": service["id"], "date": day},
    )
    assert response.status_code == 200
    slots = response.json()["slots"]
    starts = [s["starts_at"][11:16] for s in slots]
    assert "09:00" in starts
    assert "18:00" in starts
    assert "19:00" not in starts  # serviço de 60min não cabe depois das 19h


def test_availability_excludes_conflicting_slot(client):
    owner = _signup_owner(client, "dono2@disp.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    client_account = client.post(
        "/api/client/auth/signup",
        json={"full_name": "Cliente", "email": "cliente2@disp.com", "password": "Senha@123"},
    ).json()

    day = _next_weekday_date(0)
    starts_at = f"{day}T10:00:00-03:00"
    booked = client.post(
        "/api/client/appointments",
        headers=_auth_headers(client_account["access_token"]),
        json={
            "tenant_id": tenant_id,
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": starts_at,
        },
    )
    assert booked.status_code == 201

    response = client.get(
        f"/api/client/barbershops/{tenant_id}/availability",
        params={"employee_id": employee["id"], "service_id": service["id"], "date": day},
    )
    starts = [s["starts_at"][11:16] for s in response.json()["slots"]]
    assert "10:00" not in starts
    assert "09:00" in starts
    assert "11:00" in starts


def test_availability_on_closed_day_is_empty(client):
    owner = _signup_owner(client, "dono3@disp.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)

    day = _next_weekday_date(6)  # domingo, fechado por padrão
    response = client.get(
        f"/api/client/barbershops/{tenant_id}/availability",
        params={"employee_id": employee["id"], "service_id": service["id"], "date": day},
    )
    assert response.status_code == 200
    assert response.json()["slots"] == []


def test_availability_with_inactive_employee_fails(client):
    owner = _signup_owner(client, "dono4@disp.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    service, employee = _setup_bookable_tenant(client, owner_token)
    client.post(f"/api/employees/{employee['id']}/deactivate", headers=_auth_headers(owner_token))

    day = _next_weekday_date(0)
    response = client.get(
        f"/api/client/barbershops/{tenant_id}/availability",
        params={"employee_id": employee["id"], "service_id": service["id"], "date": day},
    )
    assert response.status_code == 400
