from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from bot.database.models import Exercise, User, WorkoutLog, WorkoutPreset


async def get_or_create_user(
    session: AsyncSession,
    telegram_id: int,
    username: str | None,
    first_name: str | None,
) -> User:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    if user.username != username or user.first_name != first_name:
        user.username = username
        user.first_name = first_name
        await session.commit()
        await session.refresh(user)

    return user


async def list_presets(session: AsyncSession, user_id: int) -> list[WorkoutPreset]:
    result = await session.execute(
        select(WorkoutPreset)
        .where(WorkoutPreset.user_id == user_id)
        .options(selectinload(WorkoutPreset.exercises))
        .order_by(WorkoutPreset.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def create_preset(
    session: AsyncSession,
    user_id: int,
    name: str,
    description: str | None,
    exercise_names: list[str],
) -> WorkoutPreset:
    preset = WorkoutPreset(user_id=user_id, name=name.strip(), description=description)
    preset.exercises = [
        Exercise(name=item.strip(), position=index)
        for index, item in enumerate(exercise_names)
        if item.strip()
    ]
    session.add(preset)
    await session.commit()
    await session.refresh(preset, attribute_names=["exercises"])
    return preset


async def get_or_create_preset_with_exercises(
    session: AsyncSession,
    user_id: int,
    name: str,
    exercise_names: list[str],
) -> WorkoutPreset:
    result = await session.execute(
        select(WorkoutPreset)
        .where(WorkoutPreset.user_id == user_id, WorkoutPreset.name == name)
        .options(selectinload(WorkoutPreset.exercises))
    )
    preset = result.scalar_one_or_none()
    if preset is None:
        return await create_preset(session, user_id, name, None, exercise_names)

    existing = {exercise.name for exercise in preset.exercises}
    next_position = len(preset.exercises)
    for exercise_name in exercise_names:
        clean = exercise_name.strip()
        if clean and clean not in existing:
            preset.exercises.append(Exercise(name=clean, position=next_position))
            next_position += 1
            existing.add(clean)
    await session.commit()
    await session.refresh(preset, attribute_names=["exercises"])
    return preset


async def save_workout(
    session: AsyncSession,
    user_id: int,
    logged_on: date,
    preset_name: str,
    sets: list[dict],
) -> None:
    exercise_names = [item["exercise"] for item in sets]
    preset = await get_or_create_preset_with_exercises(session, user_id, preset_name, exercise_names)
    by_name = {exercise.name: exercise for exercise in preset.exercises}

    for item in sets:
        exercise = by_name[item["exercise"]]
        session.add(
            WorkoutLog(
                user_id=user_id,
                exercise_id=exercise.id,
                logged_on=logged_on,
                weight=item["weight"],
                repetitions=item["repetitions"],
            )
        )
    await session.commit()


async def list_history(session: AsyncSession, user_id: int) -> list[WorkoutLog]:
    result = await session.execute(
        select(WorkoutLog)
        .where(WorkoutLog.user_id == user_id)
        .options(selectinload(WorkoutLog.exercise).selectinload(Exercise.preset))
        .order_by(WorkoutLog.logged_on.desc(), WorkoutLog.created_at.asc())
    )
    return list(result.scalars().unique().all())
