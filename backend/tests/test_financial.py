from datetime import date, timedelta


def _signup_owner(client, email="dono@financeiro.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Financeiro",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    )
    return response.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _get_payment_method_id(client, token, code="dinheiro"):
    methods = client.get("/api/financial/payment-methods", headers=_auth_headers(token)).json()
    return next(m["id"] for m in methods if m["code"] == code)


def _create_transaction(client, token, **overrides):
    payment_method_id = overrides.pop("payment_method_id", None) or _get_payment_method_id(
        client, token
    )
    payload = {
        "type": "INCOME",
        "category": "Serviço",
        "description": "Corte avulso",
        "amount": "50.00",
        "transaction_date": date.today().isoformat(),
        "payment_method_id": payment_method_id,
    }
    payload.update(overrides)
    return client.post("/api/financial/transactions", headers=_auth_headers(token), json=payload)


def test_default_payment_methods_seeded_on_signup(client):
    owner = _signup_owner(client, "owner1@financeiro.com")
    methods = client.get(
        "/api/financial/payment-methods", headers=_auth_headers(owner["access_token"])
    ).json()
    codes = {m["code"] for m in methods}
    assert codes == {"dinheiro", "pix", "debito", "credito", "outros"}
    assert all(m["is_active"] for m in methods)


def test_toggle_payment_method_active(client):
    owner = _signup_owner(client, "owner2@financeiro.com")
    token = owner["access_token"]
    method_id = _get_payment_method_id(client, token, "credito")

    response = client.patch(
        f"/api/financial/payment-methods/{method_id}",
        headers=_auth_headers(token),
        json={"is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_create_income_transaction_succeeds(client):
    owner = _signup_owner(client, "owner3@financeiro.com")
    response = _create_transaction(client, owner["access_token"])
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "INCOME"
    assert body["amount"] == "50.00"
    assert body["is_voided"] is False


def test_create_expense_transaction_succeeds(client):
    owner = _signup_owner(client, "owner4@financeiro.com")
    response = _create_transaction(
        client,
        owner["access_token"],
        type="EXPENSE",
        category="Aluguel",
        description="Aluguel do mês",
        amount="1200.00",
    )
    assert response.status_code == 201
    assert response.json()["type"] == "EXPENSE"


def test_create_transaction_with_inactive_payment_method_fails(client):
    owner = _signup_owner(client, "owner5@financeiro.com")
    token = owner["access_token"]
    method_id = _get_payment_method_id(client, token, "outros")
    client.patch(
        f"/api/financial/payment-methods/{method_id}",
        headers=_auth_headers(token),
        json={"is_active": False},
    )

    response = _create_transaction(client, token, payment_method_id=method_id)
    assert response.status_code == 400


def test_void_transaction_creates_reversal_and_marks_original(client):
    owner = _signup_owner(client, "owner6@financeiro.com")
    token = owner["access_token"]
    original = _create_transaction(client, token).json()

    reversal = client.post(
        f"/api/financial/transactions/{original['id']}/void",
        headers=_auth_headers(token),
        json={"reason": "Lançamento duplicado por engano"},
    )
    assert reversal.status_code == 200
    body = reversal.json()
    assert body["type"] == "EXPENSE"
    assert body["amount"] == original["amount"]
    assert body["reversal_of_id"] == original["id"]

    original_after = client.get(
        f"/api/financial/transactions/{original['id']}", headers=_auth_headers(token)
    ).json()
    assert original_after["is_voided"] is True


def test_cannot_void_already_voided_transaction(client):
    owner = _signup_owner(client, "owner7@financeiro.com")
    token = owner["access_token"]
    original = _create_transaction(client, token).json()
    client.post(
        f"/api/financial/transactions/{original['id']}/void",
        headers=_auth_headers(token),
        json={"reason": "Primeiro estorno"},
    )

    second = client.post(
        f"/api/financial/transactions/{original['id']}/void",
        headers=_auth_headers(token),
        json={"reason": "Segundo estorno"},
    )
    assert second.status_code == 400


def test_cannot_void_a_reversal(client):
    owner = _signup_owner(client, "owner8@financeiro.com")
    token = owner["access_token"]
    original = _create_transaction(client, token).json()
    reversal = client.post(
        f"/api/financial/transactions/{original['id']}/void",
        headers=_auth_headers(token),
        json={"reason": "Estorno"},
    ).json()

    response = client.post(
        f"/api/financial/transactions/{reversal['id']}/void",
        headers=_auth_headers(token),
        json={"reason": "Estorno do estorno"},
    )
    assert response.status_code == 400


def test_list_transactions_filter_by_type(client):
    owner = _signup_owner(client, "owner9@financeiro.com")
    token = owner["access_token"]
    _create_transaction(client, token, type="INCOME", description="Entrada 1")
    _create_transaction(
        client,
        token,
        type="EXPENSE",
        category="Energia",
        description="Conta de luz",
        amount="300.00",
    )

    response = client.get(
        "/api/financial/transactions", headers=_auth_headers(token), params={"type": "EXPENSE"}
    )
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["category"] == "Energia"


def test_summary_totals(client):
    owner = _signup_owner(client, "owner10@financeiro.com")
    token = owner["access_token"]
    _create_transaction(client, token, type="INCOME", amount="100.00")
    _create_transaction(client, token, type="EXPENSE", category="Água", amount="40.00")

    today = date.today()
    response = client.get(
        "/api/financial/summary",
        headers=_auth_headers(token),
        params={
            "date_from": (today - timedelta(days=1)).isoformat(),
            "date_to": (today + timedelta(days=1)).isoformat(),
        },
    )
    body = response.json()
    assert body["total_income"] == "100.00"
    assert body["total_expense"] == "40.00"
    assert body["balance"] == "60.00"
    assert body["transaction_count"] == 2


def test_summary_is_neutral_after_voiding_a_transaction(client):
    """Estornar uma despesa não pode inflar o saldo: a original (excluída
    do saldo por estar 'voided') e o estorno devem se anular na soma."""
    owner = _signup_owner(client, "owner13@financeiro.com")
    token = owner["access_token"]
    headers = _auth_headers(token)
    _create_transaction(client, token, type="INCOME", amount="100.00")
    expense = _create_transaction(
        client, token, type="EXPENSE", category="Aluguel", amount="1500.00"
    ).json()

    today = date.today()
    params = {
        "date_from": (today - timedelta(days=1)).isoformat(),
        "date_to": (today + timedelta(days=1)).isoformat(),
    }
    before = client.get("/api/financial/summary", headers=headers, params=params).json()
    assert before["balance"] == "-1400.00"

    client.post(
        f"/api/financial/transactions/{expense['id']}/void",
        headers=headers,
        json={"reason": "Lançamento duplicado por engano"},
    )

    after = client.get("/api/financial/summary", headers=headers, params=params).json()
    assert after["balance"] == "100.00"
    assert after["total_expense"] == "1500.00"
    assert after["total_income"] == "1600.00"


def test_receptionist_can_create_but_not_void(client):
    owner = _signup_owner(client, "owner11@financeiro.com")
    token = owner["access_token"]
    client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Recepcao",
            "email": "recepcao11@financeiro.com",
            "password": "Senha@123",
            "role_code": "RECEPTIONIST",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "recepcao11@financeiro.com", "password": "Senha@123"}
    )
    receptionist_token = login.json()["access_token"]

    created = _create_transaction(client, receptionist_token)
    assert created.status_code == 201

    void_attempt = client.post(
        f"/api/financial/transactions/{created.json()['id']}/void",
        headers=_auth_headers(receptionist_token),
        json={"reason": "tentativa"},
    )
    assert void_attempt.status_code == 403


def test_barber_cannot_access_financial(client):
    owner = _signup_owner(client, "owner12@financeiro.com")
    token = owner["access_token"]
    client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro12@financeiro.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro12@financeiro.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    response = client.get("/api/financial/transactions", headers=_auth_headers(barber_token))
    assert response.status_code == 403


def test_financial_data_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA@financeiro.com")
    owner_b = _signup_owner(client, "donoB@financeiro.com")

    transaction_a = _create_transaction(client, owner_a["access_token"]).json()

    list_b = client.get(
        "/api/financial/transactions", headers=_auth_headers(owner_b["access_token"])
    )
    assert list_b.json()["total"] == 0

    get_from_b = client.get(
        f"/api/financial/transactions/{transaction_a['id']}",
        headers=_auth_headers(owner_b["access_token"]),
    )
    assert get_from_b.status_code == 404

    void_from_b = client.post(
        f"/api/financial/transactions/{transaction_a['id']}/void",
        headers=_auth_headers(owner_b["access_token"]),
        json={"reason": "tentativa indevida"},
    )
    assert void_from_b.status_code == 404
