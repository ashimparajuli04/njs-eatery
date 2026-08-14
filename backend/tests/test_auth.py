def test_signup_and_me(client):
    resp = client.post(
        "/users/signup",
        json={
            "email": "Alice@Test.com",
            "first_name": "Alice",
            "last_name": "Smith",
            "password": "secret123",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == "alice@test.com"
    assert body["role"] == "employee"
    assert "password" not in body and "password_hash" not in body

    token = client.post(
        "/auth/token",
        data={"username": "alice@test.com", "password": "secret123"},
    )
    assert token.status_code == 200, token.text

    me = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token.json()['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == "alice@test.com"


def test_signup_duplicate_email_400(client):
    payload = {
        "email": "dup@test.com",
        "first_name": "D",
        "last_name": "U",
        "password": "secret123",
    }
    assert client.post("/users/signup", json=payload).status_code == 201
    resp = client.post("/users/signup", json=payload)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Email already registered"


def test_signup_invalid_email_400(client):
    resp = client.post(
        "/users/signup",
        json={
            "email": "not-an-email",
            "first_name": "X",
            "last_name": "Y",
            "password": "secret123",
        },
    )
    assert resp.status_code == 422


def test_login_wrong_password_401(client, admin_user):
    resp = client.post(
        "/auth/token",
        data={"username": "admin@test.com", "password": "wrongpass"},
    )
    assert resp.status_code == 401


def test_login_unknown_email_401(client):
    resp = client.post(
        "/auth/token",
        data={"username": "nobody@test.com", "password": "secret123"},
    )
    assert resp.status_code == 401


def test_protected_endpoint_without_token_401(client):
    assert client.get("/tables").status_code == 401


def test_unknown_user_by_id_404(client, admin_headers):
    resp = client.get("/users/by-id/9999", headers=admin_headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"
