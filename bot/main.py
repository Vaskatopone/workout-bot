import asyncio
import logging

import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from bot.api import create_api
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

    api = create_api(session_factory)
    server = uvicorn.Server(
        uvicorn.Config(
            api,
            host=settings.api_host,
            port=settings.api_port,
            log_level="info",
            loop="none",
        )
    )
    server.install_signal_handlers = False

    try:
        await asyncio.gather(dispatcher.start_polling(bot), server.serve())
    finally:
        await engine.dispose()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
