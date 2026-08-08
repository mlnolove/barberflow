def _signup_owner(client, email="dono@estoque.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "tenant_name": "Barbearia Estoque",
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    )
    return response.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _create_product(client, token, **overrides):
    payload = {"name": "Pomada Modeladora", "sale_price": "35.00", "min_stock": 5}
    payload.update(overrides)
    return client.post("/api/inventory/products", headers=_auth_headers(token), json=payload)


def test_create_product_succeeds(client):
    owner = _signup_owner(client, "owner1@estoque.com")
    response = _create_product(client, owner["access_token"])
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Pomada Modeladora"
    assert body["current_quantity"] == 0
    assert body["is_low_stock"] is True


def test_create_product_with_initial_quantity_generates_entry_movement(client):
    owner = _signup_owner(client, "owner2@estoque.com")
    token = owner["access_token"]
    created = _create_product(client, token, initial_quantity=20).json()
    assert created["current_quantity"] == 20
    assert created["is_low_stock"] is False

    movements = client.get(
        f"/api/inventory/products/{created['id']}/movements", headers=_auth_headers(token)
    ).json()
    assert movements["total"] == 1
    assert movements["items"][0]["type"] == "ENTRY"
    assert movements["items"][0]["quantity_after"] == 20


def test_create_product_with_duplicate_sku_fails(client):
    owner = _signup_owner(client, "owner3@estoque.com")
    token = owner["access_token"]
    _create_product(client, token, sku="POM-001")
    response = _create_product(client, token, name="Pomada Extra", sku="POM-001")
    assert response.status_code == 409


