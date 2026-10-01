from collections import defaultdict

from datetime import date

from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from bot.database.crud import (
    create_preset,
    delete_workout_day,
    get_user_profile,
    get_or_create_user,
    list_history,
    list_presets,
    save_weight_entry,
    save_workout,
    update_user_profile,
)
from bot.schemas import (
    HistoryDayOut,
    PresetCreate,
    PresetOut,
    ProfileOut,
    ProfileUpdate,
    SetOut,
    WeightEntryCreate,
    WorkoutCreate,
)
from bot.telegram_webapp import resolve_telegram_user


def create_api(session_factory: async_sessionmaker[AsyncSession]) -> FastAPI:
    app = FastAPI(title="Workout WebApp API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    async def db_user(telegram_user: dict = Depends(resolve_telegram_user)):
        async with session_factory() as session:
            user = await get_or_create_user(
                session,
                telegram_id=telegram_user["telegram_id"],
                username=telegram_user.get("username"),
                first_name=telegram_user.get("first_name"),
            )
            yield session, user

    @app.get("/api/health")
    async def health() -> dict:
        return {"ok": True}

    @app.get("/api/profile", response_model=ProfileOut)
    async def get_profile(ctx=Depends(db_user)) -> ProfileOut:
        session, user = ctx
        return await get_user_profile(session, user.id)

    @app.put("/api/profile", response_model=ProfileOut)
    async def put_profile(payload: ProfileUpdate, ctx=Depends(db_user)) -> ProfileOut:
        session, user = ctx
        return await update_user_profile(
            session,
            user.id,
            payload.current_weight,
            payload.target_weight,
        )

    @app.post("/api/weights", response_model=ProfileOut)
    async def post_weight_entry(payload: WeightEntryCreate, ctx=Depends(db_user)) -> ProfileOut:
        session, user = ctx
        return await save_weight_entry(session, user.id, payload.logged_on, payload.weight)

    @app.get("/api/presets", response_model=list[PresetOut])
    async def get_presets(ctx=Depends(db_user)) -> list[PresetOut]:
        session, user = ctx
        presets = await list_presets(session, user.id)
        return [
            PresetOut(
                id=preset.id,
                name=preset.name,
                description=preset.description,
                exercises=[
                    {"id": exercise.id, "name": exercise.name, "position": exercise.position}
                    for exercise in sorted(preset.exercises, key=lambda item: item.position)
                ],
            )
            for preset in presets
        ]

    @app.post("/api/presets", response_model=PresetOut)
    async def post_preset(payload: PresetCreate, ctx=Depends(db_user)) -> PresetOut:
        session, user = ctx
        preset = await create_preset(
            session,
            user.id,
            payload.name,
            payload.description,
            payload.exercises,
        )
        return PresetOut(
            id=preset.id,
            name=preset.name,
            description=preset.description,
            exercises=[
                {"id": exercise.id, "name": exercise.name, "position": exercise.position}
                for exercise in sorted(preset.exercises, key=lambda item: item.position)
            ],
        )

    @app.get("/api/history", response_model=list[HistoryDayOut])
    async def get_history(ctx=Depends(db_user)) -> list[HistoryDayOut]:
        session, user = ctx
        logs = await list_history(session, user.id)
        grouped: dict = defaultdict(list)
        names: dict = {}
        for log in logs:
            grouped[log.logged_on].append(
                SetOut(
                    exercise=log.exercise.name,
                    weight=log.weight,
                    repetitions=log.repetitions,
                )
            )
            names[log.logged_on] = log.exercise.preset.name
        return [
            HistoryDayOut(date=day, preset_name=names[day], sets=sets)
            for day, sets in grouped.items()
        ]

    @app.delete("/api/history/{logged_on}", status_code=204)
    async def delete_history_day(logged_on: date, ctx=Depends(db_user)) -> Response:
        session, user = ctx
        await delete_workout_day(session, user.id, logged_on)
        return Response(status_code=204)

    @app.post("/api/workouts")
    async def post_workout(payload: WorkoutCreate, ctx=Depends(db_user)) -> dict:
        session, user = ctx
        await save_workout(
            session,
            user.id,
            payload.logged_on,
            payload.preset_name,
            [item.model_dump() for item in payload.sets],
        )
        return {"ok": True}

    from pathlib import Path

    dist = Path(__file__).resolve().parent.parent / "webapp" / "dist"
    if dist.exists():
        app.mount("/", StaticFiles(directory=dist, html=True), name="webapp")

    return app
