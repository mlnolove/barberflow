def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Gate",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    ).json()


def test_operational_endpoints_blocked_after_subscription_cancelled(client):
    owner = _signup_owner(client, "dono1@gate.com")
    headers = _auth_headers(owner["access_token"])

    client.post("/api/subscription/cancel", headers=headers)

    response = client.post(
        "/api/customers", headers=headers, json={"full_name": "Cliente", "phone": "(11) 91111-1111"}
    )
    assert response.status_code == 402
    assert "assinatura" in response.json()["detail"].lower()


def test_settings_and_audit_remain_accessible_after_cancellation(client):
    owner = _signup_owner(client, "dono2@gate.com")
    headers = _auth_headers(owner["access_token"])

    client.post("/api/subscription/cancel", headers=headers)

    settings_response = client.get("/api/settings/tenant", headers=headers)
    assert settings_response.status_code == 200

    audit_response = client.get("/api/audit-logs", headers=headers)
    assert audit_response.status_code == 200

    subscription_response = client.get("/api/subscription", headers=headers)
    assert subscription_response.status_code == 200


def test_reactivating_subscription_restores_access(client):
    owner = _signup_owner(client, "dono3@gate.com")
    headers = _auth_headers(owner["access_token"])

    client.post("/api/subscription/cancel", headers=headers)
    blocked = client.post(
        "/api/customers", headers=headers, json={"full_name": "Cliente", "phone": "(11) 91111-1111"}
    )
    assert blocked.status_code == 402

    client.post("/api/subscription/checkout", headers=headers)

    restored = client.post(
        "/api/customers", headers=headers, json={"full_name": "Cliente", "phone": "(11) 91111-1111"}
    )
    assert restored.status_code == 201


def test_active_trial_is_not_blocked(client):
    owner = _signup_owner(client, "dono4@gate.com")
    headers = _auth_headers(owner["access_token"])

    response = client.post(
        "/api/customers", headers=headers, json={"full_name": "Cliente", "phone": "(11) 91111-1111"}
    )
    assert response.status_code == 201
