def _signup_owner(client, email="dono@clientes.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Clientes",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    )
    return response.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _create_customer(client, token, **overrides):
    payload = {
        "full_name": "João Silva",
        "phone": "(11) 91234-5678",
        "email": "joao@cliente.com",
    }
    payload.update(overrides)
    return client.post("/api/customers", headers=_auth_headers(token), json=payload)


def test_create_customer_succeeds(client):
    owner = _signup_owner(client, "owner1@clientes.com")
    response = _create_customer(client, owner["access_token"])
    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "João Silva"
    assert body["phone"] == "11912345678"
    assert body["is_active"] is True


def test_create_customer_with_invalid_phone_fails(client):
    owner = _signup_owner(client, "owner2@clientes.com")
    response = _create_customer(client, owner["access_token"], phone="123")
    assert response.status_code == 422


def test_get_customer_returns_profile(client):
    owner = _signup_owner(client, "owner3@clientes.com")
    created = _create_customer(client, owner["access_token"]).json()
    response = client.get(
        f"/api/customers/{created['id']}", headers=_auth_headers(owner["access_token"])
    )
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_nonexistent_customer_returns_404(client):
    owner = _signup_owner(client, "owner4@clientes.com")
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/api/customers/{fake_id}", headers=_auth_headers(owner["access_token"]))
    assert response.status_code == 404


def test_update_customer_succeeds(client):
    owner = _signup_owner(client, "owner5@clientes.com")
    created = _create_customer(client, owner["access_token"]).json()
    response = client.patch(
        f"/api/customers/{created['id']}",
        headers=_auth_headers(owner["access_token"]),
        json={"notes": "Prefere corte degradê"},
    )
    assert response.status_code == 200
    assert response.json()["notes"] == "Prefere corte degradê"


def test_deactivate_and_reactivate_customer(client):
    owner = _signup_owner(client, "owner6@clientes.com")
    created = _create_customer(client, owner["access_token"]).json()

    deactivated = client.post(
        f"/api/customers/{created['id']}/deactivate", headers=_auth_headers(owner["access_token"])
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False

    reactivated = client.post(
        f"/api/customers/{created['id']}/reactivate", headers=_auth_headers(owner["access_token"])
    )
    assert reactivated.status_code == 200
    assert reactivated.json()["is_active"] is True


def test_search_customers_by_name(client):
    owner = _signup_owner(client, "owner7@clientes.com")
    _create_customer(client, owner["access_token"], full_name="Carlos Andrade", phone="11911112222")
    _create_customer(client, owner["access_token"], full_name="Marcos Pereira", phone="11933334444")

    response = client.get(
        "/api/customers", headers=_auth_headers(owner["access_token"]), params={"q": "Carlos"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["full_name"] == "Carlos Andrade"


def test_filter_customers_by_status(client):
    owner = _signup_owner(client, "owner8@clientes.com")
    active = _create_customer(client, owner["access_token"], phone="11955556666").json()
    _create_customer(client, owner["access_token"], phone="11977778888")
    client.post(
        f"/api/customers/{active['id']}/deactivate", headers=_auth_headers(owner["access_token"])
    )

    response = client.get(
        "/api/customers", headers=_auth_headers(owner["access_token"]), params={"is_active": "true"}
    )
    body = response.json()
    assert body["total"] == 1


def test_pagination_limits_results(client):
    owner = _signup_owner(client, "owner9@clientes.com")
    for i in range(5):
        _create_customer(
            client, owner["access_token"], phone=f"1190000{i:04d}", full_name=f"Cliente {i}"
        )

    response = client.get(
        "/api/customers",
        headers=_auth_headers(owner["access_token"]),
        params={"page": 1, "limit": 2},
    )
    body = response.json()
    assert len(body["items"]) == 2
    assert body["total"] == 5
    assert body["page"] == 1
    assert body["limit"] == 2


def test_barber_cannot_create_customer(client):
    owner = _signup_owner(client, "owner10@clientes.com")
    client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro10@clientes.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro10@clientes.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    response = _create_customer(client, barber_token)
    assert response.status_code == 403


def test_barber_can_view_customers(client):
    owner = _signup_owner(client, "owner11@clientes.com")
    _create_customer(client, owner["access_token"])
    client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro11@clientes.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro11@clientes.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    response = client.get("/api/customers", headers=_auth_headers(barber_token))
    assert response.status_code == 200


def test_customer_data_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA@clientes.com")
    owner_b = _signup_owner(client, "donoB@clientes.com")

    customer_a = _create_customer(client, owner_a["access_token"], full_name="Cliente A").json()

    list_b = client.get("/api/customers", headers=_auth_headers(owner_b["access_token"]))
    names_b = [c["full_name"] for c in list_b.json()["items"]]
    assert "Cliente A" not in names_b

    get_from_b = client.get(
        f"/api/customers/{customer_a['id']}", headers=_auth_headers(owner_b["access_token"])
    )
    assert get_from_b.status_code == 404

    edit_from_b = client.patch(
        f"/api/customers/{customer_a['id']}",
        headers=_auth_headers(owner_b["access_token"]),
        json={"notes": "tentativa indevida"},
    )
    assert edit_from_b.status_code == 404
