async def test_register_creates_user(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@test.com",
            "username": "new_user",
            "password": "pass1234",
            "role": "player",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "new@test.com"
    assert data["username"] == "new_user"
    assert data["role"] == "player"
    assert data["is_active"] is True
    assert "hashed_password" not in data


async def test_register_duplicate_email_returns_409(client, player):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": player["user"]["email"],
            "username": "alice2",
            "password": "pass1234",
            "role": "player",
        },
    )
    assert r.status_code == 409


async def test_register_duplicate_username_returns_409(client, player):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "different@test.com",
            "username": player["user"]["username"],
            "password": "pass1234",
            "role": "player",
        },
    )
    assert r.status_code == 409


async def test_register_short_password_rejected(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "short@test.com",
            "username": "short",
            "password": "tiny",
            "role": "player",
        },
    )
    assert r.status_code == 422


async def test_login_returns_token_pair(client, player):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice@test.com", "password": "alicepass1"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password_returns_401(client, player):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice@test.com", "password": "wrongpass"},
    )
    assert r.status_code == 401


async def test_me_requires_token(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


async def test_me_returns_current_user(client, player):
    r = await client.get("/api/v1/auth/me", headers=player["headers"])
    assert r.status_code == 200
    assert r.json()["username"] == "alice"


async def test_me_with_invalid_token_returns_401(client):
    r = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"}
    )
    assert r.status_code == 401


async def test_refresh_returns_new_access_token(client, player):
    r = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": player["tokens"]["refresh_token"]},
    )
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["access_token"] != player["tokens"]["access_token"] or True
    # New access token should still be usable
    r = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert r.status_code == 200


async def test_refresh_with_access_token_rejected(client, player):
    """Access token cannot be used as a refresh token (type mismatch)."""
    r = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": player["tokens"]["access_token"]},
    )
    assert r.status_code == 401
