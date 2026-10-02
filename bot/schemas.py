from datetime import date
import re

from pydantic import BaseModel, Field, field_validator, model_validator


class ExerciseOut(BaseModel):
    id: int
    name: str
    position: int


class PresetOut(BaseModel):
    id: int
    name: str
    description: str | None
    exercises: list[ExerciseOut]


class PresetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=512)
    exercises: list[str] = Field(min_length=1)


class PresetUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=512)
    exercises: list[str] = Field(min_length=1)


class SetIn(BaseModel):
    exercise: str = Field(min_length=1, max_length=128)
    weight: float = Field(ge=0)
    repetitions: int = Field(ge=1, le=1000)


class WorkoutCreate(BaseModel):
    logged_on: date
    preset_name: str = Field(min_length=1, max_length=128)
    sets: list[SetIn] = Field(min_length=1)
    duration_seconds: int = Field(default=0, ge=0, le=86400)


class SetOut(BaseModel):
    id: int
    exercise: str
    weight: float
    repetitions: int


class HistoryDayOut(BaseModel):
    date: date
    preset_name: str | None
    sets: list[SetOut]
    duration_seconds: int | None = None


class WeightEntryOut(BaseModel):
    logged_on: date
    weight: float


class ProfileOut(BaseModel):
    current_weight: float | None
    target_weight: float | None
    weight_entries: list[WeightEntryOut]


class ProfileUpdate(BaseModel):
    current_weight: float | None = Field(default=None, gt=0, le=500)
    target_weight: float | None = Field(default=None, gt=0, le=500)


class WeightEntryCreate(BaseModel):
    logged_on: date
    weight: float = Field(gt=0, le=500)


class SetUpdate(BaseModel):
    weight: float = Field(ge=0)
    repetitions: int = Field(ge=1, le=1000)


class WorkoutDayUpdate(BaseModel):
    logged_on: date
    duration_seconds: int = Field(ge=0, le=86400)


class WeeklyPlanDay(BaseModel):
    weekday: int = Field(ge=0, le=6)
    preset_name: str = Field(min_length=1, max_length=128)


class TrainingPlanUpdate(BaseModel):
    timezone: str = Field(min_length=1, max_length=64)
    reminder_time: str | None = None
    days: list[WeeklyPlanDay] = Field(max_length=7)

    @field_validator("reminder_time")
    @classmethod
    def validate_reminder_time(cls, value: str | None) -> str | None:
        if value is not None and re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value) is None:
            raise ValueError("Reminder time must use HH:MM")
        return value

    @model_validator(mode="after")
    def validate_unique_weekdays(self) -> "TrainingPlanUpdate":
        weekdays = [day.weekday for day in self.days]
        if len(weekdays) != len(set(weekdays)):
            raise ValueError("Each weekday can only have one planned split")
        return self


class TrainingPlanOut(BaseModel):
    timezone: str
    reminder_time: str | None
    days: list[WeeklyPlanDay]
