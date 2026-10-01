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

export default function HistoryScreen({ history }) {
  const [openDate, setOpenDate] = useState(history[0]?.date ?? null);

  useEffect(() => {
    if (history[0] && !history.some((day) => day.date === openDate)) {
      setOpenDate(history[0].date);
    }
  }, [history, openDate]);

  if (history.length === 0) {
    return (
      <div className="pt-10 text-center">
        <h1 className="text-[28px] font-semibold">История</h1>
        <p className="mt-2 text-sm text-tg-hint">Здесь появятся тренировки по датам — с весами и повторениями.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">История</h1>
        <p className="mt-1 text-sm text-tg-hint">Прогресс по дням. Нажми дату, чтобы открыть подходы.</p>
      </header>

      {history.map((day) => {
        const open = openDate === day.date;
        return (
          <section key={day.date} className="overflow-hidden rounded-2xl bg-tg-section shadow-card">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-4 text-left"
              onClick={() => {
                haptic("light");
                setOpenDate(open ? null : day.date);
              }}
            >
              <div>
                <div className="text-[17px] font-semibold capitalize">{formatDate(day.date)}</div>
                <div className="mt-0.5 text-sm text-tg-hint">
                  {day.preset_name} · {day.sets.length} подходов
                </div>
              </div>
              <span className="text-tg-hint">{open ? "▾" : "›"}</span>
            </button>
            {open ? (
              <div className="space-y-2 border-t border-white/5 px-4 pb-4 pt-2">
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

function groupSets(sets) {
  const result = [];
  for (const set of sets) {
    const last = result[result.length - 1];
    if (last && last.name === set.exercise) last.sets.push(set);
    else result.push({ name: set.exercise, sets: [set] });
  }
  return result;
}
