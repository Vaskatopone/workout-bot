import asyncio
import logging
from html import escape

import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from bot.api import create_api
from bot.config import get_settings
from bot.database.engine import create_engine, create_session_factory, init_db
from bot.database.crud import list_due_training_reminders, mark_training_reminder_processed
from bot.handlers import setup_routers


async def send_training_reminders(
    bot: Bot,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    logger = logging.getLogger(__name__)
    while True:
        try:
            async with session_factory() as session:
                due = await list_due_training_reminders(session)
            for reminder in due:
                try:
                    first_name = escape(reminder["first_name"] or "Привет")
                    preset_name = escape(reminder["preset_name"])
                    await bot.send_message(
                        reminder["telegram_id"],
                        f"{first_name}, сегодня по плану тренировка «{preset_name}». Пора начинать! 💪",
                    )
                except Exception:
                    logger.exception(
                        "Could not send training reminder to Telegram user %s",
                        reminder["telegram_id"],
                    )
                    async with session_factory() as session:
                        await mark_training_reminder_processed(
                            session,
                            reminder["telegram_id"],
                            reminder["local_date"],
                        )
                    continue
                async with session_factory() as session:
                    await mark_training_reminder_processed(
                        session,
                        reminder["telegram_id"],
                        reminder["local_date"],
                    )
        except Exception:
            logger.exception("Training reminder scheduler iteration failed")
        await asyncio.sleep(30)


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
    reminders = asyncio.create_task(send_training_reminders(bot, session_factory))

    try:
        await asyncio.gather(dispatcher.start_polling(bot), server.serve())
    finally:
        reminders.cancel()
        await asyncio.gather(reminders, return_exceptions=True)
        await engine.dispose()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
