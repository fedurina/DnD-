## DnD Manager

Веб-приложение для D&D 5.5e (2024) — создаёт персонажей по правилам и помогает мастеру вести кампанию: ограничения по расам/классам/уровню, инвайты по коду, привязка персонажей к партии. Cправочник внутри.

Фишки:
- Визард создания персонажа на 10 шагов с живым превью листа.
- Кнопка «🎲 Случайный» — генерит валидного персонажа целиком; перебрасывать сколько угодно, пока не понравится.
- Экспорт листа в PDF поверх официального шаблона 2024 года (с кириллицей через NotoSans, шрифт встраивается субсетом).
- PWA-режим: можно поставить как приложение, справочники кэшируются и работают офлайн.
- Кампании: мастер задаёт ограничения, игроки заходят по 8-значному коду; если мастер позже ужесточит правила — у несоответствующих персонажей подсветится `Требует доработки`.

### Стек

- Бэк: FastAPI, Pydantic v2, SQLAlchemy 2.0 (async) + asyncpg, Alembic, python-jose, bcrypt, pytest.
- Фронт: React 18 + TypeScript, Vite, react-router v6, Zustand, vite-plugin-pwa, pdf-lib (+fontkit) для PDF.
- БД: PostgreSQL 16 (отдельные `dnd` и `dnd_test`).
- Всё крутится в Docker Compose — на хост ставить ничего не надо, кроме самого Docker.


### Проект

```
backend/
├── app/api/v1/        # роутеры FastAPI
├── app/services/      # бизнес-логика, доменные исключения
├── app/models/        # SQLAlchemy
├── app/schemas/       # Pydantic
├── app/data/srd_55.py # сид справочников D&D
└── alembic/versions/  # миграции

frontend/
├── src/api/           # обёртки над fetch (одна на ресурс)
├── src/store/         # Zustand: auth + refs
├── src/pages/         # по странице на маршрут
├── src/pages/wizard/  # шаги визарда + случайная генерация
├── src/lib/dnd.ts     # формулы D&D (модификаторы, бонус мастерства, HP)
└── src/lib/pdfExport/ # экспорт в PDF (грузится лениво)
```
### Запуск

```bash
cp .env.example .env
# в .env подставить JWT_SECRET — сгенерировать можно так:
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

docker compose up -d --build
```

- фронт — http://localhost:5173
- API — http://localhost:8000
- Swagger — http://localhost:8000/docs

При первом старте бэка миграции прогоняются автоматически. Чтобы налить справочные данные D&D (расы, классы, предыстории, черты, предметы):

```bash
docker compose exec backend python -m app.scripts.seed_refs
```

Скрипт идемпотентный — повторный запуск ничего не ломает, делает UPSERT.

### Тесты

```bash
docker compose exec backend pytest          # все
docker compose exec backend pytest tests/test_characters.py::test_create_with_subclass_succeeds  # один
```

Тестовая база `dnd_test` создаётся автоматически при первом запуске.

### Миграции

```bash
docker compose exec backend alembic revision --autogenerate -m "сообщение"
docker compose exec backend alembic upgrade head
docker compose exec backend alembic downgrade -1
```

Если автогенерация добавляет `NOT NULL` к существующей таблице — править миграцию руками: добавить `server_default`, прогнать `op.alter_column(... server_default=None)` после бэкфилла. Шаблон лежит в `alembic/versions/fd96880601ac_*.py`.
