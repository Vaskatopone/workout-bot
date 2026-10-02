from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from bot.database.models import (
    Exercise,
    HiddenPreset,
    HiddenPresetExercise,
    User,
    UserProfile,
    UserTrainingSettings,
    WeightEntry,
    WorkoutDuration,
    WorkoutLog,
    WorkoutPreset,
    WeeklyPlanEntry,
)


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
        .where(
            WorkoutPreset.user_id == user_id,
            WorkoutPreset.id.not_in(
                select(HiddenPreset.preset_id).where(HiddenPreset.user_id == user_id)
            ),
        )
        .options(selectinload(WorkoutPreset.exercises))
        .order_by(WorkoutPreset.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def list_visible_preset_exercises(session: AsyncSession, preset_id: int) -> list[Exercise]:
    hidden_exercises = select(HiddenPresetExercise.exercise_id).where(
        HiddenPresetExercise.preset_id == preset_id
    )
    result = await session.execute(
        select(Exercise)
        .where(Exercise.preset_id == preset_id, Exercise.id.not_in(hidden_exercises))
        .order_by(Exercise.position)
    )
    return list(result.scalars().all())


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


async def update_preset(
    session: AsyncSession,
    user_id: int,
    preset_id: int,
    name: str,
    description: str | None,
    exercise_names: list[str],
) -> WorkoutPreset | None:
    result = await session.execute(
        select(WorkoutPreset)
        .where(WorkoutPreset.id == preset_id, WorkoutPreset.user_id == user_id)
        .options(selectinload(WorkoutPreset.exercises))
    )
    preset = result.scalar_one_or_none()
    if preset is None:
        return None

    desired_names = list(dict.fromkeys(item.strip() for item in exercise_names if item.strip()))
    if not desired_names:
        return None

    hidden_preset_result = await session.execute(
        select(HiddenPreset).where(HiddenPreset.preset_id == preset_id, HiddenPreset.user_id == user_id)
    )
    hidden_preset = hidden_preset_result.scalar_one_or_none()
    if hidden_preset is not None:
        await session.delete(hidden_preset)

    hidden_result = await session.execute(
        select(HiddenPresetExercise).where(HiddenPresetExercise.preset_id == preset_id)
    )
    hidden_by_id = {item.exercise_id: item for item in hidden_result.scalars().all()}
    existing_by_name = {exercise.name: exercise for exercise in preset.exercises}
    removed_exercises = [
        exercise
        for exercise in preset.exercises
        if exercise.name not in desired_names and exercise.id not in hidden_by_id
    ]
    logged_ids: set[int] = set()
    if removed_exercises:
        log_result = await session.execute(
            select(WorkoutLog.exercise_id)
            .where(WorkoutLog.exercise_id.in_([exercise.id for exercise in removed_exercises]))
            .distinct()
        )
        logged_ids = set(log_result.scalars().all())

    for exercise in removed_exercises:
        if exercise.id in logged_ids:
            session.add(HiddenPresetExercise(preset_id=preset_id, exercise_id=exercise.id))
        else:
            await session.delete(exercise)

    for position, exercise_name in enumerate(desired_names):
        exercise = existing_by_name.get(exercise_name)
        if exercise is None:
            preset.exercises.append(Exercise(name=exercise_name, position=position))
            continue
        exercise.position = position
        hidden_exercise = hidden_by_id.get(exercise.id)
        if hidden_exercise is not None:
            await session.delete(hidden_exercise)

    preset.name = name.strip()
    preset.description = description
    await session.commit()
    return preset


async def hide_preset(session: AsyncSession, user_id: int, preset_id: int) -> bool:
    result = await session.execute(
        select(WorkoutPreset.id).where(WorkoutPreset.id == preset_id, WorkoutPreset.user_id == user_id)
    )
    if result.scalar_one_or_none() is None:
        return False

    hidden_result = await session.execute(select(HiddenPreset).where(HiddenPreset.preset_id == preset_id))
    if hidden_result.scalar_one_or_none() is None:
        session.add(HiddenPreset(preset_id=preset_id, user_id=user_id))
        await session.commit()
    return True


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

    hidden_preset_result = await session.execute(
        select(HiddenPreset).where(HiddenPreset.preset_id == preset.id, HiddenPreset.user_id == user_id)
    )
    hidden_preset = hidden_preset_result.scalar_one_or_none()
    if hidden_preset is not None:
        await session.delete(hidden_preset)

    hidden_result = await session.execute(
        select(HiddenPresetExercise).where(HiddenPresetExercise.preset_id == preset.id)
    )
    hidden_by_id = {item.exercise_id: item for item in hidden_result.scalars().all()}

    existing = {exercise.name: exercise for exercise in preset.exercises}
    next_position = len(preset.exercises)
    for exercise_name in exercise_names:
        clean = exercise_name.strip()
        if clean and clean not in existing:
            exercise = Exercise(name=clean, position=next_position)
            preset.exercises.append(exercise)
            next_position += 1
            existing[clean] = exercise
        elif clean in existing:
            hidden_exercise = hidden_by_id.get(existing[clean].id)
            if hidden_exercise is not None:
                await session.delete(hidden_exercise)
    await session.commit()
    await session.refresh(preset, attribute_names=["exercises"])
    return preset


async def save_workout(
    session: AsyncSession,
    user_id: int,
    logged_on: date,
    preset_name: str,
    sets: list[dict],
    duration_seconds: int = 0,
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
    duration_result = await session.execute(
        select(WorkoutDuration).where(
            WorkoutDuration.user_id == user_id,
            WorkoutDuration.logged_on == logged_on,
        )
    )
    duration_entry = duration_result.scalar_one_or_none()
    if duration_entry is None:
        session.add(
            WorkoutDuration(
                user_id=user_id,
                logged_on=logged_on,
                duration_seconds=duration_seconds,
            )
        )
    else:
        duration_entry.duration_seconds += duration_seconds
    await session.commit()


async def list_history(session: AsyncSession, user_id: int) -> list[WorkoutLog]:
    result = await session.execute(
        select(WorkoutLog)
        .where(WorkoutLog.user_id == user_id)
        .options(selectinload(WorkoutLog.exercise).selectinload(Exercise.preset))
        .order_by(WorkoutLog.logged_on.desc(), WorkoutLog.created_at.asc())
    )
    return list(result.scalars().unique().all())


async def update_workout_set(
    session: AsyncSession,
    user_id: int,
    set_id: int,
    weight: float,
    repetitions: int,
) -> bool:
    result = await session.execute(
        select(WorkoutLog).where(WorkoutLog.id == set_id, WorkoutLog.user_id == user_id)
    )
    workout_set = result.scalar_one_or_none()
    if workout_set is None:
        return False
    workout_set.weight = weight
    workout_set.repetitions = repetitions
    await session.commit()
    return True


async def delete_workout_set(session: AsyncSession, user_id: int, set_id: int) -> bool:
    result = await session.execute(
        select(WorkoutLog).where(WorkoutLog.id == set_id, WorkoutLog.user_id == user_id)
    )
    workout_set = result.scalar_one_or_none()
    if workout_set is None:
        return False
    workout_date = workout_set.logged_on
    await session.delete(workout_set)
    remaining_result = await session.execute(
        select(WorkoutLog.id).where(
            WorkoutLog.user_id == user_id,
            WorkoutLog.logged_on == workout_date,
        ).limit(1)
    )
    if remaining_result.scalar_one_or_none() is None:
        duration_result = await session.execute(
            select(WorkoutDuration).where(
                WorkoutDuration.user_id == user_id,
                WorkoutDuration.logged_on == workout_date,
            )
        )
        duration = duration_result.scalar_one_or_none()
        if duration is not None:
            await session.delete(duration)
    await session.commit()
    return True


async def update_workout_day(
    session: AsyncSession,
    user_id: int,
    logged_on: date,
    new_logged_on: date,
    duration_seconds: int,
) -> bool:
    logs_result = await session.execute(
        select(WorkoutLog).where(
            WorkoutLog.user_id == user_id,
            WorkoutLog.logged_on == logged_on,
        )
    )
    logs = list(logs_result.scalars().all())
    if not logs:
        return False

    duration_result = await session.execute(
        select(WorkoutDuration).where(
            WorkoutDuration.user_id == user_id,
            WorkoutDuration.logged_on == logged_on,
        )
    )
    old_duration = duration_result.scalar_one_or_none()
    destination_result = await session.execute(
        select(WorkoutDuration).where(
            WorkoutDuration.user_id == user_id,
            WorkoutDuration.logged_on == new_logged_on,
        )
    )
    destination_duration = destination_result.scalar_one_or_none() if new_logged_on != logged_on else old_duration

    for workout_set in logs:
        workout_set.logged_on = new_logged_on
    if new_logged_on == logged_on:
        if old_duration is None:
            session.add(
                WorkoutDuration(
                    user_id=user_id,
                    logged_on=logged_on,
                    duration_seconds=duration_seconds,
                )
            )
        else:
            old_duration.duration_seconds = duration_seconds
    else:
        if old_duration is not None:
            await session.delete(old_duration)
        if destination_duration is None:
            session.add(
                WorkoutDuration(
                    user_id=user_id,
                    logged_on=new_logged_on,
                    duration_seconds=duration_seconds,
                )
            )
        else:
            destination_duration.duration_seconds += duration_seconds
    await session.commit()
    return True


async def list_workout_durations(session: AsyncSession, user_id: int) -> dict[date, int]:
    result = await session.execute(
        select(WorkoutDuration.logged_on, WorkoutDuration.duration_seconds).where(
            WorkoutDuration.user_id == user_id
        )
    )
    return {logged_on: duration_seconds for logged_on, duration_seconds in result.all()}


async def get_training_plan(session: AsyncSession, user_id: int) -> dict:
    settings_result = await session.execute(
        select(UserTrainingSettings).where(UserTrainingSettings.user_id == user_id)
    )
    settings = settings_result.scalar_one_or_none()
    days_result = await session.execute(
        select(WeeklyPlanEntry).where(WeeklyPlanEntry.user_id == user_id).order_by(WeeklyPlanEntry.weekday)
    )
    return {
        "timezone": settings.timezone if settings else "UTC",
        "reminder_time": settings.reminder_time if settings else None,
        "days": [
            {"weekday": day.weekday, "preset_name": day.preset_name}
            for day in days_result.scalars().all()
        ],
    }


async def update_training_plan(
    session: AsyncSession,
    user_id: int,
    timezone_name: str,
    reminder_time: str | None,
    days: list[dict],
) -> dict:
    settings_result = await session.execute(
        select(UserTrainingSettings).where(UserTrainingSettings.user_id == user_id)
    )
    settings = settings_result.scalar_one_or_none()
    if settings is None:
        settings = UserTrainingSettings(user_id=user_id, timezone=timezone_name, reminder_time=reminder_time)
        session.add(settings)
    else:
        settings.timezone = timezone_name
        settings.reminder_time = reminder_time
        settings.last_reminded_on = None

    existing_result = await session.execute(
        select(WeeklyPlanEntry).where(WeeklyPlanEntry.user_id == user_id)
    )
    existing = {entry.weekday: entry for entry in existing_result.scalars().all()}
    requested = {day["weekday"]: day["preset_name"].strip() for day in days}
    for weekday, entry in existing.items():
        if weekday not in requested:
            await session.delete(entry)
        else:
            entry.preset_name = requested[weekday]
    for weekday, preset_name in requested.items():
        if weekday not in existing:
            session.add(WeeklyPlanEntry(
                user_id=user_id,
                weekday=weekday,
                preset_name=preset_name,
            ))
    await session.commit()
    return await get_training_plan(session, user_id)


async def list_due_training_reminders(
    session: AsyncSession,
    now: datetime | None = None,
) -> list[dict]:
    current = now or datetime.now(timezone.utc)
    result = await session.execute(
        select(User.telegram_id, User.first_name, UserTrainingSettings, WeeklyPlanEntry)
        .join(UserTrainingSettings, UserTrainingSettings.user_id == User.id)
        .join(WeeklyPlanEntry, WeeklyPlanEntry.user_id == User.id)
        .where(UserTrainingSettings.reminder_time.is_not(None))
    )
    due = []
    for telegram_id, first_name, settings, plan in result.all():
        local_now = current.astimezone(ZoneInfo(settings.timezone))
        if plan.weekday != local_now.weekday() or settings.last_reminded_on == local_now.date():
            continue
        scheduled = time.fromisoformat(settings.reminder_time)
        scheduled_at = datetime.combine(local_now.date(), scheduled, tzinfo=local_now.tzinfo)
        if timedelta(0) <= local_now - scheduled_at <= timedelta(minutes=5):
            due.append({
                "telegram_id": telegram_id,
                "first_name": first_name,
                "preset_name": plan.preset_name,
                "local_date": local_now.date(),
            })
    return due


async def mark_training_reminder_processed(
    session: AsyncSession,
    telegram_id: int,
    local_date: date,
) -> None:
    result = await session.execute(
        select(UserTrainingSettings)
        .join(User, UserTrainingSettings.user_id == User.id)
        .where(User.telegram_id == telegram_id)
    )
    settings = result.scalar_one_or_none()
    if settings is not None:
        settings.last_reminded_on = local_date
        await session.commit()


async def delete_workout_day(session: AsyncSession, user_id: int, logged_on: date) -> None:
    await session.execute(
        delete(WorkoutLog).where(
            WorkoutLog.user_id == user_id,
            WorkoutLog.logged_on == logged_on,
        )
    )
    await session.execute(
        delete(WorkoutDuration).where(
            WorkoutDuration.user_id == user_id,
            WorkoutDuration.logged_on == logged_on,
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
