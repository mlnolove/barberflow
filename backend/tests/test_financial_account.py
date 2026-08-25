def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Financeiro",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    ).json()


def test_owner_can_set_and_view_pix_account_masked(client):
    owner = _signup_owner(client, "dono1@finacc.com")
    headers = _auth_headers(owner["access_token"])

    created = client.put(
        "/api/financial-account",
        headers=headers,
        json={"account_type": "PIX", "holder_name": "Dono Teste", "pix_key": "12345678900"},
    )
    assert created.status_code == 200
    body = created.json()
    assert body["holder_name"] == "Dono Teste"
    assert "12345678900" not in body["masked_detail"]
    assert body["masked_detail"].endswith("8900")

    fetched = client.get("/api/financial-account", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["masked_detail"] == body["masked_detail"]


def test_bank_account_requires_bank_fields(client):
    owner = _signup_owner(client, "dono2@finacc.com")
    headers = _auth_headers(owner["access_token"])

    response = client.put(
        "/api/financial-account",
        headers=headers,
        json={"account_type": "BANK_ACCOUNT", "holder_name": "Dono Teste"},
    )
    assert response.status_code == 422


def test_manager_cannot_access_financial_account(client):
    owner = _signup_owner(client, "dono3@finacc.com")
    owner_token = owner["access_token"]

    client.post(
        "/api/users",
        headers=_auth_headers(owner_token),
        json={
            "full_name": "Gerente",
            "email": "gerente3@finacc.com",
            "password": "Senha@123",
            "role_code": "MANAGER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "gerente3@finacc.com", "password": "Senha@123"}
    )
    manager_token = login.json()["access_token"]

    client.put(
        "/api/financial-account",
        headers=_auth_headers(owner_token),
        json={"account_type": "PIX", "holder_name": "Dono", "pix_key": "chave@teste.com"},
    )

    response = client.get("/api/financial-account", headers=_auth_headers(manager_token))
    assert response.status_code == 403


def test_financial_account_not_found_before_setup(client):
    owner = _signup_owner(client, "dono4@finacc.com")
    response = client.get("/api/financial-account", headers=_auth_headers(owner["access_token"]))
    assert response.status_code == 404


def test_financial_account_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA5@finacc.com")
    owner_b = _signup_owner(client, "donoB5@finacc.com")

    client.put(
        "/api/financial-account",
        headers=_auth_headers(owner_a["access_token"]),
        json={"account_type": "PIX", "holder_name": "Dono A", "pix_key": "a@teste.com"},
    )

    response_b = client.get(
        "/api/financial-account", headers=_auth_headers(owner_b["access_token"])
    )
    assert response_b.status_code == 404
