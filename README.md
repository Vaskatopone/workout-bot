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

`/start` сохраняет пользователя и открывает WebApp. API слушает порт `8080`. По умолчанию локально используется SQLite.

## WebApp

```bash
cd webapp
npm install
npm run dev
```

Четыре вкладки: выбор сплита, запись подходов, история тренировок и профиль Telegram с ежедневным отслеживанием веса. Тёмная тема Telegram. Если API недоступен, данные сохраняются локально в браузере.

Для продакшена:

```bash
cd webapp && npm run build
```

Бот раздаёт `webapp/dist` с того же порта `8080`. В `.env` укажи HTTPS-URL Mini App (`WEBAPP_URL`).

## Render

Для деплоя через Blueprint используй `render.yaml`. Укажи `BOT_TOKEN` и `WEBAPP_URL` в переменных окружения Render. Если сервис уже создан вручную, установи Build Command из `render.yaml` и Start Command `python -m bot.main`; команда `npm` сама по себе не запускает приложение.

### Постоянная база данных

Файловая система Render эфемерна, поэтому SQLite-файл внутри сервиса теряется при пересоздании контейнера. Для бесплатного варианта создай постоянный PostgreSQL-проект в [Neon](https://neon.com/), скопируй connection string и добавь её в Render → **Environment** как `DATABASE_URL`. Используй pooled connection string из Neon; не добавляй её в Git. Neon Free включает до 1 ГБ на проект и автоматически приостанавливает compute при простое, сохраняя данные. Для SQLite на Render нужен платный Persistent Disk.

В `render.yaml` переменная `DATABASE_URL` запрошена без значения. Для уже созданного вручную Render-сервиса добавь её в Dashboard и запусти redeploy. Данные, уже потерянные при предыдущих пересозданиях SQLite-контейнера, восстановить этим изменением нельзя.

## GitHub Pages

Workflow публикует `webapp/dist` на GitHub Pages при push в `main`. В Settings → Pages выбери источник GitHub Actions. Добавь переменную репозитория `VITE_API_BASE_URL` с базовым HTTPS-адресом backend на Render, чтобы WebApp отправлял API-запросы на backend.
