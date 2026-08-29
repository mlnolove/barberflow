from datetime import datetime, timedelta, timezone

TZ = timezone(timedelta(hours=-3))


def _next_weekday(target_weekday: int, hour: int, minute: int = 0) -> datetime:
    """Próxima ocorrência do dia da semana informado (0=segunda..6=domingo),
    sempre no futuro, para não depender de qual dia os testes rodam."""
    now = datetime.now(TZ)
    days_ahead = (target_weekday - now.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    target_date = (now + timedelta(days=days_ahead)).date()
    return datetime(target_date.year, target_date.month, target_date.day, hour, minute, tzinfo=TZ)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _signup_owner(client, email="dono@agenda.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Agenda",
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
    payload = {"full_name": "Cliente Teste", "phone": "(11) 91111-1111"}
    payload.update(overrides)
    return client.post("/api/customers", headers=_auth_headers(token), json=payload).json()


def _create_service(client, token, **overrides):
    payload = {"name": "Corte", "price": "40.00", "duration_minutes": 30}
    payload.update(overrides)
    return client.post("/api/services", headers=_auth_headers(token), json=payload).json()


def _create_employee(client, token, service_ids, **overrides):
    payload = {
        "full_name": "Barbeiro Teste",
        "phone": "(11) 92222-2222",
        "service_ids": service_ids,
    }
    payload.update(overrides)
    return client.post("/api/employees", headers=_auth_headers(token), json=payload).json()


def _setup_bookable(client, token, **employee_overrides):
    customer = _create_customer(client, token)
    service = _create_service(client, token)
    employee = _create_employee(client, token, [service["id"]], **employee_overrides)
    return customer, service, employee


def _create_appointment(client, token, customer, employee, service, starts_at, **overrides):
    payload = {
        "customer_id": customer["id"],
        "employee_id": employee["id"],
        "service_id": service["id"],
        "starts_at": _iso(starts_at),
    }
    payload.update(overrides)
    return client.post("/api/appointments", headers=_auth_headers(token), json=payload)


def test_create_appointment_succeeds(client):
    owner = _signup_owner(client, "owner1@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)

    starts_at = _next_weekday(0, 10)
    response = _create_appointment(client, token, customer, employee, service, starts_at)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "PENDING"
    assert body["customer"]["id"] == customer["id"]
    assert body["employee"]["id"] == employee["id"]
    assert body["service"]["id"] == service["id"]
    assert body["duration_minutes"] == 30
    assert body["price"] == "40.00"


def test_create_appointment_on_closed_day_fails(client):
    owner = _signup_owner(client, "owner2@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)

    starts_at = _next_weekday(6, 10)  # domingo, fechado por padrão
    response = _create_appointment(client, token, customer, employee, service, starts_at)
    assert response.status_code == 400


def test_create_appointment_outside_business_hours_fails(client):
    owner = _signup_owner(client, "owner3@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)

    starts_at = _next_weekday(0, 20)  # depois das 19h
    response = _create_appointment(client, token, customer, employee, service, starts_at)
    assert response.status_code == 400


def test_create_appointment_on_blocked_date_fails(client):
    owner = _signup_owner(client, "owner4@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)

    starts_at = _next_weekday(0, 10)
    client.post(
        "/api/settings/blocked-dates",
        headers=_auth_headers(token),
        json={"date": starts_at.date().isoformat(), "reason": "Feriado"},
    )

    response = _create_appointment(client, token, customer, employee, service, starts_at)
    assert response.status_code == 400


def test_create_appointment_with_employee_not_offering_service_fails(client):
    owner = _signup_owner(client, "owner5@agenda.com")
    token = owner["access_token"]
    customer = _create_customer(client, token)
    service = _create_service(client, token)
    other_service = _create_service(client, token, name="Barba")
    employee = _create_employee(client, token, [other_service["id"]])

    starts_at = _next_weekday(0, 10)
    response = _create_appointment(client, token, customer, employee, service, starts_at)
    assert response.status_code == 400


def test_create_appointment_with_inactive_employee_fails(client):
    owner = _signup_owner(client, "owner6@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    client.post(f"/api/employees/{employee['id']}/deactivate", headers=_auth_headers(token))

    starts_at = _next_weekday(0, 10)
    response = _create_appointment(client, token, customer, employee, service, starts_at)
    assert response.status_code == 400


def test_create_appointment_conflict_same_employee_fails(client):
    """Teste obrigatório (seção 37): impedir conflito de horário, mesmo para o OWNER."""
    owner = _signup_owner(client, "owner7@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)

    starts_at = _next_weekday(0, 10)
    first = _create_appointment(client, token, customer, employee, service, starts_at)
    assert first.status_code == 201

    second_customer = _create_customer(client, token, phone="(11) 93333-3333")
    overlapping = starts_at + timedelta(minutes=10)
    second = _create_appointment(client, token, second_customer, employee, service, overlapping)
    assert second.status_code == 409


def test_create_appointment_outside_employee_work_hours_fails(client):
    owner = _signup_owner(client, "owner8@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(
        client,
        token,
        work_start_time="14:00:00",
        work_end_time="18:00:00",
        work_days=[0, 1, 2, 3, 4],
    )

    starts_at = _next_weekday(0, 10)  # barbearia abre 09h, mas profissional só a partir das 14h
    response = _create_appointment(client, token, customer, employee, service, starts_at)
    assert response.status_code == 400


def test_reschedule_appointment_succeeds(client):
    owner = _signup_owner(client, "owner9@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)

    starts_at = _next_weekday(0, 10)
    created = _create_appointment(client, token, customer, employee, service, starts_at).json()

    new_starts_at = _next_weekday(1, 11)
    response = client.patch(
        f"/api/appointments/{created['id']}/reschedule",
        headers=_auth_headers(token),
        json={"starts_at": _iso(new_starts_at)},
    )
    assert response.status_code == 200
    assert response.json()["starts_at"] == _iso(new_starts_at)


def test_reschedule_to_conflicting_slot_fails(client):
    owner = _signup_owner(client, "owner10@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)

    first_start = _next_weekday(0, 10)
    _create_appointment(client, token, customer, employee, service, first_start)

    second_customer = _create_customer(client, token, phone="(11) 94444-4444")
    second_start = _next_weekday(1, 10)
    second = _create_appointment(
        client, token, second_customer, employee, service, second_start
    ).json()

    response = client.patch(
        f"/api/appointments/{second['id']}/reschedule",
        headers=_auth_headers(token),
        json={"starts_at": _iso(first_start)},
    )
    assert response.status_code == 409


def test_full_status_flow_confirm_start_complete(client):
    owner = _signup_owner(client, "owner11@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()
    headers = _auth_headers(token)

    confirmed = client.post(f"/api/appointments/{appointment['id']}/confirm", headers=headers)
    assert confirmed.json()["status"] == "CONFIRMED"

    started = client.post(f"/api/appointments/{appointment['id']}/start", headers=headers)
    assert started.json()["status"] == "IN_PROGRESS"

    completed = client.post(
        f"/api/appointments/{appointment['id']}/complete",
        headers=headers,
        json={"payment_method_code": "pix"},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"
    assert completed.json()["payment_method"] == "pix"


def test_cannot_complete_pending_appointment_directly(client):
    owner = _signup_owner(client, "owner12@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()

    response = client.post(
        f"/api/appointments/{appointment['id']}/complete",
        headers=_auth_headers(token),
        json={"payment_method_code": "pix"},
    )
    assert response.status_code == 400


def test_cancel_requires_reason(client):
    owner = _signup_owner(client, "owner13@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()

    response = client.post(
        f"/api/appointments/{appointment['id']}/cancel",
        headers=_auth_headers(token),
        json={"reason": ""},
    )
    assert response.status_code == 422


def test_cancel_appointment_succeeds_and_frees_slot(client):
    owner = _signup_owner(client, "owner14@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()

    cancelled = client.post(
        f"/api/appointments/{appointment['id']}/cancel",
        headers=_auth_headers(token),
        json={"reason": "Cliente solicitou cancelamento."},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"

    # horário liberado: novo agendamento no mesmo slot deve funcionar
    other_customer = _create_customer(client, token, phone="(11) 95555-5555")
    retry = _create_appointment(client, token, other_customer, employee, service, starts_at)
    assert retry.status_code == 201


def test_mark_no_show_succeeds(client):
    owner = _signup_owner(client, "owner15@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()

    response = client.post(
        f"/api/appointments/{appointment['id']}/no-show", headers=_auth_headers(token)
    )
    assert response.status_code == 200
    assert response.json()["status"] == "NO_SHOW"


def test_list_appointments_by_range(client):
    owner = _signup_owner(client, "owner16@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    _create_appointment(client, token, customer, employee, service, starts_at)

    range_start = starts_at - timedelta(hours=1)
    range_end = starts_at + timedelta(hours=1)
    response = client.get(
        "/api/appointments",
        headers=_auth_headers(token),
        params={"start": _iso(range_start), "end": _iso(range_end)},
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_barber_can_start_and_complete_but_not_create(client):
    owner = _signup_owner(client, "owner17@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()
    client.post(f"/api/appointments/{appointment['id']}/confirm", headers=_auth_headers(token))

    barber_user = client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Barbeiro Login",
            "email": "barbeirologin17@agenda.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    ).json()
    login = client.post(
        "/api/auth/login",
        json={"email": "barbeirologin17@agenda.com", "password": "Senha@123"},
    )
    barber_token = login.json()["access_token"]

    started = client.post(
        f"/api/appointments/{appointment['id']}/start", headers=_auth_headers(barber_token)
    )
    assert started.status_code == 200

    create_attempt = _create_appointment(
        client, barber_token, customer, employee, service, _next_weekday(1, 10)
    )
    assert create_attempt.status_code == 403
    assert barber_user["role"]["code"] == "BARBER"


def test_receptionist_can_create_and_cancel_but_not_start(client):
    owner = _signup_owner(client, "owner18@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)

    client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Recepcao",
            "email": "recepcao18@agenda.com",
            "password": "Senha@123",
            "role_code": "RECEPTIONIST",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "recepcao18@agenda.com", "password": "Senha@123"}
    )
    receptionist_token = login.json()["access_token"]

    starts_at = _next_weekday(0, 10)
    created = _create_appointment(
        client, receptionist_token, customer, employee, service, starts_at
    )
    assert created.status_code == 201

    start_attempt = client.post(
        f"/api/appointments/{created.json()['id']}/start", headers=_auth_headers(receptionist_token)
    )
    assert start_attempt.status_code == 403

    cancel_attempt = client.post(
        f"/api/appointments/{created.json()['id']}/cancel",
        headers=_auth_headers(receptionist_token),
        json={"reason": "Remarcação solicitada pelo cliente."},
    )
    assert cancel_attempt.status_code == 200


def test_appointments_are_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA@agenda.com")
    owner_b = _signup_owner(client, "donoB@agenda.com")
    token_a = owner_a["access_token"]
    token_b = owner_b["access_token"]

    customer, service, employee = _setup_bookable(client, token_a)
    starts_at = _next_weekday(0, 10)
    appointment_a = _create_appointment(
        client, token_a, customer, employee, service, starts_at
    ).json()

    range_start = starts_at - timedelta(hours=1)
    range_end = starts_at + timedelta(hours=1)
    list_b = client.get(
        "/api/appointments",
        headers=_auth_headers(token_b),
        params={"start": _iso(range_start), "end": _iso(range_end)},
    )
    assert list_b.json() == []

    get_from_b = client.get(
        f"/api/appointments/{appointment_a['id']}", headers=_auth_headers(token_b)
    )
    assert get_from_b.status_code == 404

    cancel_from_b = client.post(
        f"/api/appointments/{appointment_a['id']}/cancel",
        headers=_auth_headers(token_b),
        json={"reason": "tentativa indevida"},
    )
    assert cancel_from_b.status_code == 404


def test_completing_appointment_creates_financial_transaction(client):
    """Fechamento de atendimento (seção 20): finalizar gera automaticamente
    uma entrada financeira vinculada ao agendamento."""
    owner = _signup_owner(client, "owner19@agenda.com")
    token = owner["access_token"]
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()
    headers = _auth_headers(token)

    client.post(f"/api/appointments/{appointment['id']}/confirm", headers=headers)
    client.post(f"/api/appointments/{appointment['id']}/start", headers=headers)
    client.post(
        f"/api/appointments/{appointment['id']}/complete",
        headers=headers,
        json={"payment_method_code": "dinheiro"},
    )

    transactions = client.get("/api/financial/transactions", headers=headers).json()
    assert transactions["total"] == 1
    transaction = transactions["items"][0]
    assert transaction["type"] == "INCOME"
    assert transaction["category"] == "Serviço"
    assert transaction["amount"] == "40.00"
    assert transaction["appointment_id"] == appointment["id"]


def test_completing_appointment_with_product_sale_updates_stock_and_finance(client):
    owner = _signup_owner(client, "owner20@agenda.com")
    token = owner["access_token"]
    headers = _auth_headers(token)
    customer, service, employee = _setup_bookable(client, token)

    product = client.post(
        "/api/inventory/products",
        headers=headers,
        json={"name": "Pomada", "sale_price": "30.00", "initial_quantity": 10},
    ).json()

    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()
    client.post(f"/api/appointments/{appointment['id']}/confirm", headers=headers)
    client.post(f"/api/appointments/{appointment['id']}/start", headers=headers)

    completed = client.post(
        f"/api/appointments/{appointment['id']}/complete",
        headers=headers,
        json={
            "payment_method_code": "pix",
            "products_sold": [{"product_id": product["id"], "quantity": 2}],
        },
    )
    assert completed.status_code == 200

    updated_product = client.get(f"/api/inventory/products/{product['id']}", headers=headers).json()
    assert updated_product["current_quantity"] == 8

    movements = client.get(
        f"/api/inventory/products/{product['id']}/movements", headers=headers
    ).json()
    sale_movement = next(m for m in movements["items"] if m["type"] == "SALE")
    assert sale_movement["quantity_change"] == -2

    transactions = client.get("/api/financial/transactions", headers=headers).json()
    assert transactions["total"] == 2
    categories = {t["category"] for t in transactions["items"]}
    assert categories == {"Serviço", "Produto"}
    product_transaction = next(t for t in transactions["items"] if t["category"] == "Produto")
    assert product_transaction["amount"] == "60.00"


def test_completing_appointment_with_invalid_payment_method_fails(client):
    owner = _signup_owner(client, "owner21@agenda.com")
    token = owner["access_token"]
    headers = _auth_headers(token)
    customer, service, employee = _setup_bookable(client, token)
    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()
    client.post(f"/api/appointments/{appointment['id']}/confirm", headers=headers)
    client.post(f"/api/appointments/{appointment['id']}/start", headers=headers)

    response = client.post(
        f"/api/appointments/{appointment['id']}/complete",
        headers=headers,
        json={"payment_method_code": "boleto-inexistente"},
    )
    assert response.status_code == 404


def test_completing_appointment_with_inactive_payment_method_fails(client):
    owner = _signup_owner(client, "owner22@agenda.com")
    token = owner["access_token"]
    headers = _auth_headers(token)
    customer, service, employee = _setup_bookable(client, token)

    methods = client.get("/api/financial/payment-methods", headers=headers).json()
    credito_id = next(m["id"] for m in methods if m["code"] == "credito")
    client.patch(
        f"/api/financial/payment-methods/{credito_id}", headers=headers, json={"is_active": False}
    )

    starts_at = _next_weekday(0, 10)
    appointment = _create_appointment(client, token, customer, employee, service, starts_at).json()
    client.post(f"/api/appointments/{appointment['id']}/confirm", headers=headers)
    client.post(f"/api/appointments/{appointment['id']}/start", headers=headers)

    response = client.post(
        f"/api/appointments/{appointment['id']}/complete",
        headers=headers,
        json={"payment_method_code": "credito"},
    )
    assert response.status_code == 400