def test_entry_movement_increases_stock(client):
    owner = _signup_owner(client, "owner4@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token).json()

    response = client.post(
        f"/api/inventory/products/{product['id']}/movements",
        headers=_auth_headers(token),
        json={"type": "ENTRY", "quantity": 15, "reason": "Compra de fornecedor"},
    )
    assert response.status_code == 200
    assert response.json()["current_quantity"] == 15


def test_exit_movement_exceeding_stock_fails(client):
    """Teste obrigatório (seção 37): impedir estoque negativo."""
    owner = _signup_owner(client, "owner5@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token, initial_quantity=5).json()

    response = client.post(
        f"/api/inventory/products/{product['id']}/movements",
        headers=_auth_headers(token),
        json={"type": "EXIT", "quantity": 10, "reason": "Uso interno"},
    )
    assert response.status_code == 400

    unchanged = client.get(
        f"/api/inventory/products/{product['id']}", headers=_auth_headers(token)
    ).json()
    assert unchanged["current_quantity"] == 5


def test_exit_movement_within_stock_succeeds(client):
    owner = _signup_owner(client, "owner6@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token, initial_quantity=10).json()

    response = client.post(
        f"/api/inventory/products/{product['id']}/movements",
        headers=_auth_headers(token),
        json={"type": "EXIT", "quantity": 4, "reason": "Produto utilizado em atendimento"},
    )
    assert response.status_code == 200
    assert response.json()["current_quantity"] == 6


def test_loss_and_sale_and_return_movements(client):
    owner = _signup_owner(client, "owner7@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token, initial_quantity=20).json()
    headers = _auth_headers(token)

    loss = client.post(
        f"/api/inventory/products/{product['id']}/movements",
        headers=headers,
        json={"type": "LOSS", "quantity": 2, "reason": "Produto danificado"},
    )
    assert loss.json()["current_quantity"] == 18

    sale = client.post(
        f"/api/inventory/products/{product['id']}/movements",
        headers=headers,
        json={"type": "SALE", "quantity": 3, "reason": "Venda balcão"},
    )
    assert sale.json()["current_quantity"] == 15

    ret = client.post(
        f"/api/inventory/products/{product['id']}/movements",
        headers=headers,
        json={"type": "RETURN", "quantity": 1, "reason": "Cliente devolveu o produto"},
    )
    assert ret.json()["current_quantity"] == 16


def test_movement_without_reason_fails(client):
    owner = _signup_owner(client, "owner8@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token, initial_quantity=10).json()

    response = client.post(
        f"/api/inventory/products/{product['id']}/movements",
        headers=_auth_headers(token),
        json={"type": "EXIT", "quantity": 1, "reason": ""},
    )
    assert response.status_code == 422


def test_adjustment_sets_exact_quantity_and_logs_reason(client):
    owner = _signup_owner(client, "owner9@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token, initial_quantity=15).json()

    response = client.post(
        f"/api/inventory/products/{product['id']}/adjust",
        headers=_auth_headers(token),
        json={"new_quantity": 13, "reason": "Contagem física divergente"},
    )
    assert response.status_code == 200
    assert response.json()["current_quantity"] == 13

    movements = client.get(
        f"/api/inventory/products/{product['id']}/movements", headers=_auth_headers(token)
    ).json()
    adjustment = next(m for m in movements["items"] if m["type"] == "ADJUSTMENT")
    assert adjustment["quantity_change"] == -2
    assert adjustment["reason"] == "Contagem física divergente"


def test_adjustment_without_reason_fails(client):
    owner = _signup_owner(client, "owner10@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token, initial_quantity=10).json()

    response = client.post(
        f"/api/inventory/products/{product['id']}/adjust",
        headers=_auth_headers(token),
        json={"new_quantity": 8, "reason": ""},
    )
    assert response.status_code == 422


def test_low_stock_filter(client):
    owner = _signup_owner(client, "owner11@estoque.com")
    token = owner["access_token"]
    _create_product(client, token, name="Estoque baixo", min_stock=10, initial_quantity=3)
    _create_product(client, token, name="Estoque ok", min_stock=10, initial_quantity=50)

    response = client.get(
        "/api/inventory/products",
        headers=_auth_headers(token),
        params={"low_stock": "true"},
    )
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Estoque baixo"


def test_deactivate_and_reactivate_product(client):
    owner = _signup_owner(client, "owner12@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token).json()

    deactivated = client.post(
        f"/api/inventory/products/{product['id']}/deactivate", headers=_auth_headers(token)
    )
    assert deactivated.json()["is_active"] is False

    reactivated = client.post(
        f"/api/inventory/products/{product['id']}/reactivate", headers=_auth_headers(token)
    )
    assert reactivated.json()["is_active"] is True


def test_product_linked_to_supplier(client):
    owner = _signup_owner(client, "owner13@estoque.com")
    token = owner["access_token"]
    supplier = client.post(
        "/api/suppliers",
        headers=_auth_headers(token),
        json={"name": "Distribuidora ABC", "phone": "(11) 91234-5678"},
    ).json()

    product = _create_product(client, token, supplier_id=supplier["id"]).json()
    assert product["supplier"]["id"] == supplier["id"]
    assert product["supplier"]["name"] == "Distribuidora ABC"


def test_create_product_with_nonexistent_supplier_fails(client):
    owner = _signup_owner(client, "owner14@estoque.com")
    token = owner["access_token"]
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = _create_product(client, token, supplier_id=fake_id)
    assert response.status_code == 404


def test_manager_can_adjust_stock(client):
    owner = _signup_owner(client, "owner15@estoque.com")
    token = owner["access_token"]
    product = _create_product(client, token, initial_quantity=10).json()

    client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Gerente",
            "email": "gerente15@estoque.com",
            "password": "Senha@123",
            "role_code": "MANAGER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "gerente15@estoque.com", "password": "Senha@123"}
    )
    manager_token = login.json()["access_token"]

    response = client.post(
        f"/api/inventory/products/{product['id']}/adjust",
        headers=_auth_headers(manager_token),
        json={"new_quantity": 9, "reason": "Ajuste de contagem"},
    )
    assert response.status_code == 200


def test_barber_cannot_access_inventory(client):
    owner = _signup_owner(client, "owner16@estoque.com")
    token = owner["access_token"]
    client.post(
        "/api/users",
        headers=_auth_headers(token),
        json={
            "full_name": "Barbeiro",
            "email": "barbeiro16@estoque.com",
            "password": "Senha@123",
            "role_code": "BARBER",
        },
    )
    login = client.post(
        "/api/auth/login", json={"email": "barbeiro16@estoque.com", "password": "Senha@123"}
    )
    barber_token = login.json()["access_token"]

    response = _create_product(client, barber_token)
    assert response.status_code == 403

    list_response = client.get("/api/inventory/products", headers=_auth_headers(barber_token))
    assert list_response.status_code == 403


def test_inventory_is_isolated_per_tenant(client):
    owner_a = _signup_owner(client, "donoA@estoque.com")
    owner_b = _signup_owner(client, "donoB@estoque.com")

    product_a = _create_product(client, owner_a["access_token"], name="Produto A").json()

    list_b = client.get("/api/inventory/products", headers=_auth_headers(owner_b["access_token"]))
    names_b = [p["name"] for p in list_b.json()["items"]]
    assert "Produto A" not in names_b

    get_from_b = client.get(
        f"/api/inventory/products/{product_a['id']}", headers=_auth_headers(owner_b["access_token"])
    )
    assert get_from_b.status_code == 404

    adjust_from_b = client.post(
        f"/api/inventory/products/{product_a['id']}/adjust",
        headers=_auth_headers(owner_b["access_token"]),
        json={"new_quantity": 999, "reason": "tentativa indevida"},
    )
    assert adjust_from_b.status_code == 404
