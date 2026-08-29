def _signup(client, tenant_name="Barbearia Teste", email="dono@teste.com", password="Senha@123"):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": tenant_name,
            "owner_full_name": "Dono Teste",
            "owner_email": email,
            "owner_password": password,
            "plan_code": "monthly",
        },
    )


def test_signup_creates_tenant_and_owner_with_full_permissions(client):
    response = _signup(client)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"]["code"] == "OWNER"
    assert "clients.view" in data["user"]["permissions"]
    assert "finance.delete" in data["user"]["permissions"]
    assert data["tenant"]["slug"] == "barbearia-teste"
    assert "refresh_token" in response.cookies


def test_signup_without_plan_fails(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Sem Plano",
            "owner_full_name": "Dono Teste",
            "owner_email": "semplano@teste.com",
            "owner_password": "Senha@123",
        },
    )
    assert response.status_code == 422


def test_signup_with_invalid_plan_fails(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Plano Invalido",
            "owner_full_name": "Dono Teste",
            "owner_email": "planoinvalido@teste.com",
            "owner_password": "Senha@123",
            "plan_code": "nao-existe",
        },
    )
    assert response.status_code == 400


def test_signup_creates_subscription_on_chosen_plan(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Anual",
            "owner_full_name": "Dono Teste",
            "owner_email": "anual@teste.com",
            "owner_password": "Senha@123",
            "plan_code": "annual",
        },
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    subscription = client.get("/api/subscription", headers={"Authorization": f"Bearer {token}"})
    assert subscription.status_code == 200
    assert subscription.json()["plan"]["code"] == "annual"


def test_signup_plans_endpoint_is_public(client):
    response = client.get("/api/auth/signup-plans")
    assert response.status_code == 200
    codes = {plan["code"] for plan in response.json()}
    assert {"monthly", "annual"} <= codes


def test_signup_with_duplicate_email_fails(client):
    _signup(client, email="duplicado@teste.com")
    response = _signup(client, tenant_name="Outra Barbearia", email="duplicado@teste.com")
    assert response.status_code == 409


def test_login_with_valid_credentials_succeeds(client):
    _signup(client, email="login@teste.com", password="Senha@123")
    response = client.post(
        "/api/auth/login", json={"email": "login@teste.com", "password": "Senha@123"}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_with_wrong_password_fails(client):
    _signup(client, email="senhaerrada@teste.com", password="Senha@123")
    response = client.post(
        "/api/auth/login", json={"email": "senhaerrada@teste.com", "password": "errada"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha inválidos."


def test_login_with_nonexistent_user_fails(client):
    response = client.post(
        "/api/auth/login", json={"email": "naoexiste@teste.com", "password": "qualquer"}
    )
    assert response.status_code == 401


def test_me_without_token_is_rejected(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_valid_token_returns_user(client):
    signup = _signup(client, email="me@teste.com")
    token = signup.json()["access_token"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@teste.com"


def test_refresh_rotates_token_and_old_one_is_invalidated(client):
    signup = _signup(client, email="refresh@teste.com")
    old_refresh_cookie = signup.cookies.get("refresh_token")

    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    new_refresh_cookie = refreshed.cookies.get("refresh_token")
    assert new_refresh_cookie != old_refresh_cookie

    client.cookies.set("refresh_token", old_refresh_cookie)
    reused = client.post("/api/auth/refresh")
    assert reused.status_code == 401


def test_logout_revokes_refresh_token(client):
    _signup(client, email="logout@teste.com")
    logout = client.post("/api/auth/logout")
    assert logout.status_code == 204

    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 401
