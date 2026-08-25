def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _signup_owner(client, email, tenant_name):
    return client.post(
        "/api/auth/signup",
        json={
            "tenant_name": tenant_name,
            "owner_full_name": "Dono",
            "owner_email": email,
            "owner_password": "Senha@123",
        },
    ).json()


def _set_location(client, owner_token, latitude, longitude):
    return client.patch(
        "/api/settings/tenant",
        headers=_auth_headers(owner_token),
        json={"latitude": latitude, "longitude": longitude},
    )


SE_LAT, SE_LNG = -23.550520, -46.633308  # Praça da Sé, SP
PAULISTA_LAT, PAULISTA_LNG = -23.561414, -46.655881  # ~2km da Sé
RIO_LAT, RIO_LNG = -22.906847, -43.172897  # ~360km da Sé


def test_search_by_proximity_orders_by_distance_and_respects_radius(client):
    near = _signup_owner(client, "near@busca.com", "Barbearia Perto")
    far_but_in_radius = _signup_owner(client, "medio@busca.com", "Barbearia Média Distância")
    too_far = _signup_owner(client, "longe@busca.com", "Barbearia Longe")

    _set_location(client, near["access_token"], SE_LAT, SE_LNG)
    _set_location(client, far_but_in_radius["access_token"], PAULISTA_LAT, PAULISTA_LNG)
    _set_location(client, too_far["access_token"], RIO_LAT, RIO_LNG)

    response = client.get(
        "/api/client/barbershops",
        params={"latitude": SE_LAT, "longitude": SE_LNG, "radius_km": 50},
    )
    assert response.status_code == 200
    body = response.json()
    names = [item["name"] for item in body["items"]]

    assert "Barbearia Perto" in names
    assert "Barbearia Média Distância" in names
    assert "Barbearia Longe" not in names

    # ordenado por distância crescente
    perto_idx = names.index("Barbearia Perto")
    media_idx = names.index("Barbearia Média Distância")
    assert perto_idx < media_idx
    assert body["items"][perto_idx]["distance_km"] < body["items"][media_idx]["distance_km"]


def test_search_by_text_matches_name_and_service(client):
    owner = _signup_owner(client, "texto@busca.com", "Corte Certo Barbearia")
    client.post(
        "/api/services",
        headers=_auth_headers(owner["access_token"]),
        json={"name": "Degradê Navalhado", "price": "45.00", "duration_minutes": 45},
    )

    by_name = client.get("/api/client/barbershops", params={"q": "Corte Certo"})
    assert any(i["name"] == "Corte Certo Barbearia" for i in by_name.json()["items"])

    by_service = client.get("/api/client/barbershops", params={"q": "Degradê"})
    assert any(i["name"] == "Corte Certo Barbearia" for i in by_service.json()["items"])


def test_barbershop_detail_exposes_public_data_only(client):
    owner = _signup_owner(client, "detalhe@busca.com", "Barbearia Detalhe")
    headers = _auth_headers(owner["access_token"])
    service = client.post(
        "/api/services",
        headers=headers,
        json={"name": "Corte", "price": "40.00", "duration_minutes": 30},
    ).json()
    client.post(
        "/api/employees",
        headers=headers,
        json={
            "full_name": "Barbeiro Público",
            "phone": "(11) 90000-0000",
            "commission_percentage": "35.00",
            "service_ids": [service["id"]],
        },
    )

    tenant_id = owner["tenant"]["id"]
    response = client.get(f"/api/client/barbershops/{tenant_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Barbearia Detalhe"
    assert len(body["barbers"]) == 1
    barber = body["barbers"][0]
    assert barber["full_name"] == "Barbeiro Público"
    # dados sensíveis do profissional nunca são expostos publicamente
    assert "commission_percentage" not in barber
    assert "phone" not in barber


def test_search_result_exposes_only_public_card_fields(client):
    _signup_owner(client, "financeiro@busca.com", "Barbearia Financeiro")
    response = client.get("/api/client/barbershops", params={"q": "Barbearia Financeiro"})
    assert response.status_code == 200
    item = next(i for i in response.json()["items"] if i["name"] == "Barbearia Financeiro")
    assert set(item.keys()) == {
        "id",
        "name",
        "city",
        "logo_url",
        "distance_km",
        "min_price",
        "max_price",
        "is_open_now",
    }
