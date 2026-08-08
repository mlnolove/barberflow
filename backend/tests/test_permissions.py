def _signup_owner(client, email="dono@perm.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Permissoes",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    )
    return response.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_owner_can_list_employees(client):
    owner = _signup_owner(client, email="owner1@perm.com")
    response = client.get("/api/users", headers=_auth_headers(owner["access_token"]))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_owner_can_create_barber_employee(client):
    owner = _signup_owner(client, email="owner2@perm.com")
    response = client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro Novo",
            "email": "barbeiro2@perm.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["role"]["code"] == "BARBER"
    assert "finance.view" not in body["permissions"]
    assert "appointments.view" in body["permissions"]


def test_barber_cannot_access_employees_endpoint(client):
    owner = _signup_owner(client, email="owner3@perm.com")
    client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro X",
            "email": "barbeiro3@perm.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro3@perm.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    response = client.get("/api/users", headers=_auth_headers(barber_token))
    assert response.status_code == 403


def test_owner_can_grant_extra_permission_override_to_barber(client):
    owner = _signup_owner(client, email="owner4@perm.com")
    created = client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Barbeiro Override",
            "email": "barbeiro4@perm.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    ).json()

    response = client.put(
        f"/api/users/{created['id']}/permissions",
        headers=_auth_headers(owner["access_token"]),
        json={"permission_code": "inventory.view", "granted": True},
    )
    assert response.status_code == 200
    assert "inventory.view" in response.json()["permissions"]


def test_receptionist_cannot_edit_employees(client):
    owner = _signup_owner(client, email="owner5@perm.com")
    client.post(
        "/api/users",
        headers=_auth_headers(owner["access_token"]),
        json={
            "full_name": "Recepcao X",
            "email": "recepcao5@perm.com",
            "password": "Senha@123",
            "role_code": "RECEPTIONIST",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "recepcao5@perm.com", "password": "Senha@123"}
    )
    token = login.json()["access_token"]

    response = client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Outro",
            "email": "outro5@perm.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    assert response.status_code == 403
