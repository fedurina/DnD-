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
    # «sage» даёт arcana + history; выбор arcana ещё раз должен упасть
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
    # «sage» позволяет con/int/wis; str недопустим
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


async def test_create_rejects_missing_origin_feat(client, player):
    # изначальная черта «sage» — "magic_initiate_wizard"; в сообщении об ошибке — русское имя.
    payload = valid_character_payload(feats=[])
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400
    assert "Магический инициат" in r.json()["detail"]


async def test_create_rejects_unknown_feat_code(client, player):
    payload = valid_character_payload(feats=["magic_initiate_wizard", "totally_made_up_feat"])
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400
    assert "Неизвестные черты" in r.json()["detail"]


async def test_create_rejects_unknown_item_code(client, player):
    payload = valid_character_payload(items=[{"code": "imaginary_sword", "qty": 1}])
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400
    assert "Неизвестные предметы" in r.json()["detail"]


async def test_create_rejects_duplicate_item_code(client, player):
    payload = valid_character_payload(
        items=[{"code": "dagger", "qty": 1}, {"code": "dagger", "qty": 2}],
    )
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400
    assert "дважды" in r.json()["detail"]


async def test_update_revalidates_feats_on_bg_change(client, player):
    # Создаём персонажа с предысторией «sage» (изначальная черта: magic_initiate_wizard).
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    assert create.status_code == 201, create.text
    cid = create.json()["id"]

    # Переключаемся на «criminal» (изначальная черта: alert), не обновляя список черт —
    # текущий список (черта от sage) не удовлетворяет новой предыстории.
    # Бонусы и навыки обновляем заодно, чтобы не упасть на более ранних валидаторах.
    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={
            "background_code": "criminal",
            "background_bonuses": {"dex": 1, "con": 1, "int": 1},
        },
        headers=player["headers"],
    )
    assert r.status_code == 400, r.text
    # изначальная черта «criminal» — "alert" → «Бдительный» по-русски
    assert "Бдительный" in r.json()["detail"]


