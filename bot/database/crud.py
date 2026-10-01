from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from bot.database.models import Exercise, User, UserProfile, WeightEntry, WorkoutLog, WorkoutPreset


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


async def delete_workout_day(session: AsyncSession, user_id: int, logged_on: date) -> None:
    await session.execute(
        delete(WorkoutLog).where(
            WorkoutLog.user_id == user_id,
            WorkoutLog.logged_on == logged_on,
        )
    )
    await session.commit()


async def get_user_profile(session: AsyncSession, user_id: int) -> dict:
    profile_result = await session.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    entries_result = await session.execute(
        select(WeightEntry)
        .where(WeightEntry.user_id == user_id)
        .order_by(WeightEntry.logged_on.desc())
    )
    entries = entries_result.scalars().all()
    return {
        "current_weight": profile.current_weight if profile else None,
        "target_weight": profile.target_weight if profile else None,
        "weight_entries": [{"logged_on": entry.logged_on, "weight": entry.weight} for entry in entries],
    }


async def update_user_profile(
    session: AsyncSession,
    user_id: int,
    current_weight: float | None,
    target_weight: float | None,
) -> dict:
    result = await session.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(
            user_id=user_id,
            current_weight=current_weight,
            target_weight=target_weight,
        )
        session.add(profile)
    else:
        profile.current_weight = current_weight
        profile.target_weight = target_weight
    await session.commit()
    return await get_user_profile(session, user_id)


async def save_weight_entry(
    session: AsyncSession,
    user_id: int,
    logged_on: date,
    weight: float,
) -> dict:
    latest_date_result = await session.execute(
        select(WeightEntry.logged_on)
        .where(WeightEntry.user_id == user_id)
        .order_by(WeightEntry.logged_on.desc())
        .limit(1)
    )
    latest_date = latest_date_result.scalar_one_or_none()
    update_current_weight = latest_date is None or logged_on >= latest_date

    profile_result = await session.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    if profile is None:
        session.add(
            UserProfile(
                user_id=user_id,
                current_weight=weight if update_current_weight else None,
            )
        )
    elif update_current_weight:
        profile.current_weight = weight

    entry_result = await session.execute(
        select(WeightEntry).where(
            WeightEntry.user_id == user_id,
            WeightEntry.logged_on == logged_on,
        )
    )
    entry = entry_result.scalar_one_or_none()
    if entry is None:
        session.add(WeightEntry(user_id=user_id, logged_on=logged_on, weight=weight))
    else:
        entry.weight = weight
    await session.commit()
    return await get_user_profile(session, user_id)
