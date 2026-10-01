from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.engine import make_url

from bot.database.models import Base


def create_engine(database_url: str) -> AsyncEngine:
    url = make_url(database_url)
    if url.drivername in {"postgres", "postgresql", "postgresql+asyncpg"}:
        query = dict(url.query)
        ssl_mode = query.pop("sslmode", None)
        query.pop("channel_binding", None)
        if ssl_mode and "ssl" not in query:
            query["ssl"] = ssl_mode
        drivername = "postgresql+asyncpg" if url.drivername in {"postgres", "postgresql"} else url.drivername
        url = url.set(drivername=drivername, query=query)
    return create_async_engine(url, echo=False)


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def session_scope(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session
