from tests.conftest import valid_character_payload


async def _make_character(client, headers, **overrides):
    r = await client.post(
        "/api/v1/characters",
        json=valid_character_payload(**overrides),
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _make_campaign(client, headers, **overrides):
    payload = {
        "name": "Тени над Невервинтером",
        "description": "Городское расследование",
        "allowed_races": [],
        "allowed_classes": [],
        "max_level": 20,
    }
    payload.update(overrides)
    r = await client.post("/api/v1/campaigns", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


async def test_player_cannot_create_campaign(client, player):
    r = await client.post(
        "/api/v1/campaigns",
        json={"name": "Моя игра"},
        headers=player["headers"],
    )
    # Pydantic min_length=3 passes, then service raises CampaignPermissionError
    assert r.status_code == 403


async def test_master_creates_campaign_with_invite_code(client, master):
    campaign = await _make_campaign(client, master["headers"])
    assert len(campaign["invite_code"]) == 8
    assert campaign["allowed_races"] == []
    assert campaign["max_level"] == 20


async def test_player_joins_by_code(client, master, player):
    campaign = await _make_campaign(client, master["headers"])

    r = await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )
    assert r.status_code == 200
    assert r.json()["id"] == campaign["id"]


async def test_join_with_invalid_code_returns_404(client, player):
    r = await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": "ZZZZZZZZ"},
        headers=player["headers"],
    )
    assert r.status_code == 404


async def test_player_cannot_join_twice(client, master, player):
    campaign = await _make_campaign(client, master["headers"])
    code = campaign["invite_code"]

    r1 = await client.post(
        "/api/v1/campaigns/join", json={"invite_code": code}, headers=player["headers"]
    )
    assert r1.status_code == 200

    r2 = await client.post(
        "/api/v1/campaigns/join", json={"invite_code": code}, headers=player["headers"]
    )
    assert r2.status_code == 400


async def test_master_cannot_join_own_campaign(client, master):
    campaign = await _make_campaign(client, master["headers"])
    r = await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=master["headers"],
    )
    assert r.status_code == 400


async def test_attach_blocked_by_race_restriction(client, master, player):
    campaign = await _make_campaign(
        client, master["headers"], allowed_races=["human", "halfling"]
    )
    # elf wizard from default factory — not allowed
    char = await _make_character(client, player["headers"])

    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )

    r = await client.patch(
        f"/api/v1/campaigns/{campaign['id']}/character",
        json={"character_id": char["id"]},
        headers=player["headers"],
    )
    assert r.status_code == 400
    assert "elf" in r.json()["detail"]


async def test_attach_blocked_by_class_restriction(client, master, player):
    campaign = await _make_campaign(
        client, master["headers"], allowed_classes=["fighter", "rogue"]
    )
    char = await _make_character(client, player["headers"])  # wizard

    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )

    r = await client.patch(
        f"/api/v1/campaigns/{campaign['id']}/character",
        json={"character_id": char["id"]},
        headers=player["headers"],
    )
    assert r.status_code == 400
    assert "wizard" in r.json()["detail"]


async def test_join_with_eligible_character(client, master, player):
    campaign = await _make_campaign(
        client,
        master["headers"],
        allowed_races=["elf"],
        allowed_classes=["wizard"],
    )
    char = await _make_character(client, player["headers"])

    r = await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )
    assert r.status_code == 200


async def test_player_view_hides_invite_code(client, master, player):
    campaign = await _make_campaign(client, master["headers"])
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )

    detail = (await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=player["headers"])).json()
    assert detail["invite_code"] == ""

    detail = (await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=master["headers"])).json()
    assert detail["invite_code"] == campaign["invite_code"]


async def test_regenerate_invite_invalidates_old(client, master, player):
    campaign = await _make_campaign(client, master["headers"])
    old_code = campaign["invite_code"]

    r = await client.post(
        f"/api/v1/campaigns/{campaign['id']}/regenerate-invite",
        headers=master["headers"],
    )
    assert r.status_code == 200
    new_code = r.json()["invite_code"]
    assert new_code != old_code

    # Old code rejected
    r = await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": old_code},
        headers=player["headers"],
    )
    assert r.status_code == 404


async def test_kick_member(client, master, player):
    campaign = await _make_campaign(client, master["headers"])
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )

    r = await client.delete(
        f"/api/v1/campaigns/{campaign['id']}/members/{player['user']['id']}",
        headers=master["headers"],
    )
    assert r.status_code == 204

    detail = (await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=master["headers"])).json()
    assert detail["members"] == []


async def test_player_cannot_kick(client, master, player, player2):
    campaign = await _make_campaign(client, master["headers"])
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player2["headers"],
    )

    r = await client.delete(
        f"/api/v1/campaigns/{campaign['id']}/members/{player2['user']['id']}",
        headers=player["headers"],
    )
    assert r.status_code == 403


async def test_lists_separate_owned_and_joined(client, master, player):
    campaign = await _make_campaign(client, master["headers"])
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )

    bob = (await client.get("/api/v1/campaigns", headers=master["headers"])).json()
    assert len(bob["owned"]) == 1
    assert len(bob["joined"]) == 0

    alice = (await client.get("/api/v1/campaigns", headers=player["headers"])).json()
    assert len(alice["owned"]) == 0
    assert len(alice["joined"]) == 1
