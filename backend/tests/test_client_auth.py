def _signup_client(client, email="cliente@teste.com", password="Senha@123", **overrides):
    payload = {"full_name": "Cliente Teste", "email": email, "password": password}
    payload.update(overrides)
    return client.post("/api/client/auth/signup", json=payload)


def _signup_owner(client, email="dono@teste.com"):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Teste",
            "owner_full_name": "Dono Teste",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    )


def test_client_signup_creates_account(client):
    response = _signup_client(client)
    assert response.status_code == 201
    data = response.json()
    assert data["client"]["email"] == "cliente@teste.com"
    assert "client_refresh_token" in response.cookies


def test_client_signup_with_duplicate_email_fails(client):
    _signup_client(client, email="dup@teste.com")
    response = _signup_client(client, email="dup@teste.com")
    assert response.status_code == 409


def test_client_login_with_wrong_password_fails(client):
    _signup_client(client, email="login@teste.com")
    response = client.post(
        "/api/client/auth/login", json={"email": "login@teste.com", "password": "errada"}
    )
    assert response.status_code == 401


def test_client_me_without_token_is_rejected(client):
    response = client.get("/api/client/auth/me")
    assert response.status_code == 401


def test_client_token_is_rejected_by_staff_endpoints(client):
    """Os dois domínios de auth nunca compartilham superfície: um token de
    cliente não pode ser usado em endpoint de equipe, e vice-versa."""
    signup = _signup_client(client, email="isolamento@teste.com")
    client_token = signup.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {client_token}"})
    assert response.status_code == 401


def test_staff_token_is_rejected_by_client_endpoints(client):
    owner = _signup_owner(client, email="dono2@teste.com")
    staff_token = owner.json()["access_token"]

    response = client.get("/api/client/auth/me", headers={"Authorization": f"Bearer {staff_token}"})
    assert response.status_code == 401


def test_client_refresh_rotates_token_and_old_one_is_invalidated(client):
    signup = _signup_client(client, email="refresh@teste.com")
    old_cookie = signup.cookies.get("client_refresh_token")

    refreshed = client.post("/api/client/auth/refresh")
    assert refreshed.status_code == 200
    new_cookie = refreshed.cookies.get("client_refresh_token")
    assert new_cookie != old_cookie

    client.cookies.set("client_refresh_token", old_cookie)
    reused = client.post("/api/client/auth/refresh")
    assert reused.status_code == 401


def test_client_logout_revokes_refresh_token(client):
    _signup_client(client, email="logout@teste.com")
    logout = client.post("/api/client/auth/logout")
    assert logout.status_code == 204

    refreshed = client.post("/api/client/auth/refresh")
    assert refreshed.status_code == 401


def test_client_password_reset_request_never_reveals_existence(client):
    _signup_client(client, email="reset@teste.com")

    existing = client.post(
        "/api/client/auth/password-reset/request", json={"email": "reset@teste.com"}
    )
    missing = client.post(
        "/api/client/auth/password-reset/request", json={"email": "naoexiste@teste.com"}
    )
    assert existing.status_code == 204
    assert missing.status_code == 204


def test_client_password_reset_confirm_with_invalid_token_fails(client):
    response = client.post(
        "/api/client/auth/password-reset/confirm",
        json={"token": "token-invalido", "new_password": "NovaSenha@123"},
    )
    assert response.status_code == 400
