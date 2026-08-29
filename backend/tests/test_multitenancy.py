"""Teste obrigatório (seção 37 da especificação): um usuário de um tenant
nunca pode acessar ou alterar dados de outro tenant, mesmo manipulando IDs
manualmente na requisição."""


def _signup(client, tenant_name, email):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": tenant_name,
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    )
    return response.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_user_list_is_isolated_per_tenant(client):
    owner_a = _signup(client, "Barbearia A", "donoA@multi.com")
    owner_b = _signup(client, "Barbearia B", "donoB@multi.com")

    client.post(
        "/api/users",
        headers=_auth_headers(owner_a["access_token"]),
        json={
            "full_name": "Funcionario A",
            "email": "funcionarioA@multi.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )

    users_tenant_b = client.get("/api/users", headers=_auth_headers(owner_b["access_token"]))
    emails = [u["email"] for u in users_tenant_b.json()]
    assert "funcionarioA@multi.com" not in emails
    assert "donoB@multi.com" in emails


def test_cannot_edit_employee_of_another_tenant_via_id_manipulation(client):
    owner_a = _signup(client, "Barbearia C", "donoC@multi.com")
    owner_b = _signup(client, "Barbearia D", "donoD@multi.com")

    employee_a = client.post(
        "/api/users",
        headers=_auth_headers(owner_a["access_token"]),
        json={
            "full_name": "Funcionario C",
            "email": "funcionarioC@multi.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    ).json()

    # Owner B tenta alterar, usando o ID real do funcionário do tenant A,
    # mas autenticado com o próprio token (tenant B).
    response = client.patch(
        f"/api/users/{employee_a['id']}",
        headers=_auth_headers(owner_b["access_token"]),
        json={"full_name": "Nome Alterado Indevidamente"},
    )
    assert response.status_code == 404


def test_cannot_grant_permission_override_to_employee_of_another_tenant(client):
    owner_a = _signup(client, "Barbearia E", "donoE@multi.com")
    owner_b = _signup(client, "Barbearia F", "donoF@multi.com")

    employee_a = client.post(
        "/api/users",
        headers=_auth_headers(owner_a["access_token"]),
        json={
            "full_name": "Funcionario E",
            "email": "funcionarioE@multi.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    ).json()

    response = client.put(
        f"/api/users/{employee_a['id']}/permissions",
        headers=_auth_headers(owner_b["access_token"]),
        json={"permission_code": "finance.view", "granted": True},
    )
    assert response.status_code == 404


def test_access_token_tenant_claim_cannot_be_bypassed_by_wrong_id(client):
    owner_a = _signup(client, "Barbearia G", "donoG@multi.com")
    owner_b = _signup(client, "Barbearia H", "donoH@multi.com")

    # mesmo usando o próprio token válido, owner B nunca vê o total de
    # usuários do tenant A somado ao seu — cada listagem é escopada.
    list_a = client.get("/api/users", headers=_auth_headers(owner_a["access_token"])).json()
    list_b = client.get("/api/users", headers=_auth_headers(owner_b["access_token"])).json()

    ids_a = {u["id"] for u in list_a}
    ids_b = {u["id"] for u in list_b}
    assert ids_a.isdisjoint(ids_b)
