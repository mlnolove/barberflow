from app.core.payment_gateway import MercadoPagoGateway


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Pagamentos",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
            "plan_code": "monthly",
        },
    ).json()


def test_checkout_with_sandbox_gateway_approves_and_activates_subscription(client):
    owner = _signup_owner(client, "dono1@pay.com")
    headers = _auth_headers(owner["access_token"])

    before = client.get("/api/subscription", headers=headers).json()
    assert before["status"] == "TRIAL"

    checkout = client.post("/api/subscription/checkout", headers=headers)
    assert checkout.status_code == 200
    body = checkout.json()
    assert body["status"] == "PAID"
    assert body["checkout_url"] is None

    after = client.get("/api/subscription", headers=headers).json()
    assert after["status"] == "ACTIVE"
    assert after["cancel_at_period_end"] is False


def test_checkout_creates_payment_history_entry(client):
    owner = _signup_owner(client, "dono2@pay.com")
    headers = _auth_headers(owner["access_token"])

    client.post("/api/subscription/checkout", headers=headers)
    payments = client.get("/api/payments", headers=headers).json()
    assert payments["total"] == 1
    payment = payments["items"][0]
    assert payment["purpose"] == "SUBSCRIPTION"
    assert payment["status"] == "PAID"
    assert payment["gateway"] == "sandbox"


def test_payments_list_requires_finance_permission(client):
    owner = _signup_owner(client, "dono3@pay.com")
    owner_token = owner["access_token"]

    client.post(
        "/api/users",
        headers=_auth_headers(owner_token),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro3@pay.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro3@pay.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    response = client.get("/api/payments", headers=_auth_headers(barber_token))
    assert response.status_code == 403


def test_webhook_with_unrecognized_payload_is_a_noop(client):
    response = client.post("/api/payments/webhook/mercadopago", json={"type": "unknown"})
    assert response.status_code == 204


def test_payments_are_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA4@pay.com")
    owner_b = _signup_owner(client, "donoB4@pay.com")

    client.post("/api/subscription/checkout", headers=_auth_headers(owner_a["access_token"]))

    payments_b = client.get("/api/payments", headers=_auth_headers(owner_b["access_token"])).json()
    assert payments_b["total"] == 0


def test_mercadopago_signature_verification_accepts_valid_and_rejects_tampered():
    """Testa a lógica de HMAC diretamente — não há como exercer isso contra
    o Mercado Pago real sem credenciais, mas a fórmula (manifest
    `id:...;request-id:...;ts:...;` + HMAC-SHA256) é a documentada por
    eles, e é isso que este teste garante que a implementação segue."""
    import hashlib
    import hmac

    gateway = MercadoPagoGateway(access_token="unused", webhook_secret="test-secret")
    data_id = "123456"
    request_id = "req-abc"
    ts = "1700000000"
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    valid_hash = hmac.new(b"test-secret", manifest.encode(), hashlib.sha256).hexdigest()

    headers = {"x-signature": f"ts={ts},v1={valid_hash}", "x-request-id": request_id}
    assert gateway._verify_signature(headers=headers, data_id=data_id) is True

    tampered_headers = {"x-signature": f"ts={ts},v1={'0' * 64}", "x-request-id": request_id}
    assert gateway._verify_signature(headers=tampered_headers, data_id=data_id) is False


def test_mercadopago_gateway_without_secret_always_rejects():
    gateway = MercadoPagoGateway(access_token="unused", webhook_secret=None)
    headers = {"x-signature": "ts=1,v1=deadbeef", "x-request-id": "req"}
    assert gateway._verify_signature(headers=headers, data_id="123") is False
