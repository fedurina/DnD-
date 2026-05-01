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
    assert "Предыстория" in r.json()["detail"]


async def test_create_rejects_wrong_skill_count(client, player):
    payload = valid_character_payload(chosen_skills=["investigation"])
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400
    assert "ровно" in r.json()["detail"]


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


async def test_character_response_lists_attached_campaigns(client, master, player):
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),
            headers=player["headers"],
        )
    ).json()
    assert char["campaigns"] == []  # newly created — no attachments

    campaign = (
        await client.post(
            "/api/v1/campaigns",
            json={"name": "Лист персонажа знает о кампаниях"},
            headers=master["headers"],
        )
    ).json()
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )

    detail = (
        await client.get(f"/api/v1/characters/{char['id']}", headers=player["headers"])
    ).json()
    assert len(detail["campaigns"]) == 1
    assert detail["campaigns"][0]["id"] == campaign["id"]
    assert detail["campaigns"][0]["name"] == campaign["name"]
    assert detail["campaigns"][0]["needs_attention"] is False


async def test_character_list_marks_needs_attention_per_campaign(client, master, player):
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),  # elf wizard
            headers=player["headers"],
        )
    ).json()
    campaign = (
        await client.post(
            "/api/v1/campaigns",
            json={"name": "Только дварфы", "allowed_races": ["dwarf"]},
            headers=master["headers"],
        )
    ).json()
    # Player joins without character (campaign restriction would block attach with elf).
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )
    # Master tightens — but elf wasn't allowed to begin with, so this is just confirming.
    # Now player edits campaign restrictions? They can't, only master can.
    # Let's instead loosen and attach, then tighten.
    await client.patch(
        f"/api/v1/campaigns/{campaign['id']}",
        json={"allowed_races": []},
        headers=master["headers"],
    )
    await client.patch(
        f"/api/v1/campaigns/{campaign['id']}/character",
        json={"character_id": char["id"]},
        headers=player["headers"],
    )
    # Re-tighten — character now mismatches.
    await client.patch(
        f"/api/v1/campaigns/{campaign['id']}",
        json={"allowed_races": ["dwarf"]},
        headers=master["headers"],
    )

    listing = (await client.get("/api/v1/characters", headers=player["headers"])).json()
    target = next(c for c in listing if c["id"] == char["id"])
    assert len(target["campaigns"]) == 1
    assert target["campaigns"][0]["needs_attention"] is True


async def test_master_can_view_attached_character(client, master, player):
    # player creates a character and joins master's campaign with it
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),
            headers=player["headers"],
        )
    ).json()
    campaign = (
        await client.post(
            "/api/v1/campaigns",
            json={"name": "Просмотр листов мастером"},
            headers=master["headers"],
        )
    ).json()
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )

    r = await client.get(f"/api/v1/characters/{char['id']}", headers=master["headers"])
    assert r.status_code == 200
    assert r.json()["id"] == char["id"]


async def test_owner_can_change_class_with_valid_skills(client, player):
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),
            headers=player["headers"],
        )
    ).json()
    # Switch wizard → fighter, with fighter's allowed skills.
    r = await client.patch(
        f"/api/v1/characters/{char['id']}",
        json={"class_code": "fighter", "chosen_skills": ["acrobatics", "perception"]},
        headers=player["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["class_code"] == "fighter"
    assert r.json()["chosen_skills"] == ["acrobatics", "perception"]


async def test_update_rejects_class_change_without_skill_resync(client, player):
    """Skills from the old class are no longer valid options for the new class."""
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),
            headers=player["headers"],
        )
    ).json()
    # wizard's chosen_skills (investigation/religion) are not in fighter's options.
    r = await client.patch(
        f"/api/v1/characters/{char['id']}",
        json={"class_code": "fighter"},
        headers=player["headers"],
    )
    assert r.status_code == 400


async def test_update_rejects_class_violating_campaign(client, master, player):
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),  # wizard
            headers=player["headers"],
        )
    ).json()
    campaign = (
        await client.post(
            "/api/v1/campaigns",
            json={"name": "Только волшебники", "allowed_classes": ["wizard"]},
            headers=master["headers"],
        )
    ).json()
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )

    # Try to switch to fighter — campaign forbids non-wizards.
    r = await client.patch(
        f"/api/v1/characters/{char['id']}",
        json={"class_code": "fighter", "chosen_skills": ["acrobatics", "perception"]},
        headers=player["headers"],
    )
    assert r.status_code == 400
    assert "Только волшебники" in r.json()["detail"]


async def test_master_can_change_class_within_campaign_restrictions(client, master, player):
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),  # wizard elf sage
            headers=player["headers"],
        )
    ).json()
    campaign = (
        await client.post(
            "/api/v1/campaigns",
            json={
                "name": "Маг или плут",
                "allowed_classes": ["wizard", "rogue"],
            },
            headers=master["headers"],
        )
    ).json()
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )

    # Master switches the character to rogue (allowed) and re-picks rogue skills.
    r = await client.patch(
        f"/api/v1/characters/{char['id']}",
        json={
            "class_code": "rogue",
            "chosen_skills": ["acrobatics", "deception", "stealth", "perception"],
        },
        headers=master["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["class_code"] == "rogue"
    assert len(r.json()["chosen_skills"]) == 4


async def test_master_can_edit_attached_character_name(client, master, player):
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),
            headers=player["headers"],
        )
    ).json()
    campaign = (
        await client.post(
            "/api/v1/campaigns",
            json={"name": "Редактирование мастером"},
            headers=master["headers"],
        )
    ).json()
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )

    r = await client.patch(
        f"/api/v1/characters/{char['id']}",
        json={"name": "Изменено мастером"},
        headers=master["headers"],
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Изменено мастером"


async def test_master_cannot_archive_attached_character(client, master, player):
    """Archiving stays owner-only even if character is in master's campaign."""
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),
            headers=player["headers"],
        )
    ).json()
    campaign = (
        await client.post(
            "/api/v1/campaigns",
            json={"name": "Только владелец архивирует"},
            headers=master["headers"],
        )
    ).json()
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )

    r = await client.post(
        f"/api/v1/characters/{char['id']}/archive", headers=master["headers"]
    )
    assert r.status_code == 404


async def test_master_cannot_delete_attached_character(client, master, player):
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),
            headers=player["headers"],
        )
    ).json()
    campaign = (
        await client.post(
            "/api/v1/campaigns",
            json={"name": "Только владелец удаляет"},
            headers=master["headers"],
        )
    ).json()
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"], "character_id": char["id"]},
        headers=player["headers"],
    )

    r = await client.delete(
        f"/api/v1/characters/{char['id']}", headers=master["headers"]
    )
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
