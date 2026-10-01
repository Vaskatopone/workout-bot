from datetime import date

from pydantic import BaseModel, Field


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


class SetOut(BaseModel):
    exercise: str
    weight: float
    repetitions: int


class HistoryDayOut(BaseModel):
    date: date
    preset_name: str | None
    sets: list[SetOut]


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
