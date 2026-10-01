from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo


def webapp_keyboard(url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть тренировки",
                    web_app=WebAppInfo(url=url),
                )
            ]
        ]
    )
