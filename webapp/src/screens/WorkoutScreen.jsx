import { haptic, notify } from "../telegram.js";

export default function WorkoutScreen({ preset, onStart, date, onDateChange, draft, onChangeDraft, onFinish }) {
  if (!preset) {
    return (
      <div className="pt-10 text-center">
        <h1 className="text-[28px] font-semibold">Тренировка</h1>
        <p className="mt-2 text-sm text-tg-hint">Активной тренировки нет.</p>
        <button
          type="button"
          onClick={onStart}
          className="mt-5 w-full rounded-2xl bg-tg-button py-4 text-[16px] font-semibold text-tg-buttonText"
        >
          Начать тренировку
        </button>
      </div>
    );
  }

  const totalSets = draft.reduce((sum, item) => sum + item.sets.length, 0);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{preset.name}</h1>
          <p className="mt-1 text-sm text-tg-hint">{totalSets} подходов записано</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className="rounded-xl bg-tg-section px-3 py-2 text-sm"
        />
      </header>

      {draft.map((exercise, index) => (
        <article key={exercise.name} className="rounded-2xl bg-tg-section p-4 shadow-card">
          <div className="text-[17px] font-semibold">{exercise.name}</div>
          {exercise.sets.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {exercise.sets.map((set, setIndex) => (
                <button
                  key={`${set.weight}-${set.repetitions}-${setIndex}`}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl bg-black/25 px-3 py-2 text-sm"
                  onClick={() => {
                    haptic("light");
                    onChangeDraft(
                      draft.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, sets: item.sets.filter((_, current) => current !== setIndex) }
                          : item,
                      ),
                    );
                  }}
                >
                  <span className="text-tg-hint">Подход {setIndex + 1}</span>
                  <span>
                    {set.weight} кг × {set.repetitions}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-tg-hint">Пока нет подходов</p>
          )}

          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-tg-hint">Вес, кг</span>
              <input
                inputMode="decimal"
                value={exercise.weight}
                onChange={(event) =>
                  onChangeDraft(
                    draft.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, weight: event.target.value } : item,
                    ),
                  )
                }
                placeholder="60"
                className="w-full rounded-xl bg-black/30 px-3 py-3 outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-tg-hint">Повторения</span>
              <input
                inputMode="numeric"
                value={exercise.reps}
                onChange={(event) =>
                  onChangeDraft(
                    draft.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, reps: event.target.value } : item,
                    ),
                  )
                }
                placeholder="8"
                className="w-full rounded-xl bg-black/30 px-3 py-3 outline-none"
              />
            </label>
            <button
              type="button"
              className="mt-5 rounded-xl bg-tg-button px-3 font-semibold text-tg-buttonText"
              onClick={() => {
                const weight = Number(String(exercise.weight).replace(",", "."));
                const repetitions = Number(exercise.reps);
                if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(repetitions) || repetitions < 1) {
                  notify("error");
                  return;
                }
                haptic("medium");
                onChangeDraft(
                  draft.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, sets: [...item.sets, { weight, repetitions }] }
                      : item,
                  ),
                );
              }}
            >
              + Подход
            </button>
          </div>
        </article>
      ))}

      <button
        type="button"
        onClick={onFinish}
        className="w-full rounded-2xl bg-tg-button py-4 text-[16px] font-semibold text-tg-buttonText"
      >
        Завершить и сохранить тренировку
      </button>
    </div>
  );
}
