"""MVP seed data for D&D 5.5e (2024).

Subset only — extend later. Identifiers are English codes used as PKs;
display names/descriptions are in Russian.
"""

ABILITIES = [
    {"code": "str", "name_ru": "Сила", "short_ru": "СИЛ"},
    {"code": "dex", "name_ru": "Ловкость", "short_ru": "ЛОВ"},
    {"code": "con", "name_ru": "Телосложение", "short_ru": "ТЕЛ"},
    {"code": "int", "name_ru": "Интеллект", "short_ru": "ИНТ"},
    {"code": "wis", "name_ru": "Мудрость", "short_ru": "МУД"},
    {"code": "cha", "name_ru": "Харизма", "short_ru": "ХАР"},
]

SKILLS = [
    {"code": "acrobatics", "name_ru": "Акробатика", "ability_code": "dex"},
    {"code": "animal_handling", "name_ru": "Уход за животными", "ability_code": "wis"},
    {"code": "arcana", "name_ru": "Магия", "ability_code": "int"},
    {"code": "athletics", "name_ru": "Атлетика", "ability_code": "str"},
    {"code": "deception", "name_ru": "Обман", "ability_code": "cha"},
    {"code": "history", "name_ru": "История", "ability_code": "int"},
    {"code": "insight", "name_ru": "Проницательность", "ability_code": "wis"},
    {"code": "intimidation", "name_ru": "Запугивание", "ability_code": "cha"},
    {"code": "investigation", "name_ru": "Анализ", "ability_code": "int"},
    {"code": "medicine", "name_ru": "Медицина", "ability_code": "wis"},
    {"code": "nature", "name_ru": "Природа", "ability_code": "int"},
    {"code": "perception", "name_ru": "Внимательность", "ability_code": "wis"},
    {"code": "performance", "name_ru": "Выступление", "ability_code": "cha"},
    {"code": "persuasion", "name_ru": "Убеждение", "ability_code": "cha"},
    {"code": "religion", "name_ru": "Религия", "ability_code": "int"},
    {"code": "sleight_of_hand", "name_ru": "Ловкость рук", "ability_code": "dex"},
    {"code": "stealth", "name_ru": "Скрытность", "ability_code": "dex"},
    {"code": "survival", "name_ru": "Выживание", "ability_code": "wis"},
]

RACES = [
    {
        "code": "human",
        "name_ru": "Человек",
        "description_ru": (
            "Самый адаптивный и многочисленный из видов. "
            "Люди встречаются на всех континентах и среди всех культур."
        ),
        "size": "medium",
        "speed": 30,
        "traits": [
            {"name_ru": "Находчивость", "description_ru": "Преимущество против испуга."},
            {"name_ru": "Опытный", "description_ru": "Владение одним навыком на выбор."},
        ],
    },
    {
        "code": "elf",
        "name_ru": "Эльф",
        "description_ru": "Долгоживущий народ, чтящий природу и магию.",
        "size": "medium",
        "speed": 30,
        "traits": [
            {"name_ru": "Тёмное зрение", "description_ru": "Видит при тусклом свете на 60 футов."},
            {"name_ru": "Чуткие чувства", "description_ru": "Владение Внимательностью."},
            {"name_ru": "Транс", "description_ru": "Не нуждается в полноценном сне."},
        ],
    },
    {
        "code": "dwarf",
        "name_ru": "Дварф",
        "description_ru": "Крепкий народ горных твердынь, известный мастерством и упорством.",
        "size": "medium",
        "speed": 30,
        "traits": [
            {"name_ru": "Тёмное зрение", "description_ru": "Видит при тусклом свете на 60 футов."},
            {"name_ru": "Стойкость дварфов", "description_ru": "Преимущество против яда."},
            {"name_ru": "Знаток камня", "description_ru": "Удвоенный бонус мастерства при работе с камнем."},
        ],
    },
    {
        "code": "halfling",
        "name_ru": "Полурослик",
        "description_ru": "Маленький, но удачливый народ, ценящий уют и общину.",
        "size": "small",
        "speed": 30,
        "traits": [
            {"name_ru": "Удачливый", "description_ru": "Перебрасывает 1 на d20 для атаки, проверки или спасброска."},
            {"name_ru": "Храбрый", "description_ru": "Преимущество против испуга."},
            {"name_ru": "Проворный", "description_ru": "Может проходить через места существ большего размера."},
        ],
    },
    {
        "code": "tiefling",
        "name_ru": "Тифлинг",
        "description_ru": "Потомки людей, чья родословная связана с Нижними планами.",
        "size": "medium",
        "speed": 30,
        "traits": [
            {"name_ru": "Тёмное зрение", "description_ru": "Видит при тусклом свете на 60 футов."},
            {"name_ru": "Адское наследие", "description_ru": "Сопротивление к одному типу урона на выбор (огонь/яд/некротический)."},
            {"name_ru": "Дьявольская магия", "description_ru": "Доступ к заговору и заклинаниям из родословной."},
        ],
    },
]

