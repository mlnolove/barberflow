def _signup_owner(client, email="dono@prof.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Profissionais",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    )
    return response.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _create_service(client, token, name="Corte"):
    return client.post(
        "/api/services",
        headers=_auth_headers(token),
        json={"name": name, "price": "40.00", "duration_minutes": 30},
    ).json()


def _create_employee(client, token, **overrides):
    payload = {
        "full_name": "Carlos Barbeiro",
        "phone": "(11) 91111-2222",
        "specialties": ["Degradê", "Barba"],
        "commission_percentage": "30.00",
        "work_start_time": "09:00:00",
        "work_end_time": "18:00:00",
        "work_days": [0, 1, 2, 3, 4],
    }
    payload.update(overrides)
    return client.post("/api/employees", headers=_auth_headers(token), json=payload)


def test_create_employee_succeeds(client):
    owner = _signup_owner(client, "owner1@prof.com")
    response = _create_employee(client, owner["access_token"])
    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "Carlos Barbeiro"
    assert body["phone"] == "11911112222"
    assert body["specialties"] == ["Degradê", "Barba"]
    assert body["services"] == []


def test_create_employee_with_services_links_them(client):
    owner = _signup_owner(client, "owner2@prof.com")
    service = _create_service(client, owner["access_token"])

    response = _create_employee(client, owner["access_token"], service_ids=[service["id"]])
    assert response.status_code == 201
    services = response.json()["services"]
    assert len(services) == 1
    assert services[0]["id"] == service["id"]


def test_create_employee_with_nonexistent_service_fails(client):
    owner = _signup_owner(client, "owner3@prof.com")
    fake_service_id = "00000000-0000-0000-0000-000000000000"
    response = _create_employee(client, owner["access_token"], service_ids=[fake_service_id])
    assert response.status_code == 404


def test_create_employee_with_invalid_work_period_fails(client):
    owner = _signup_owner(client, "owner4@prof.com")
    response = _create_employee(
        client, owner["access_token"], work_start_time="18:00:00", work_end_time="09:00:00"
    )
    assert response.status_code == 422


def test_create_employee_with_invalid_commission_fails(client):
    owner = _signup_owner(client, "owner5@prof.com")
    response = _create_employee(client, owner["access_token"], commission_percentage="150.00")
    assert response.status_code == 422


def test_update_employee_replaces_services(client):
    owner = _signup_owner(client, "owner6@prof.com")
    service_a = _create_service(client, owner["access_token"], name="Corte")
    service_b = _create_service(client, owner["access_token"], name="Barba")
    created = _create_employee(client, owner["access_token"], service_ids=[service_a["id"]]).json()

    response = client.patch(
        f"/api/employees/{created['id']}",
        headers=_auth_headers(owner["access_token"]),
        json={"service_ids": [service_b["id"]]},
    )
    assert response.status_code == 200
    services = response.json()["services"]
    assert len(services) == 1
    assert services[0]["id"] == service_b["id"]


def test_link_employee_to_user_account(client):
    owner = _signup_owner(client, "owner7@prof.com")
    user = client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro Logado",
            "email": "barbeiro7@prof.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    ).json()

    response = _create_employee(client, owner["access_token"], user_id=user["id"])
    assert response.status_code == 201
    assert response.json()["user_id"] == user["id"]


def test_link_employee_to_already_linked_user_fails(client):
    owner = _signup_owner(client, "owner8@prof.com")
    user = client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro Duplicado",
            "email": "barbeiro8@prof.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    ).json()

    first = _create_employee(
        client, owner["access_token"], user_id=user["id"], full_name="Primeiro"
    )
    assert first.status_code == 201

    second = _create_employee(
        client, owner["access_token"], user_id=user["id"], full_name="Segundo"
    )
    assert second.status_code == 409


def test_deactivate_and_reactivate_employee(client):
    owner = _signup_owner(client, "owner9@prof.com")
    created = _create_employee(client, owner["access_token"]).json()

    deactivated = client.post(
        f"/api/employees/{created['id']}/deactivate", headers=_auth_headers(owner["access_token"])
    )
    assert deactivated.json()["is_active"] is False

    reactivated = client.post(
        f"/api/employees/{created['id']}/reactivate", headers=_auth_headers(owner["access_token"])
    )
    assert reactivated.json()["is_active"] is True


def test_barber_cannot_create_employee(client):
    owner = _signup_owner(client, "owner10@prof.com")
    client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro10@prof.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro10@prof.com", "password": "Senha@123"}
    )
    response = _create_employee(client, login.json()["access_token"])
    assert response.status_code == 403


def test_employee_data_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA@prof.com")
    owner_b = _signup_owner(client, "donoB@prof.com")

    employee_a = _create_employee(
        client, owner_a["access_token"], full_name="Profissional A"
    ).json()

    list_b = client.get("/api/employees", headers=_auth_headers(owner_b["access_token"]))
    names_b = [e["full_name"] for e in list_b.json()["items"]]
    assert "Profissional A" not in names_b

    get_from_b = client.get(
        f"/api/employees/{employee_a['id']}", headers=_auth_headers(owner_b["access_token"])
    )
    assert get_from_b.status_code == 404


def test_cannot_link_employee_to_user_of_another_tenant(client):
    owner_a = _signup_owner(client, "donoC@prof.com")
    owner_b = _signup_owner(client, "donoD@prof.com")

    user_b = client.post(
        "/api/users",
        headers=_auth_headers(owner_b["access_token"]),
        json={
            "full_name": "Usuario Tenant B",
            "email": "userb@prof.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    ).json()

    response = _create_employee(client, owner_a["access_token"], user_id=user_b["id"])
    assert response.status_code == 404
