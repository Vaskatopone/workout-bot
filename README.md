# workout-bot

Базовый бэкенд Telegram-бота учёта тренировок: aiogram 3, SQLAlchemy 2, SQLite.

## Запуск

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

В `.env` укажите токен бота и HTTPS-URL WebApp (Telegram принимает только `https://`).

```bash
python -m bot.main
```

Команда `/start` сохраняет пользователя в SQLite и отправляет кнопку открытия WebApp.

## Модели

- `User` — пользователь Telegram
- `WorkoutPreset` — пресет тренировки
- `Exercise` — упражнение внутри пресета
- `WorkoutLog` — лог подхода: дата, вес, повторения
