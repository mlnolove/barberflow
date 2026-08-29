def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Mensagens",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    ).json()


def _signup_client_account(client, email):
    return client.post(
        "/api/client/auth/signup",
        json={"full_name": "Cliente", "email": email, "password": "Senha@123"},
    ).json()


def _start_conversation(client, client_token, tenant_id):
    return client.post(
        "/api/client/conversations",
        headers=_auth_headers(client_token),
        json={"tenant_id": tenant_id},
    ).json()


def test_client_starts_conversation_and_owner_sees_and_replies(client):
    owner = _signup_owner(client, "dono1@msg.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    client_account = _signup_client_account(client, "cliente1@msg.com")
    client_token = client_account["access_token"]

    conversation = _start_conversation(client, client_token, tenant_id)
    sent = client.post(
        f"/api/client/conversations/{conversation['id']}/messages",
        headers=_auth_headers(client_token),
        json={"body": "Vou chegar alguns minutos atrasado."},
    )
    assert sent.status_code == 201
    assert sent.json()["sender_type"] == "CLIENT"

    listed = client.get("/api/conversations", headers=_auth_headers(owner_token))
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["client"]["full_name"] == "Cliente"

    conversation_id = listed.json()[0]["id"]
    messages = client.get(
        f"/api/conversations/{conversation_id}/messages", headers=_auth_headers(owner_token)
    )
    assert messages.status_code == 200
    assert messages.json()[0]["body"] == "Vou chegar alguns minutos atrasado."

    reply = client.post(
        f"/api/conversations/{conversation_id}/messages",
        headers=_auth_headers(owner_token),
        json={"body": "Sem problema, te esperamos."},
    )
    assert reply.status_code == 201
    assert reply.json()["sender_type"] == "STAFF"

    client_view = client.get(
        f"/api/client/conversations/{conversation['id']}/messages",
        headers=_auth_headers(client_token),
    )
    bodies = [m["body"] for m in client_view.json()]
    assert bodies == ["Vou chegar alguns minutos atrasado.", "Sem problema, te esperamos."]


def test_starting_conversation_twice_reuses_same_thread(client):
    owner = _signup_owner(client, "dono2@msg.com")
    tenant_id = owner["tenant"]["id"]
    client_account = _signup_client_account(client, "cliente2@msg.com")
    client_token = client_account["access_token"]

    first = _start_conversation(client, client_token, tenant_id)
    second = _start_conversation(client, client_token, tenant_id)
    assert first["id"] == second["id"]


def test_client_cannot_see_conversation_from_another_client(client):
    owner = _signup_owner(client, "dono3@msg.com")
    tenant_id = owner["tenant"]["id"]
    client_a = _signup_client_account(client, "clienteA3@msg.com")
    client_b = _signup_client_account(client, "clienteB3@msg.com")

    conversation = _start_conversation(client, client_a["access_token"], tenant_id)
    client.post(
        f"/api/client/conversations/{conversation['id']}/messages",
        headers=_auth_headers(client_a["access_token"]),
        json={"body": "Mensagem privada do cliente A."},
    )

    forbidden = client.get(
        f"/api/client/conversations/{conversation['id']}/messages",
        headers=_auth_headers(client_b["access_token"]),
    )
    assert forbidden.status_code == 404


def test_conversations_are_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA4@msg.com")
    owner_b = _signup_owner(client, "donoB4@msg.com")
    tenant_a = owner_a["tenant"]["id"]

    client_account = _signup_client_account(client, "cliente4@msg.com")
    _start_conversation(client, client_account["access_token"], tenant_a)

    listed_b = client.get("/api/conversations", headers=_auth_headers(owner_b["access_token"]))
    assert listed_b.json() == []


def test_barber_cannot_access_messages(client):
    owner = _signup_owner(client, "dono5@msg.com")
    owner_token = owner["access_token"]

    barber = client.post(
        "/api/users",
        headers=_auth_headers(owner_token),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro5@msg.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    assert barber.status_code == 201
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro5@msg.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    response = client.get("/api/conversations", headers=_auth_headers(barber_token))
    assert response.status_code == 403


def test_mark_conversation_read_clears_unread_client_messages(client):
    owner = _signup_owner(client, "dono6@msg.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    client_account = _signup_client_account(client, "cliente6@msg.com")
    conversation = _start_conversation(client, client_account["access_token"], tenant_id)
    client.post(
        f"/api/client/conversations/{conversation['id']}/messages",
        headers=_auth_headers(client_account["access_token"]),
        json={"body": "Oi!"},
    )

    conversations = client.get("/api/conversations", headers=_auth_headers(owner_token)).json()
    conversation_id = conversations[0]["id"]
    before = client.get(
        f"/api/conversations/{conversation_id}/messages", headers=_auth_headers(owner_token)
    ).json()
    assert before[0]["read_at"] is None

    marked = client.post(
        f"/api/conversations/{conversation_id}/read", headers=_auth_headers(owner_token)
    )
    assert marked.status_code == 204

    after = client.get(
        f"/api/conversations/{conversation_id}/messages", headers=_auth_headers(owner_token)
    ).json()
    assert after[0]["read_at"] is not None


def test_conversation_websocket_receives_broadcast_message(client):
    owner = _signup_owner(client, "dono7@msg.com")
    owner_token = owner["access_token"]
    tenant_id = owner["tenant"]["id"]
    client_account = _signup_client_account(client, "cliente7@msg.com")
    client_token = client_account["access_token"]

    conversation = _start_conversation(client, client_token, tenant_id)

    with client.websocket_connect(
        f"/api/conversations/{conversation['id']}/ws?token={owner_token}"
    ) as websocket:
        sent = client.post(
            f"/api/client/conversations/{conversation['id']}/messages",
            headers=_auth_headers(client_token),
            json={"body": "Mensagem em tempo real."},
        )
        assert sent.status_code == 201

        data = websocket.receive_json()
        assert data["body"] == "Mensagem em tempo real."
        assert data["sender_type"] == "CLIENT"
