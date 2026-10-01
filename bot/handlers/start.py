from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from bot.config import Settings
from bot.database.crud import get_or_create_user
from bot.keyboards.webapp import webapp_keyboard

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, session_factory: async_sessionmaker[AsyncSession], settings: Settings) -> None:
    if message.from_user is None:
        return

    async with session_factory() as session:
        await get_or_create_user(
            session=session,
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            first_name=message.from_user.first_name,
        )

    await message.answer(
        "Привет! Я бот учёта тренировок.\nНажми кнопку, чтобы открыть приложение.",
        reply_markup=webapp_keyboard(settings.webapp_url),
    )
