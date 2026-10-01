import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True, slots=True)
class Settings:
    bot_token: str
    webapp_url: str
    database_url: str
    allow_dev_auth: bool
    api_host: str
    api_port: int


def get_settings() -> Settings:
    bot_token = os.getenv("BOT_TOKEN", "").strip()
    webapp_url = os.getenv("WEBAPP_URL", "").strip()
    database_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./workout.db").strip()
    allow_dev_auth = os.getenv("ALLOW_DEV_AUTH", "1").strip() != "0"
    api_host = os.getenv("API_HOST", "0.0.0.0").strip()
    api_port = int(os.getenv("API_PORT", "8080"))

    if not bot_token:
        raise RuntimeError("BOT_TOKEN is not set")
    if not webapp_url:
        raise RuntimeError("WEBAPP_URL is not set")

    return Settings(
        bot_token=bot_token,
        webapp_url=webapp_url,
        database_url=database_url,
        allow_dev_auth=allow_dev_auth,
        api_host=api_host,
        api_port=api_port,
    )