# Items first (referenced by classes/backgrounds via code).
ITEMS = [
    # Weapons
    {"code": "dagger", "name_ru": "Кинжал", "description_ru": "Лёгкое колющее оружие ближнего боя.", "type": "weapon", "cost_gp": 2},
    {"code": "shortsword", "name_ru": "Короткий меч", "description_ru": "Лёгкое колющее оружие ближнего боя.", "type": "weapon", "cost_gp": 10},
    {"code": "rapier", "name_ru": "Рапира", "description_ru": "Колющее оружие ближнего боя средней руки.", "type": "weapon", "cost_gp": 25},
    {"code": "longsword", "name_ru": "Длинный меч", "description_ru": "Универсальное рубящее оружие ближнего боя.", "type": "weapon", "cost_gp": 15},
    {"code": "greataxe", "name_ru": "Секира", "description_ru": "Тяжёлое двуручное рубящее оружие.", "type": "weapon", "cost_gp": 30},
    {"code": "mace", "name_ru": "Булава", "description_ru": "Дробящее оружие ближнего боя.", "type": "weapon", "cost_gp": 5},
    {"code": "quarterstaff", "name_ru": "Боевой посох", "description_ru": "Универсальное дробящее оружие.", "type": "weapon", "cost_gp": 2},
    {"code": "longbow", "name_ru": "Длинный лук", "description_ru": "Дальнобойное оружие.", "type": "weapon", "cost_gp": 50},
    {"code": "shortbow", "name_ru": "Короткий лук", "description_ru": "Лёгкое дальнобойное оружие.", "type": "weapon", "cost_gp": 25},
    {"code": "light_crossbow", "name_ru": "Лёгкий арбалет", "description_ru": "Дальнобойное оружие, заряжается рукой.", "type": "weapon", "cost_gp": 25},
    {"code": "javelin", "name_ru": "Метательное копьё", "description_ru": "Лёгкое метательное оружие.", "type": "weapon", "cost_gp": 0.5},
    # Ammunition
    {"code": "arrow", "name_ru": "Стрела", "description_ru": "Боеприпасы для лука.", "type": "ammunition", "cost_gp": 0.05},
    {"code": "bolt", "name_ru": "Болт", "description_ru": "Боеприпасы для арбалета.", "type": "ammunition", "cost_gp": 0.05},
    # Armor
    {"code": "leather_armor", "name_ru": "Кожаный доспех", "description_ru": "Лёгкий доспех, КД 11 + мод. Ловкости.", "type": "armor", "cost_gp": 10},
    {"code": "scale_mail", "name_ru": "Чешуйчатый доспех", "description_ru": "Средний доспех, КД 14 + мод. Ловкости (макс. 2).", "type": "armor", "cost_gp": 50},
    {"code": "chain_mail", "name_ru": "Кольчуга", "description_ru": "Тяжёлый доспех, КД 16. Помехи скрытности.", "type": "armor", "cost_gp": 75},
    {"code": "shield", "name_ru": "Щит", "description_ru": "+2 к КД, занимает руку.", "type": "armor", "cost_gp": 10},
    # Kits / Packs
    {"code": "explorers_pack", "name_ru": "Набор путешественника", "description_ru": "Рюкзак, спальник, рацион и прочие походные принадлежности.", "type": "kit", "cost_gp": 10},
    {"code": "scholars_pack", "name_ru": "Набор учёного", "description_ru": "Книга знаний, чернила, перо, пергамент, мешочек с песком.", "type": "kit", "cost_gp": 40},
    {"code": "dungeoneers_pack", "name_ru": "Набор подземельщика", "description_ru": "Лом, молоток, факелы, верёвка и трутница.", "type": "kit", "cost_gp": 12},
    {"code": "priests_pack", "name_ru": "Набор жреца", "description_ru": "Чаша для подаяния, ладан, облачение, свечи.", "type": "kit", "cost_gp": 19},
    {"code": "burglars_pack", "name_ru": "Набор взломщика", "description_ru": "Воровские инструменты, ломик, мешочек с шариками.", "type": "kit", "cost_gp": 16},
    {"code": "entertainers_pack", "name_ru": "Набор артиста", "description_ru": "Костюм, грим, две марионетки.", "type": "kit", "cost_gp": 40},
    # Tools / Foci
    {"code": "thieves_tools", "name_ru": "Воровские инструменты", "description_ru": "Отмычки, щупы, ножницы для взлома.", "type": "tool", "cost_gp": 25},
    {"code": "holy_symbol", "name_ru": "Священный символ", "description_ru": "Эмблема веры, фокусирует божественную магию.", "type": "tool", "cost_gp": 5},
    {"code": "arcane_focus", "name_ru": "Магический фокус", "description_ru": "Кристалл, жезл или посох — фокусирует тайную магию.", "type": "tool", "cost_gp": 10},
    {"code": "spellbook", "name_ru": "Книга заклинаний", "description_ru": "Том для записи и подготовки заклинаний.", "type": "tool", "cost_gp": 50},
    {"code": "component_pouch", "name_ru": "Мешочек компонентов", "description_ru": "Хранит материальные компоненты заклинаний.", "type": "tool", "cost_gp": 25},
    {"code": "musical_instrument", "name_ru": "Музыкальный инструмент", "description_ru": "Лютня, флейта или другое — для бардов и артистов.", "type": "tool", "cost_gp": 35},
    {"code": "healers_kit", "name_ru": "Набор целителя", "description_ru": "10 применений: стабилизирует умирающее существо.", "type": "tool", "cost_gp": 5},
]

