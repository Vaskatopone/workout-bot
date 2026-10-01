import hashlib
import hmac
import json
from urllib.parse import parse_qsl

from fastapi import Header, HTTPException


def parse_init_data(init_data: str, bot_token: str) -> dict:
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", "")
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not received_hash or not hmac.compare_digest(calculated, received_hash):
        raise HTTPException(status_code=401, detail="Invalid Telegram init data")

    user_raw = parsed.get("user")
    if not user_raw:
        raise HTTPException(status_code=401, detail="Telegram user is missing")
    return json.loads(user_raw)


async def resolve_telegram_user(
    x_telegram_init_data: str | None = Header(default=None),
    x_dev_telegram_id: int | None = Header(default=None),
) -> dict:
    from bot.config import get_settings

    settings = get_settings()
    if x_telegram_init_data:
        user = parse_init_data(x_telegram_init_data, settings.bot_token)
        return {
            "telegram_id": int(user["id"]),
            "username": user.get("username"),
            "first_name": user.get("first_name"),
        }

    if settings.allow_dev_auth and x_dev_telegram_id:
        return {
            "telegram_id": int(x_dev_telegram_id),
            "username": "dev",
            "first_name": "Dev",
        }

    raise HTTPException(status_code=401, detail="Telegram authorization required")
