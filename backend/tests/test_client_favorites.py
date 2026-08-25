def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Favoritos",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    ).json()


def _signup_client_account(client, email):
    return client.post(
        "/api/client/auth/signup",
        json={"full_name": "Cliente", "email": email, "password": "Senha@123"},
    ).json()


def test_client_can_add_list_and_remove_favorite(client):
    owner = _signup_owner(client, "dono@fav.com")
    tenant_id = owner["tenant"]["id"]
    client_account = _signup_client_account(client, "cliente@fav.com")
    headers = _auth_headers(client_account["access_token"])

    added = client.post("/api/client/favorites", headers=headers, json={"tenant_id": tenant_id})
    assert added.status_code == 201

    listed = client.get("/api/client/favorites", headers=headers)
    assert listed.status_code == 200
    assert any(f["tenant_id"] == tenant_id for f in listed.json())

    removed = client.delete(f"/api/client/favorites/{tenant_id}", headers=headers)
    assert removed.status_code == 204

    listed_after = client.get("/api/client/favorites", headers=headers)
    assert listed_after.json() == []


def test_favoriting_same_barbershop_twice_fails(client):
    owner = _signup_owner(client, "dono2@fav.com")
    tenant_id = owner["tenant"]["id"]
    client_account = _signup_client_account(client, "cliente2@fav.com")
    headers = _auth_headers(client_account["access_token"])

    client.post("/api/client/favorites", headers=headers, json={"tenant_id": tenant_id})
    duplicate = client.post("/api/client/favorites", headers=headers, json={"tenant_id": tenant_id})
    assert duplicate.status_code == 409
