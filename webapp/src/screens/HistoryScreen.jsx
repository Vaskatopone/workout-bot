import { useEffect, useState } from "react";
import { haptic } from "../telegram.js";

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
  });
}

function toISODate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDuration(value) {
  const totalSeconds = Number(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export default function HistoryScreen({ history, onDelete, onEditDay, onEditSet, onDeleteSet }) {
  const [openDate, setOpenDate] = useState(history[0]?.date ?? null);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [editingDay, setEditingDay] = useState(null);
  const [editingSet, setEditingSet] = useState(null);
  const [editError, setEditError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (history[0] && !history.some((day) => day.date === openDate)) {
      setOpenDate(history[0].date);
    }
  }, [history, openDate]);

  const totalSets = history.reduce((total, day) => total + day.sets.length, 0);
  const totalVolume = history.reduce(
    (total, day) => total + day.sets.reduce((dayTotal, set) => dayTotal + set.weight * set.repetitions, 0),
    0,
  );
  const exerciseNames = [...new Set(history.flatMap((day) => day.sets.map((set) => set.exercise)))].sort((a, b) => a.localeCompare(b, "ru"));
  useEffect(() => {
    if (!exerciseNames.includes(selectedExercise)) setSelectedExercise(exerciseNames[0] ?? "");
  }, [history, selectedExercise]);
  const exerciseProgress = history
    .map((day) => ({
      date: day.date,
      best: Math.max(0, ...day.sets.filter((set) => set.exercise === selectedExercise).map((set) => Number(set.weight))),
      sets: day.sets.filter((set) => set.exercise === selectedExercise),
    }))
    .filter((day) => day.sets.length > 0)
    .sort((left, right) => left.date.localeCompare(right.date));
  const exerciseSets = exerciseProgress.flatMap((day) => day.sets);
  const recordWeight = exerciseSets.length ? Math.max(...exerciseSets.map((set) => Number(set.weight))) : null;
  const recordSet = exerciseSets.find((set) => Number(set.weight) === recordWeight);
  const maxSetVolume = exerciseSets.length
    ? Math.max(...exerciseSets.map((set) => Number(set.weight) * Number(set.repetitions)))
    : null;
  const progressPoints = exerciseProgress.map((day, index) => {
    const x = exerciseProgress.length === 1 ? 160 : 12 + (index / (exerciseProgress.length - 1)) * 296;
    const min = Math.min(...exerciseProgress.map((item) => item.best));
    const max = Math.max(...exerciseProgress.map((item) => item.best));
    const y = 112 - (max === min ? 48 : 12 + ((day.best - min) / (max - min)) * 88);
    return `${x},${y}`;
  });
  const workoutDates = new Set(history.map((day) => day.date));
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => toISODate(year, month, index + 1)),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);
  const monthLabel = calendarMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const today = toISODate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">История</h1>
        <p className="mt-1 text-sm text-tg-hint">Тренировочные дни и сохранённые подходы.</p>
      </header>

      <section aria-label="Календарь тренировок" className="rounded-xl bg-tg-section p-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Предыдущий месяц"
            onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
            className="grid h-9 w-9 place-items-center rounded-lg text-tg-hint hover:bg-black/10"
          >
            <MonthArrow direction="left" />
          </button>
          <h2 className="text-sm font-semibold capitalize">{monthLabel}</h2>
          <button
            type="button"
            aria-label="Следующий месяц"
            onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
            className="grid h-9 w-9 place-items-center rounded-lg text-tg-hint hover:bg-black/10"
          >
            <MonthArrow direction="right" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((weekday) => (
            <div key={weekday} className="py-1 text-[11px] font-medium text-tg-hint">{weekday}</div>
          ))}
          {calendarCells.map((value, index) => {
            if (!value) return <div key={`empty-${index}`} className="h-10" />;
            const hasWorkout = workoutDates.has(value);
            const selected = openDate === value;
            return (
              <button
                key={value}
                type="button"
                disabled={!hasWorkout}
                aria-label={`${formatDate(value)}${hasWorkout ? ", есть тренировка" : ""}`}
                aria-pressed={selected}
                onClick={() => {
                  setOpenDate(value);
                  haptic("light");
                }}
                className={`relative grid h-10 place-items-center rounded-lg text-sm tabular-nums ${
                  selected
                    ? "bg-tg-button font-semibold text-tg-buttonText"
                    : hasWorkout
                      ? "font-semibold text-tg-text hover:bg-black/10"
                      : "text-tg-hint/60"
                } ${value === today && !selected ? "ring-1 ring-tg-button/60" : ""}`}
              >
                {Number(value.slice(-2))}
                {hasWorkout ? (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? "bg-tg-buttonText" : "bg-tg-button"}`} />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {history.length > 0 ? (
        <section aria-label="Сводка прогресса" className="grid grid-cols-3 gap-2">
          <Stat label="Дней" value={history.length} />
          <Stat label="Подходов" value={totalSets} />
          <Stat
            label="Объём, кг × повторы"
            value={totalVolume.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}
          />
        </section>
      ) : (
        <p className="text-center text-sm text-tg-hint">Здесь появятся тренировки с датой, длительностью и подходами.</p>
      )}

      {exerciseNames.length > 0 ? (
        <section aria-label="Прогресс по упражнениям" className="space-y-3 rounded-2xl bg-tg-section p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Прогресс упражнений</h2>
            <select
              aria-label="Упражнение для графика прогресса"
              value={selectedExercise}
              onChange={(event) => setSelectedExercise(event.target.value)}
              className="max-w-[55%] rounded-lg bg-tg-bg px-2 py-2 text-sm"
            >
              {exerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          {exerciseProgress.length > 0 ? (
            <>
              <svg viewBox="0 0 320 128" role="img" aria-label={`График рабочего веса: ${selectedExercise}`} className="h-32 w-full">
                {progressPoints.length > 1 ? <polyline points={progressPoints.join(" ")} fill="none" stroke="var(--tg-link)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
                {progressPoints.map((point, index) => {
                  const [cx, cy] = point.split(",");
                  return <circle key={exerciseProgress[index].date} cx={cx} cy={cy} r="4" fill="var(--tg-button)" />;
                })}
              </svg>
              <div className="flex justify-between text-[11px] text-tg-hint">
                <span>{formatDate(exerciseProgress[0].date)}</span>
                <span>{formatDate(exerciseProgress[exerciseProgress.length - 1].date)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Рекорд веса" value={recordWeight == null ? "—" : `${recordWeight} кг × ${recordSet.repetitions}`} />
                <Stat label="Лучший объём за подход" value={maxSetVolume == null ? "—" : `${maxSetVolume.toLocaleString("ru-RU")} кг`} />
              </div>
            </>
          ) : <p className="text-sm text-tg-hint">Для этого упражнения пока нет записей.</p>}
        </section>
      ) : null}

      {history.map((day) => {
        const open = openDate === day.date;
        return (
          <section key={day.date} className="overflow-hidden rounded-2xl bg-tg-section shadow-card">
            <div className="flex items-center">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-between px-4 py-4 text-left"
                onClick={() => {
                  haptic("light");
                  setOpenDate(open ? null : day.date);
                }}
              >
                <div>
                  <div className="text-[17px] font-semibold capitalize">{formatDate(day.date)}</div>
                  <div className="mt-0.5 text-sm text-tg-hint">
                    {day.preset_name || "Тренировка"} · {day.sets.length} подходов
                    {day.duration_seconds != null ? ` · ${formatDuration(day.duration_seconds)}` : ""}
                  </div>
                </div>
                <span className="ml-2 text-tg-hint">{open ? "▾" : "›"}</span>
              </button>
              <button
                type="button"
                aria-label={`Удалить тренировку за ${formatDate(day.date)}`}
                title="Удалить тренировку"
                onClick={() => onDelete(day.date)}
                className="mr-3 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-tg-hint hover:bg-black/20 hover:text-tg-destructive"
              >
                <TrashIcon />
              </button>
            </div>
            {open ? (
              <div className="space-y-2 border-t border-tg-divider px-4 pb-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDay(day.date);
                    setEditingSet(null);
                    setEditError("");
                  }}
                  className="text-sm font-medium text-tg-link"
                >
                  Изменить тренировку
                </button>
                {editingDay === day.date ? (
                  <form
                    className="grid grid-cols-2 gap-2 rounded-xl bg-tg-bg p-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      await onEditDay(day, {
                        logged_on: String(form.get("logged_on")),
                        duration_seconds: Number(form.get("duration_minutes")) * 60,
                      });
                      setEditingDay(null);
                      setEditError("");
                    }}
                  >
                    <label className="text-xs text-tg-hint">
                      Дата
                      <input name="logged_on" type="date" required defaultValue={day.date} className="mt-1 w-full rounded-lg bg-tg-section px-2 py-2 text-tg-text" />
                    </label>
                    <label className="text-xs text-tg-hint">
                      Длительность, мин
                      <input name="duration_minutes" type="number" min="0" max="1440" required defaultValue={Math.round((day.duration_seconds ?? 0) / 60)} className="mt-1 w-full rounded-lg bg-tg-section px-2 py-2 text-tg-text" />
                    </label>
                    <button type="button" onClick={() => setEditingDay(null)} className="rounded-lg bg-tg-section py-2 text-sm text-tg-hint">Отмена</button>
                    <button type="submit" className="rounded-lg bg-tg-button py-2 text-sm font-semibold text-tg-buttonText">Сохранить</button>
                  </form>
                ) : null}
                {groupSets(day.sets).map((exercise) => (
                  <div key={exercise.name}>
                    <div className="text-sm font-medium">{exercise.name}</div>
                    <div className="mt-1 space-y-1">
                      {exercise.sets.map((set, index) => (
                        <div key={set.id ?? `${set.weight}-${set.repetitions}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-tg-bg px-2 py-1.5 text-sm">
                          {editingSet === set.id ? (
                            <form
                              className="flex flex-1 items-center gap-2"
                              onSubmit={async (event) => {
                                event.preventDefault();
                                const form = new FormData(event.currentTarget);
                                const weight = Number(String(form.get("weight")).replace(",", "."));
                                const repetitions = Number(form.get("repetitions"));
                                if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 1000) {
                                  setEditError("Укажи вес не меньше 0 и от 1 до 1000 повторений.");
                                  return;
                                }
                                await onEditSet(day, set, { weight, repetitions });
                                setEditingSet(null);
                                setEditError("");
                              }}
                            >
                              <input name="weight" type="text" inputMode="decimal" required defaultValue={set.weight} aria-label="Вес" className="w-20 rounded-md bg-tg-section px-2 py-1" />
                              <span>кг ×</span>
                              <input name="repetitions" type="number" min="1" max="1000" required defaultValue={set.repetitions} aria-label="Повторения" className="w-16 rounded-md bg-tg-section px-2 py-1" />
                              <button type="submit" className="text-tg-link">✓</button>
                              <button type="button" onClick={() => setEditingSet(null)} className="text-tg-hint">×</button>
                            </form>
                          ) : (
                            <>
                              <span>{set.weight} кг × {set.repetitions}</span>
                              <span className="flex gap-2">
                                <button type="button" aria-label="Изменить подход" onClick={() => { setEditError(""); setEditingSet(set.id); }} className="text-tg-link">Изменить</button>
                                <button type="button" aria-label="Удалить подход" onClick={() => onDeleteSet(day, set)} className="text-tg-destructive">×</button>
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                      {editError ? <p role="alert" className="text-sm text-tg-destructive">{editError}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
    </svg>
  );
}

function MonthArrow({ direction }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-tg-section px-3 py-3">
      <div className="truncate text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] leading-tight text-tg-hint">{label}</div>
    </div>
  );
}

function groupSets(sets) {
  const result = [];
  for (const set of sets) {
    const last = result[result.length - 1];
    if (last && last.name === set.exercise) last.sets.push(set);
    else result.push({ name: set.exercise, sets: [set] });
  }
  return result;
}
