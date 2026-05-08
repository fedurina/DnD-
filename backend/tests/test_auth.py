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


async def test_register_password_without_digit_rejected(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "noweak@test.com",
            "username": "noweak",
            "password": "onlyletters",
            "role": "player",
        },
    )
    assert r.status_code == 422


async def test_register_password_without_letter_rejected(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "nodigits@test.com",
            "username": "nodigits",
            "password": "12345678",
            "role": "player",
        },
    )
    assert r.status_code == 422


async def test_register_common_password_rejected(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "common@test.com",
            "username": "common",
            "password": "Password1",
            "role": "player",
        },
    )
    # «password1» есть в чёрном списке (нечувствительно к регистру)
    assert r.status_code == 422


async def test_login_returns_access_token_and_sets_cookie(client, player):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice@test.com", "password": "alicepass1"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" not in data  # refresh теперь хранится в куке
    assert data["token_type"] == "bearer"
    assert "refresh_token" in r.cookies


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


async def test_refresh_with_cookie_returns_new_access_token(client, player):
    # У `client` уже есть refresh-кука после логина в фикстуре.
    r = await client.post("/api/v1/auth/refresh")
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    # Новый access-токен должен быть рабочим.
    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me.status_code == 200


async def test_refresh_without_cookie_returns_401(client):
    r = await client.post("/api/v1/auth/refresh")
    assert r.status_code == 401


async def test_refresh_rotates_token_old_one_is_revoked(client, player):
    # Запоминаем исходную refresh-куку.
    old = client.cookies.get("refresh_token")
    assert old

    # Первый refresh проходит; jti старой куки отзывается.
    r1 = await client.post("/api/v1/auth/refresh")
    assert r1.status_code == 200

    # Подсовываем *старую* куку и снова дёргаем refresh — должен упасть.
    client.cookies.clear()
    client.cookies.set("refresh_token", old, domain="test", path="/api/v1/auth")
    r2 = await client.post("/api/v1/auth/refresh")
    assert r2.status_code == 401


async def test_logout_revokes_refresh_cookie(client, player):
    # Logout очищает куку и отзывает серверное состояние.
    r = await client.post("/api/v1/auth/logout")
    assert r.status_code == 204

    # У того же клиента больше нет рабочей refresh-куки.
    r = await client.post("/api/v1/auth/refresh")
    assert r.status_code == 401
