from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int] = mapped_column(unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    presets: Mapped[list["WorkoutPreset"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    logs: Mapped[list["WorkoutLog"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class WorkoutPreset(Base):
    __tablename__ = "workout_presets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user: Mapped[User] = relationship(back_populates="presets")
    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="preset",
        cascade="all, delete-orphan",
        order_by="Exercise.position",
    )


class HiddenPreset(Base):
    __tablename__ = "hidden_presets"

    preset_id: Mapped[int] = mapped_column(
        ForeignKey("workout_presets.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)


class HiddenPresetExercise(Base):
    __tablename__ = "hidden_preset_exercises"
    __table_args__ = (UniqueConstraint("preset_id", "exercise_id", name="uq_hidden_preset_exercise"),)

    preset_id: Mapped[int] = mapped_column(
        ForeignKey("workout_presets.id", ondelete="CASCADE"),
        primary_key=True,
    )
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"),
        primary_key=True,
    )


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    preset_id: Mapped[int] = mapped_column(
        ForeignKey("workout_presets.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128))
    position: Mapped[int] = mapped_column(Integer, default=0)

    preset: Mapped[WorkoutPreset] = relationship(back_populates="exercises")
    logs: Mapped[list["WorkoutLog"]] = relationship(
        back_populates="exercise",
        cascade="all, delete-orphan",
    )


class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"),
        index=True,
    )
    logged_on: Mapped[date] = mapped_column(Date)
    weight: Mapped[float] = mapped_column(Float)
    repetitions: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user: Mapped[User] = relationship(back_populates="logs")
    exercise: Mapped[Exercise] = relationship(back_populates="logs")


class WorkoutDuration(Base):
    __tablename__ = "workout_durations"
    __table_args__ = (UniqueConstraint("user_id", "logged_on", name="uq_workout_duration_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    logged_on: Mapped[date] = mapped_column(Date)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_weight: Mapped[float | None] = mapped_column(Float, nullable=True)


class WeightEntry(Base):
    __tablename__ = "weight_entries"
    __table_args__ = (UniqueConstraint("user_id", "logged_on", name="uq_weight_entry_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    logged_on: Mapped[date] = mapped_column(Date)
    weight: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
