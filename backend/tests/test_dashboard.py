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


def _signup_owner(client, email="dono@dashboard.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Dashboard",
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
    payload = {"full_name": "Cliente Dashboard", "phone": "(11) 91111-1111"}
    payload.update(overrides)
    return client.post("/api/customers", headers=_auth_headers(token), json=payload).json()


def _create_service(client, token, **overrides):
    payload = {"name": "Corte", "price": "50.00", "duration_minutes": 30}
    payload.update(overrides)
    return client.post("/api/services", headers=_auth_headers(token), json=payload).json()


def _create_employee(client, token, service_ids, **overrides):
    payload = {
        "full_name": "Barbeiro Dashboard",
        "phone": "(11) 92222-2222",
        "service_ids": service_ids,
    }
    payload.update(overrides)
    return client.post("/api/employees", headers=_auth_headers(token), json=payload).json()


def _complete_full_appointment(client, token):
    customer = _create_customer(client, token)
    service = _create_service(client, token)
    employee = _create_employee(client, token, [service["id"]])
    starts_at = _next_weekday(0, 10)
    appointment = client.post(
        "/api/appointments",
        headers=_auth_headers(token),
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": _iso(starts_at),
        },
    ).json()
    headers = _auth_headers(token)
    client.post(f"/api/appointments/{appointment['id']}/confirm", headers=headers)
    client.post(f"/api/appointments/{appointment['id']}/start", headers=headers)
    client.post(
        f"/api/appointments/{appointment['id']}/complete",
        headers=headers,
        json={"payment_method_code": "pix"},
    )
    return appointment, service, employee, customer


def test_dashboard_returns_empty_summary_for_new_tenant(client):
    owner = _signup_owner(client, "owner1@dashboard.com")
    response = client.get("/api/dashboard", headers=_auth_headers(owner["access_token"]))
    assert response.status_code == 200
    body = response.json()
    assert body["kpis"]["revenue_today"] == "0"
    assert body["kpis"]["total_customers"] == 0
    assert body["upcoming_appointments"] == []
    assert len(body["revenue_by_day"]) == 14
    assert len(body["revenue_by_month"]) == 6


def test_dashboard_reflects_completed_appointment(client):
    owner = _signup_owner(client, "owner2@dashboard.com")
    token = owner["access_token"]
    _complete_full_appointment(client, token)

    body = client.get("/api/dashboard", headers=_auth_headers(token)).json()
    assert body["kpis"]["revenue_today"] == "50.00"
    assert body["kpis"]["completed_appointments_month"] >= 1
    assert body["kpis"]["average_ticket"] == "50.00"
    assert body["kpis"]["total_customers"] == 1
    assert any(p["value"] == "50.00" for p in body["revenue_by_day"])
    assert any(s["label"] == "Corte" and s["value"] >= 1 for s in body["top_services"])
    assert any(p["label"] == "Barbeiro Dashboard" for p in body["top_professionals"])
    assert any(
        pm["label"] == "PIX" and pm["value"] == "50.00" for pm in body["payment_method_breakdown"]
    )


def test_dashboard_alerts_low_stock_and_pending(client):
    owner = _signup_owner(client, "owner3@dashboard.com")
    token = owner["access_token"]
    headers = _auth_headers(token)

    client.post(
        "/api/inventory/products",
        headers=headers,
        json={
            "name": "Produto Baixo",
            "sale_price": "10.00",
            "min_stock": 10,
            "initial_quantity": 2,
        },
    )

    customer = _create_customer(client, token)
    service = _create_service(client, token)
    employee = _create_employee(client, token, [service["id"]])
    starts_at = _next_weekday(0, 10)
    client.post(
        "/api/appointments",
        headers=headers,
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": _iso(starts_at),
        },
    )

    body = client.get("/api/dashboard", headers=headers).json()
    assert body["alerts"]["low_stock_products"] == 1
    assert body["alerts"]["pending_appointments"] == 1


def test_dashboard_upcoming_appointments_list(client):
    owner = _signup_owner(client, "owner4@dashboard.com")
    token = owner["access_token"]
    headers = _auth_headers(token)
    customer = _create_customer(client, token)
    service = _create_service(client, token)
    employee = _create_employee(client, token, [service["id"]])
    starts_at = _next_weekday(0, 10)
    client.post(
        "/api/appointments",
        headers=headers,
        json={
            "customer_id": customer["id"],
            "employee_id": employee["id"],
            "service_id": service["id"],
            "starts_at": _iso(starts_at),
        },
    )

    body = client.get("/api/dashboard", headers=headers).json()
    assert len(body["upcoming_appointments"]) == 1
    item = body["upcoming_appointments"][0]
    assert item["customer_name"] == "Cliente Dashboard"
    assert item["status"] == "PENDING"


def test_manager_can_access_dashboard(client):
    owner = _signup_owner(client, "owner5@dashboard.com")
    token = owner["access_token"]
    client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Gerente",
            "email": "gerente5@dashboard.com",
            "password": "Senha@123",
            "role_code": "MANAGER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "gerente5@dashboard.com", "password": "Senha@123"}
    )
    response = client.get("/api/dashboard", headers=_auth_headers(login.json()["access_token"]))
    assert response.status_code == 200


def test_barber_cannot_access_dashboard(client):
    owner = _signup_owner(client, "owner6@dashboard.com")
    token = owner["access_token"]
    client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro6@dashboard.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro6@dashboard.com", "password": "Senha@123"}
    )
    response = client.get("/api/dashboard", headers=_auth_headers(login.json()["access_token"]))
    assert response.status_code == 403


def test_dashboard_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA@dashboard.com")
    owner_b = _signup_owner(client, "donoB@dashboard.com")
    _complete_full_appointment(client, owner_a["access_token"])

    body_b = client.get("/api/dashboard", headers=_auth_headers(owner_b["access_token"])).json()
    assert body_b["kpis"]["revenue_today"] == "0"
    assert body_b["kpis"]["total_customers"] == 0
    assert body_b["upcoming_appointments"] == []
