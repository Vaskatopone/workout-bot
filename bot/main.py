import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from bot.config import get_settings
from bot.database.engine import create_engine, create_session_factory, init_db
from bot.handlers import setup_routers


async def main() -> None:
    logging.basicConfig(level=logging.INFO)

    settings = get_settings()
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    await init_db(engine)

    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher()
    dispatcher["session_factory"] = session_factory
    dispatcher["settings"] = settings
    dispatcher.include_router(setup_routers())

    try:
        await dispatcher.start_polling(bot)
    finally:
        await engine.dispose()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
