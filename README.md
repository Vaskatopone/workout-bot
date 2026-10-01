# workout-bot

Telegram-бот учёта тренировок: aiogram 3, SQLAlchemy 2, SQLite и Mini App на React + Tailwind.

## Бэкенд

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m bot.main
```

`/start` сохраняет пользователя и открывает WebApp. API слушает порт `8080`.

## WebApp

```bash
cd webapp
npm install
npm run dev
```

Три вкладки: выбор сплита, запись подходов, история по датам. Тёмная тема Telegram. Если API недоступен, данные сохраняются локально в браузере.

Для продакшена:

```bash
cd webapp && npm run build
```

Бот раздаёт `webapp/dist` с того же порта `8080`. В `.env` укажи HTTPS-URL Mini App (`WEBAPP_URL`).
