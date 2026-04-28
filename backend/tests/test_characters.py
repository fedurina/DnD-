from tests.conftest import valid_character_payload


async def test_create_valid_character(client, player):
    r = await client.post(
        "/api/v1/characters",
        json=valid_character_payload(),
        headers=player["headers"],
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["name"] == "Тестовый"
    assert data["race_code"] == "elf"
    assert data["class_code"] == "wizard"
    assert data["level"] == 1
    assert data["is_archived"] is False


async def test_create_rejects_non_standard_array(client, player):
    payload = valid_character_payload(
        ability_scores={"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
    )
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 422


async def test_create_rejects_skill_overlap_with_background(client, player):
    # sage grants arcana + history; choosing arcana again must fail
    payload = valid_character_payload(chosen_skills=["arcana", "history"])
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400
    assert "Background" in r.json()["detail"]


async def test_create_rejects_wrong_skill_count(client, player):
    payload = valid_character_payload(chosen_skills=["investigation"])
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400
    assert "exactly" in r.json()["detail"]


async def test_create_rejects_skill_outside_class_options(client, player):
    payload = valid_character_payload(chosen_skills=["athletics", "intimidation"])
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400


async def test_create_rejects_bg_bonus_on_invalid_ability(client, player):
    # sage allows con/int/wis; str is invalid
    payload = valid_character_payload(background_bonuses={"str": 2, "cha": 1})
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400


async def test_create_rejects_bg_bonus_wrong_sum(client, player):
    payload = valid_character_payload(background_bonuses={"int": 1, "wis": 1})
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 422


async def test_create_accepts_1_1_1_distribution(client, player):
    payload = valid_character_payload(
        background_bonuses={"con": 1, "int": 1, "wis": 1},
    )
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 201


async def test_list_excludes_archived_by_default(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]
    await client.post(f"/api/v1/characters/{cid}/archive", headers=player["headers"])

    r = await client.get("/api/v1/characters", headers=player["headers"])
    assert [c["id"] for c in r.json()] == []

    r = await client.get(
        "/api/v1/characters?include_archived=true", headers=player["headers"]
    )
    assert [c["id"] for c in r.json()] == [cid]


async def test_archive_then_unarchive(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]

    r = await client.post(f"/api/v1/characters/{cid}/archive", headers=player["headers"])
    assert r.status_code == 200
    assert r.json()["is_archived"] is True

    r = await client.post(f"/api/v1/characters/{cid}/unarchive", headers=player["headers"])
    assert r.status_code == 200
    assert r.json()["is_archived"] is False


async def test_update_name_and_alignment(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]
    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={"name": "Лиэлла", "alignment": "neutral_good"},
        headers=player["headers"],
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Лиэлла"
    assert r.json()["alignment"] == "neutral_good"


async def test_update_rejects_unknown_alignment(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]
    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={"alignment": "very_chaotic"},
        headers=player["headers"],
    )
    assert r.status_code == 422


async def test_get_character_of_other_user_returns_404(client, player, player2):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]

    r = await client.get(f"/api/v1/characters/{cid}", headers=player2["headers"])
    assert r.status_code == 404


async def test_delete_character(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]

    r = await client.delete(f"/api/v1/characters/{cid}", headers=player["headers"])
    assert r.status_code == 204

    r = await client.get(f"/api/v1/characters/{cid}", headers=player["headers"])
    assert r.status_code == 404