async def test_update_bg_change_with_matching_feats_succeeds(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]

    # «acolyte» требует magic_initiate_cleric; «criminal» — alert.
    # Меняем предысторию И черты одновременно.
    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={
            "background_code": "criminal",
            "background_bonuses": {"dex": 1, "con": 1, "int": 1},
            "chosen_skills": ["investigation", "religion"],
            "feats": ["alert"],
        },
        headers=player["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["feats"] == ["alert"]


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
    # Игрок присоединяется без персонажа (ограничения кампании заблокировали бы прикрепление эльфа).
    await client.post(
        "/api/v1/campaigns/join",
        json={"invite_code": campaign["invite_code"]},
        headers=player["headers"],
    )
    # Мастер ужесточает — но эльф изначально и так не был разрешён, так что это просто подтверждение.
    # А может игрок сам поменять ограничения кампании? Нет, это может только мастер.
    # Поэтому сначала ослабляем и прикрепляем, затем ужесточаем.
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
    # Снова ужесточаем — теперь персонаж не подходит.
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
    # игрок создаёт персонажа и присоединяется с ним к кампании мастера
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
    # Переключаем волшебника → воина с допустимыми для воина навыками.
    r = await client.patch(
        f"/api/v1/characters/{char['id']}",
        json={"class_code": "fighter", "chosen_skills": ["acrobatics", "perception"]},
        headers=player["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["class_code"] == "fighter"
    assert r.json()["chosen_skills"] == ["acrobatics", "perception"]


async def test_update_rejects_class_change_without_skill_resync(client, player):
    """Навыки старого класса не подходят как варианты для нового класса."""
    char = (
        await client.post(
            "/api/v1/characters",
            json=valid_character_payload(),
            headers=player["headers"],
        )
    ).json()
    # навыки волшебника (investigation/religion) не входят в варианты для воина.
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

    # Пытаемся переключиться на воина — кампания запрещает всех, кроме волшебников.
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

    # Мастер переключает персонажа на плута (разрешён) и заново выбирает навыки плута.
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
    """Архивирование остаётся доступно только владельцу, даже если персонаж — в кампании мастера."""
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


# --------------------------------------------------- уровни и подклассы


async def test_create_low_level_does_not_require_subclass(client, player):
    payload = valid_character_payload(level=2)
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 201, r.text
    assert r.json()["level"] == 2
    assert r.json()["subclass_code"] is None


async def test_create_high_level_requires_subclass(client, player):
    payload = valid_character_payload(level=3)
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400, r.text
    assert "архетип" in r.json()["detail"].lower()


async def test_create_with_subclass_succeeds(client, player):
    payload = valid_character_payload(level=3, subclass_code="evocation")
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 201, r.text
    assert r.json()["subclass_code"] == "evocation"


async def test_create_rejects_subclass_at_low_level(client, player):
    payload = valid_character_payload(level=1, subclass_code="evocation")
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400, r.text
    assert "уровня" in r.json()["detail"].lower()


async def test_create_rejects_subclass_for_other_class(client, player):
    payload = valid_character_payload(
        level=3, subclass_code="champion"  # подкласс воина на волшебнике
    )
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400, r.text


async def test_create_rejects_unknown_subclass(client, player):
    payload = valid_character_payload(level=3, subclass_code="ghost_school")
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 400


async def test_create_rejects_level_out_of_range(client, player):
    payload = valid_character_payload(level=21)
    r = await client.post("/api/v1/characters", json=payload, headers=player["headers"])
    assert r.status_code == 422


async def test_update_level_up_to_3_requires_subclass(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]

    r = await client.patch(
        f"/api/v1/characters/{cid}", json={"level": 3}, headers=player["headers"]
    )
    assert r.status_code == 400, r.text
    assert "архетип" in r.json()["detail"].lower()


async def test_update_level_with_subclass_succeeds(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]

    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={"level": 3, "subclass_code": "evocation"},
        headers=player["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["level"] == 3
    assert r.json()["subclass_code"] == "evocation"


async def test_update_level_down_clears_subclass(client, player):
    create = await client.post(
        "/api/v1/characters",
        json=valid_character_payload(level=3, subclass_code="evocation"),
        headers=player["headers"],
    )
    cid = create.json()["id"]

    r = await client.patch(
        f"/api/v1/characters/{cid}", json={"level": 2}, headers=player["headers"]
    )
    assert r.status_code == 200, r.text
    assert r.json()["level"] == 2
    assert r.json()["subclass_code"] is None


async def test_update_class_change_resets_subclass(client, player):
    # Старт: волшебник 3 уровня с подклассом evocation.
    create = await client.post(
        "/api/v1/characters",
        json=valid_character_payload(level=3, subclass_code="evocation"),
        headers=player["headers"],
    )
    cid = create.json()["id"]

    # Переключаемся на воина, не присылая новый подкласс — старый (evocation) был
    # волшебника и должен быть сброшен, но воин на 3-м уровне всё равно требует подкласс.
    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={
            "class_code": "fighter",
            "background_code": "soldier",
            "background_bonuses": {"str": 2, "con": 1},
            "chosen_skills": ["acrobatics", "perception"],
            "feats": ["savage_attacker"],
        },
        headers=player["headers"],
    )
    assert r.status_code == 400, r.text
    assert "архетип" in r.json()["detail"].lower()


async def test_update_class_change_with_new_subclass_succeeds(client, player):
    create = await client.post(
        "/api/v1/characters",
        json=valid_character_payload(level=3, subclass_code="evocation"),
        headers=player["headers"],
    )
    cid = create.json()["id"]

    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={
            "class_code": "fighter",
            "subclass_code": "champion",
            "background_code": "soldier",
            "background_bonuses": {"str": 2, "con": 1},
            "chosen_skills": ["acrobatics", "perception"],
            "feats": ["savage_attacker"],
        },
        headers=player["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["class_code"] == "fighter"
    assert r.json()["subclass_code"] == "champion"


async def test_subclasses_endpoint_filters_by_class(client, player):
    r = await client.get(
        "/api/v1/refs/subclasses?class_code=wizard", headers=player["headers"]
    )
    assert r.status_code == 200
    codes = [s["code"] for s in r.json()]
    assert "evocation" in codes
    assert "champion" not in codes


# --------------------------------------------------- трекер хитов


async def test_create_starts_with_full_hp_and_no_temp(client, player):
    """По умолчанию current_hp = NULL (= «при полном здоровье»), temp_hp = 0."""
    r = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["current_hp"] is None
    assert data["temp_hp"] == 0


async def test_update_sets_current_and_temp_hp(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]
    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={"current_hp": 4, "temp_hp": 5},
        headers=player["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["current_hp"] == 4
    assert r.json()["temp_hp"] == 5


async def test_update_rejects_negative_hp(client, player):
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]
    r = await client.patch(
        f"/api/v1/characters/{cid}", json={"current_hp": -1}, headers=player["headers"]
    )
    assert r.status_code == 422


async def test_level_up_does_not_clamp_current_hp(client, player):
    """При level-up максимум растёт; current_hp остаётся как был, не клампится вниз."""
    create = await client.post(
        "/api/v1/characters", json=valid_character_payload(), headers=player["headers"]
    )
    cid = create.json()["id"]
    # Wizard d6 + CON 13 (mod +1) на 1 уровне → max = 6 + 1 = 7. Раним до 3.
    await client.patch(
        f"/api/v1/characters/{cid}", json={"current_hp": 3}, headers=player["headers"]
    )
    # Поднимаем до 3 уровня: max растёт, current_hp=3 валиден и сохраняется.
    r = await client.patch(
        f"/api/v1/characters/{cid}",
        json={"level": 3, "subclass_code": "evocation"},
        headers=player["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["current_hp"] == 3


async def test_level_down_clamps_current_hp_to_new_max(client, player):
    """При снижении уровня current_hp клампится к новому (меньшему) максимуму."""
    create = await client.post(
        "/api/v1/characters",
        json=valid_character_payload(level=3, subclass_code="evocation"),
        headers=player["headers"],
    )
    cid = create.json()["id"]
    # Wizard на 3 уровне с CON 13 (+1): max = 6 + 1 + 2*(4 + 1) = 17. Лечимся до 17.
    await client.patch(
        f"/api/v1/characters/{cid}", json={"current_hp": 17}, headers=player["headers"]
    )
    # Снижаемся до 1 уровня: max = 7, current_hp должен прижаться к 7.
    r = await client.patch(
        f"/api/v1/characters/{cid}", json={"level": 1}, headers=player["headers"]
    )
    assert r.status_code == 200, r.text
    assert r.json()["current_hp"] == 7
