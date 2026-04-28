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
    },
]

# 2024-rules backgrounds: 3 ability bonuses (+2/+1 or +1/+1/+1), 2 skills, 1 feat.
BACKGROUNDS = [
    {
        "code": "acolyte",
        "name_ru": "Прислужник",
        "description_ru": "Жизнь, посвящённая служению в храме или святилище.",
        "ability_scores": ["int", "wis", "cha"],
        "granted_skills": ["insight", "religion"],
        "feat_ru": "Магический инициат (Жрец)",
    },
    {
        "code": "soldier",
        "name_ru": "Солдат",
        "description_ru": "Армейская служба, тренировки и дисциплина.",
        "ability_scores": ["str", "dex", "con"],
        "granted_skills": ["athletics", "intimidation"],
        "feat_ru": "Свирепый атакующий",
    },
    {
        "code": "criminal",
        "name_ru": "Преступник",
        "description_ru": "Связи в преступном мире и опыт работы вне закона.",
        "ability_scores": ["dex", "con", "int"],
        "granted_skills": ["sleight_of_hand", "stealth"],
        "feat_ru": "Бдительный",
    },
    {
        "code": "sage",
        "name_ru": "Мудрец",
        "description_ru": "Годы учёбы и работы с книгами, свитками и знаниями.",
        "ability_scores": ["con", "int", "wis"],
        "granted_skills": ["arcana", "history"],
        "feat_ru": "Магический инициат (Волшебник)",
    },
    {
        "code": "guard",
        "name_ru": "Стражник",
        "description_ru": "Опыт несения дозора в городе или у важного места.",
        "ability_scores": ["str", "int", "wis"],
        "granted_skills": ["athletics", "perception"],
        "feat_ru": "Бдительный",
    },
]
