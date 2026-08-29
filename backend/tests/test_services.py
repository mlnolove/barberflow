def _signup_owner(client, email="dono@servicos.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Servicos",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    )
    return response.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _create_service(client, token, **overrides):
    payload = {
        "name": "Corte + Barba",
        "price": "70.00",
        "duration_minutes": 60,
        "category": "Combo",
    }
    payload.update(overrides)
    return client.post("/api/services", headers=_auth_headers(token), json=payload)


def test_create_service_succeeds(client):
    owner = _signup_owner(client, "owner1@servicos.com")
    response = _create_service(client, owner["access_token"])
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Corte + Barba"
    assert body["price"] == "70.00"
    assert body["is_active"] is True


def test_create_service_with_invalid_price_fails(client):
    owner = _signup_owner(client, "owner2@servicos.com")
    response = _create_service(client, owner["access_token"], price="-10.00")
    assert response.status_code == 422


def test_create_service_with_invalid_duration_fails(client):
    owner = _signup_owner(client, "owner3@servicos.com")
    response = _create_service(client, owner["access_token"], duration_minutes=0)
    assert response.status_code == 422


def test_update_service_price_and_duration(client):
    owner = _signup_owner(client, "owner4@servicos.com")
    created = _create_service(client, owner["access_token"]).json()
    response = client.patch(
        f"/api/services/{created['id']}",
        headers=_auth_headers(owner["access_token"]),
        json={"price": "80.00", "duration_minutes": 45},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["price"] == "80.00"
    assert body["duration_minutes"] == 45


def test_deactivate_and_reactivate_service(client):
    owner = _signup_owner(client, "owner5@servicos.com")
    created = _create_service(client, owner["access_token"]).json()

    deactivated = client.post(
        f"/api/services/{created['id']}/deactivate", headers=_auth_headers(owner["access_token"])
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False

    reactivated = client.post(
        f"/api/services/{created['id']}/reactivate", headers=_auth_headers(owner["access_token"])
    )
    assert reactivated.json()["is_active"] is True


def test_search_services_by_name(client):
    owner = _signup_owner(client, "owner6@servicos.com")
    _create_service(client, owner["access_token"], name="Degradê")
    _create_service(client, owner["access_token"], name="Barba")

    response = client.get(
        "/api/services", headers=_auth_headers(owner["access_token"]), params={"q": "Degrad"}
    )
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Degradê"


def test_barber_can_view_but_not_create_services(client):
    owner = _signup_owner(client, "owner7@servicos.com")
    client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro7@servicos.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro7@servicos.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    view_response = client.get("/api/services", headers=_auth_headers(barber_token))
    assert view_response.status_code == 200

    create_response = _create_service(client, barber_token)
    assert create_response.status_code == 403


def test_service_data_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA@servicos.com")
    owner_b = _signup_owner(client, "donoB@servicos.com")

    service_a = _create_service(client, owner_a["access_token"], name="Serviço A").json()

    list_b = client.get("/api/services", headers=_auth_headers(owner_b["access_token"]))
    names_b = [s["name"] for s in list_b.json()["items"]]
    assert "Serviço A" not in names_b

    get_from_b = client.get(
        f"/api/services/{service_a['id']}", headers=_auth_headers(owner_b["access_token"])
    )
    assert get_from_b.status_code == 404