# Origin feats granted by backgrounds (one-to-one), plus a few general feats and fighting styles for browsing.
FEATS = [
    # ---- Origin feats (granted by backgrounds) ----
    {
        "code": "magic_initiate_wizard",
        "name_ru": "Магический инициат (Волшебник)",
        "description_ru": "Вы изучаете два заговора волшебника и одно заклинание 1 круга, которое можно сотворять раз в день без слота.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },
    {
        "code": "magic_initiate_cleric",
        "name_ru": "Магический инициат (Жрец)",
        "description_ru": "Вы изучаете два заговора жреца и одно заклинание 1 круга, которое можно сотворять раз в день без слота.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },
    {
        "code": "savage_attacker",
        "name_ru": "Свирепый атакующий",
        "description_ru": "Раз в ход вы можете перебросить кости урона рукопашной атаки и взять любой результат.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },
    {
        "code": "alert",
        "name_ru": "Бдительный",
        "description_ru": "+бонус мастерства к инициативе, и существа не получают преимущества на скрытные атаки против вас.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },
    {
        "code": "musician",
        "name_ru": "Музыкант",
        "description_ru": "Владение тремя музыкальными инструментами; ваша игра вдохновляет союзников.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },
    {
        "code": "lucky",
        "name_ru": "Везунчик",
        "description_ru": "Имеете 3 очка удачи в день для перебрасывания d20 на атаках, проверках или спасбросках.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },
    {
        "code": "skilled",
        "name_ru": "Умелый",
        "description_ru": "Вы получаете владение тремя любыми навыками или инструментами на ваш выбор.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": True,
    },
    {
        "code": "tough",
        "name_ru": "Крепкий",
        "description_ru": "Ваш максимум хитов увеличивается на 2 за каждый уровень персонажа.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },
    {
        "code": "healer",
        "name_ru": "Лекарь",
        "description_ru": "Использование набора целителя восстанавливает существу 1d6 + бонус мастерства хитов.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },
    {
        "code": "crafter",
        "name_ru": "Ремесленник",
        "description_ru": "Владение набором ремесленника на выбор; крафт быстрее и дешевле.",
        "category": "origin",
        "prerequisites_ru": None,
        "is_repeatable": False,
    },

    # ---- General feats (level 4+) ----
    {
        "code": "ability_score_improvement",
        "name_ru": "Улучшение характеристики",
        "description_ru": "Увеличьте одну характеристику на 2 или две на 1 (до 20).",
        "category": "general",
        "prerequisites_ru": "Уровень 4+",
        "is_repeatable": True,
    },
    {
        "code": "great_weapon_master",
        "name_ru": "Мастер большого оружия",
        "description_ru": "При попадании тяжёлым оружием вы можете нанести дополнительный урон, равный бонусу мастерства.",
        "category": "general",
        "prerequisites_ru": "Уровень 4+, владение тяжёлым оружием",
        "is_repeatable": False,
    },
    {
        "code": "war_caster",
        "name_ru": "Военный заклинатель",
        "description_ru": "Преимущество на спасброски концентрации; сотворение заклинаний с занятыми руками.",
        "category": "general",
        "prerequisites_ru": "Уровень 4+, способность сотворять заклинания",
        "is_repeatable": False,
    },
    {
        "code": "sentinel",
        "name_ru": "Часовой",
        "description_ru": "Враг при атаке возможности останавливается; вы можете атаковать врагов, атакующих союзников.",
        "category": "general",
        "prerequisites_ru": "Уровень 4+",
        "is_repeatable": False,
    },
    {
        "code": "mobile",
        "name_ru": "Подвижный",
        "description_ru": "+10 фт к скорости; не вызываете провокацию у атакованного существа в этот ход.",
        "category": "general",
        "prerequisites_ru": "Уровень 4+",
        "is_repeatable": False,
    },

    # ---- Fighting styles ----
    {
        "code": "fs_defense",
        "name_ru": "Боевой стиль: Защита",
        "description_ru": "+1 к КД, пока вы носите доспех.",
        "category": "fighting_style",
        "prerequisites_ru": "Класс с доступом к боевому стилю",
        "is_repeatable": False,
    },
    {
        "code": "fs_dueling",
        "name_ru": "Боевой стиль: Дуэлянт",
        "description_ru": "+2 к урону, когда держите оружие средней руки и нет другого оружия в другой руке.",
        "category": "fighting_style",
        "prerequisites_ru": "Класс с доступом к боевому стилю",
        "is_repeatable": False,
    },
    {
        "code": "fs_archery",
        "name_ru": "Боевой стиль: Стрельба",
        "description_ru": "+2 к броскам атаки дальнобойным оружием.",
        "category": "fighting_style",
        "prerequisites_ru": "Класс с доступом к боевому стилю",
        "is_repeatable": False,
    },
    {
        "code": "fs_great_weapon",
        "name_ru": "Боевой стиль: Сражение большим оружием",
        "description_ru": "Перебрасываете 1 и 2 на кубиках урона при двуручном оружии.",
        "category": "fighting_style",
        "prerequisites_ru": "Класс с доступом к боевому стилю",
        "is_repeatable": False,
    },
    {
        "code": "fs_two_weapon",
        "name_ru": "Боевой стиль: Бой с двумя оружиями",
        "description_ru": "Добавляете модификатор характеристики к урону вторым оружием.",
        "category": "fighting_style",
        "prerequisites_ru": "Класс с доступом к боевому стилю",
        "is_repeatable": False,
    },
    {
        "code": "fs_protection",
        "name_ru": "Боевой стиль: Защитник",
        "description_ru": "Реакцией с щитом накладываете помеху на атаку врага по союзнику в 5 фт.",
        "category": "fighting_style",
        "prerequisites_ru": "Класс с доступом к боевому стилю",
        "is_repeatable": False,
    },
]

CLASSES = [
    {
        "code": "barbarian",
        "name_ru": "Варвар",
        "description_ru": "Неистовый воин, черпающий силу в первобытной ярости.",
        "hit_die": 12,
        "primary_abilities": ["str"],
        "saving_throw_abilities": ["str", "con"],
        "skill_choices_count": 2,
        "skill_options": [
            "animal_handling", "athletics", "intimidation",
            "nature", "perception", "survival",
        ],
        "starting_equipment": [
            {"code": "greataxe", "qty": 1},
            {"code": "javelin", "qty": 4},
            {"code": "explorers_pack", "qty": 1},
        ],
        "starting_gold_alt": 75,
        "subclass_start_level": 3,
    },
    {
        "code": "cleric",
        "name_ru": "Жрец",
        "description_ru": "Проводник божественной воли, способный исцелять и карать.",
        "hit_die": 8,
        "primary_abilities": ["wis"],
        "saving_throw_abilities": ["wis", "cha"],
        "skill_choices_count": 2,
        "skill_options": [
            "history", "insight", "medicine", "persuasion", "religion",
        ],
        "starting_equipment": [
            {"code": "scale_mail", "qty": 1},
            {"code": "shield", "qty": 1},
            {"code": "mace", "qty": 1},
            {"code": "holy_symbol", "qty": 1},
            {"code": "priests_pack", "qty": 1},
        ],
        "starting_gold_alt": 110,
        "subclass_start_level": 3,
    },
    {
        "code": "fighter",
        "name_ru": "Воин",
        "description_ru": "Мастер оружия и тактики, гибкий боевой класс.",
        "hit_die": 10,
        "primary_abilities": ["str", "dex"],
        "saving_throw_abilities": ["str", "con"],
        "skill_choices_count": 2,
        "skill_options": [
            "acrobatics", "animal_handling", "athletics", "history",
            "insight", "intimidation", "perception", "persuasion", "survival",
        ],
        "starting_equipment": [
            {"code": "chain_mail", "qty": 1},
            {"code": "longsword", "qty": 1},
            {"code": "shield", "qty": 1},
            {"code": "light_crossbow", "qty": 1},
            {"code": "bolt", "qty": 20},
            {"code": "dungeoneers_pack", "qty": 1},
        ],
        "starting_gold_alt": 155,
        "subclass_start_level": 3,
    },
    {
        "code": "rogue",
        "name_ru": "Плут",
        "description_ru": "Скрытный специалист по точным ударам и взлому замков.",
        "hit_die": 8,
        "primary_abilities": ["dex"],
        "saving_throw_abilities": ["dex", "int"],
        "skill_choices_count": 4,
        "skill_options": [
            "acrobatics", "athletics", "deception", "insight",
            "intimidation", "investigation", "perception", "performance",
            "persuasion", "sleight_of_hand", "stealth",
        ],
        "starting_equipment": [
            {"code": "leather_armor", "qty": 1},
            {"code": "rapier", "qty": 1},
            {"code": "shortbow", "qty": 1},
            {"code": "arrow", "qty": 20},
            {"code": "dagger", "qty": 2},
            {"code": "thieves_tools", "qty": 1},
            {"code": "burglars_pack", "qty": 1},
        ],
        "starting_gold_alt": 100,
        "subclass_start_level": 3,
    },
    {
        "code": "wizard",
        "name_ru": "Волшебник",
        "description_ru": "Учёный заклинатель, изучающий магию через книги и формулы.",
        "hit_die": 6,
        "primary_abilities": ["int"],
        "saving_throw_abilities": ["int", "wis"],
        "skill_choices_count": 2,
        "skill_options": [
            "arcana", "history", "insight", "investigation",
            "medicine", "nature", "religion",
        ],
        "starting_equipment": [
            {"code": "quarterstaff", "qty": 1},
            {"code": "spellbook", "qty": 1},
            {"code": "arcane_focus", "qty": 1},
            {"code": "scholars_pack", "qty": 1},
        ],
        "starting_gold_alt": 55,
        "subclass_start_level": 3,
    },
]

# Subclasses (one per class for MVP). Picked starting at class.subclass_start_level.
SUBCLASSES = [
    {
        "code": "berserker",
        "class_code": "barbarian",
        "name_ru": "Берсерк",
        "description_ru": (
            "Путь чистой ярости и разрушения. Берсерк может войти в бешенство, "
            "получая бонусы к урону и сопротивление физическому урону, но рискует "
            "истощиться от перенапряжения."
        ),
    },
    {
        "code": "life_domain",
        "class_code": "cleric",
        "name_ru": "Домен Жизни",
        "description_ru": (
            "Жрецы домена Жизни сосредоточены на положительной энергии, "
            "исцелении и поддержке союзников. Получают улучшенные заклинания "
            "лечения и владение тяжёлой бронёй."
        ),
    },
    {
        "code": "champion",
        "class_code": "fighter",
        "name_ru": "Чемпион",
        "description_ru": (
            "Идеал физического совершенства. Чемпион полагается на силу, "
            "стойкость и точность: расширенный диапазон критических попаданий "
            "и улучшенный атлетизм."
        ),
    },
    {
        "code": "thief",
        "class_code": "rogue",
        "name_ru": "Вор",
        "description_ru": (
            "Классический специалист по проникновению и кражам. Вор быстрее "
            "лазает, использует инструменты бонусным действием и со временем "
            "получает скорость хитрого ловкача."
        ),
    },
    {
        "code": "evocation",
        "class_code": "wizard",
        "name_ru": "Школа Воплощения",
        "description_ru": (
            "Волшебники этой школы создают мощные заклинания урона. Изученное "
            "Воплощение позволяет щадить союзников при взрывах, а на высоких "
            "уровнях — добавлять модификатор интеллекта к урону."
        ),
    },
]

# 2024-rules backgrounds: 3 ability bonuses (+2/+1 or +1/+1/+1), 2 skills, 1 origin feat.
BACKGROUNDS = [
    {
        "code": "acolyte",
        "name_ru": "Прислужник",
        "description_ru": "Жизнь, посвящённая служению в храме или святилище.",
        "ability_scores": ["int", "wis", "cha"],
        "granted_skills": ["insight", "religion"],
        "feat_code": "magic_initiate_cleric",
        "starting_equipment": [
            {"code": "holy_symbol", "qty": 1},
            {"code": "priests_pack", "qty": 1},
        ],
        "starting_gold_alt": 50,
    },
    {
        "code": "soldier",
        "name_ru": "Солдат",
        "description_ru": "Армейская служба, тренировки и дисциплина.",
        "ability_scores": ["str", "dex", "con"],
        "granted_skills": ["athletics", "intimidation"],
        "feat_code": "savage_attacker",
        "starting_equipment": [
            {"code": "javelin", "qty": 2},
            {"code": "explorers_pack", "qty": 1},
        ],
        "starting_gold_alt": 50,
    },
    {
        "code": "criminal",
        "name_ru": "Преступник",
        "description_ru": "Связи в преступном мире и опыт работы вне закона.",
        "ability_scores": ["dex", "con", "int"],
        "granted_skills": ["sleight_of_hand", "stealth"],
        "feat_code": "alert",
        "starting_equipment": [
            {"code": "thieves_tools", "qty": 1},
            {"code": "burglars_pack", "qty": 1},
            {"code": "dagger", "qty": 2},
        ],
        "starting_gold_alt": 16,
    },
    {
        "code": "sage",
        "name_ru": "Мудрец",
        "description_ru": "Годы учёбы и работы с книгами, свитками и знаниями.",
        "ability_scores": ["con", "int", "wis"],
        "granted_skills": ["arcana", "history"],
        "feat_code": "magic_initiate_wizard",
        "starting_equipment": [
            {"code": "scholars_pack", "qty": 1},
            {"code": "spellbook", "qty": 1},
        ],
        "starting_gold_alt": 50,
    },
    {
        "code": "guard",
        "name_ru": "Стражник",
        "description_ru": "Опыт несения дозора в городе или у важного места.",
        "ability_scores": ["str", "int", "wis"],
        "granted_skills": ["athletics", "perception"],
        "feat_code": "alert",
        "starting_equipment": [
            {"code": "shortsword", "qty": 1},
            {"code": "explorers_pack", "qty": 1},
        ],
        "starting_gold_alt": 50,
    },
]
