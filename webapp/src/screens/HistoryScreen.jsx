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

export default function HistoryScreen({ history, onDelete }) {
  const [openDate, setOpenDate] = useState(history[0]?.date ?? null);
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
                {groupSets(day.sets).map((exercise) => (
                  <div key={exercise.name}>
                    <div className="text-sm font-medium">{exercise.name}</div>
                    <div className="mt-1 text-sm text-tg-hint">
                      {exercise.sets.map((set, index) => (
                        <span key={`${set.weight}-${set.repetitions}-${index}`}>
                          {set.weight} кг × {set.repetitions}
                          {index < exercise.sets.length - 1 ? " · " : ""}
                        </span>
                      ))}
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
