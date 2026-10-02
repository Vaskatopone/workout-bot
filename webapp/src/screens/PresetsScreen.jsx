import { useEffect, useState } from "react";
import { EXERCISE_CATEGORIES } from "../presets.js";
import { haptic } from "../telegram.js";

export default function PresetsScreen({ builtin, custom, trainingPlan, selectedId, onSelect, onCreate, onUpdate, onDelete, onSavePlan }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showBuiltin, setShowBuiltin] = useState(false);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">Сплит</h1>
        <p className="mt-1 text-sm text-tg-hint">Выбери готовый пресет или собери свой набор упражнений.</p>
      </header>

      <button
        type="button"
        onClick={() => {
          haptic("light");
          setEditing(null);
          setCreating(true);
        }}
        className="w-full rounded-2xl bg-tg-button py-3.5 text-[15px] font-semibold text-tg-buttonText"
      >
        Создать свой сплит
      </button>

      {creating || editing ? (
        <CreateSplitForm
          key={editing?.id ?? "new-split"}
          initialPreset={editing}
          onCancel={closeForm}
          onSubmit={async (payload) => {
            if (editing) await onUpdate(editing, payload);
            else await onCreate(payload);
            closeForm();
          }}
        />
      ) : null}

      <TrainingPlanForm plan={trainingPlan} presets={[...builtin, ...custom]} onSave={onSavePlan} />

      {custom.length > 0 ? (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-tg-hint">Мои сплиты</h2>
          {custom.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              selected={selectedId === preset.id}
              collapsible
              onSelect={onSelect}
              onEdit={() => setEditing(preset)}
              onDelete={async () => {
                const deleted = await onDelete(preset);
                if (deleted && editing?.id === preset.id) closeForm();
              }}
              locked={selectedId === preset.id}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-tg-hint">Встроенные</h2>
          <button
            type="button"
            aria-expanded={showBuiltin}
            aria-controls="builtin-presets"
            onClick={() => setShowBuiltin((visible) => !visible)}
            className="text-sm font-medium text-tg-link"
          >
            {showBuiltin ? "Скрыть" : "Показать"}
          </button>
        </div>
        {showBuiltin ? (
          <div id="builtin-presets" className="space-y-2">
            {builtin.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                selected={selectedId === preset.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

function TrainingPlanForm({ plan, presets, onSave }) {
  const [days, setDays] = useState({});
  const [reminderTime, setReminderTime] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDays(Object.fromEntries(plan.days.map((item) => [item.weekday, item.preset_name])));
    setReminderTime(plan.reminder_time ?? "");
  }, [plan]);

  return (
    <details className="rounded-2xl bg-tg-section p-4">
      <summary className="cursor-pointer text-[17px] font-semibold">План тренировок и напоминания</summary>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await onSave({
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
              reminder_time: reminderTime || null,
              days: Object.entries(days)
                .filter(([, presetName]) => presetName)
                .map(([weekday, preset_name]) => ({ weekday: Number(weekday), preset_name })),
            });
          } catch {
            setError("Не удалось сохранить план. Проверь подключение и попробуй ещё раз.");
          }
        }}
      >
        <p className="text-sm text-tg-hint">Назначь сплит на дни недели. В выбранное время бот напомнит о тренировке.</p>
        {WEEKDAYS.map((weekday, index) => (
          <label key={weekday} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0">{weekday}</span>
            <select
              value={days[index] ?? ""}
              onChange={(event) => setDays((current) => ({ ...current, [index]: event.target.value }))}
              className="min-w-0 flex-1 rounded-lg bg-tg-bg px-2 py-2"
            >
              <option value="">Без тренировки</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.name}>{preset.name}</option>
              ))}
            </select>
          </label>
        ))}
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Время напоминания</span>
          <span className="flex items-center gap-2">
            <input
              type="time"
              value={reminderTime}
              onChange={(event) => setReminderTime(event.target.value)}
              className="rounded-lg bg-tg-bg px-3 py-2"
            />
            <button
              type="button"
              onClick={() => setReminderTime("")}
              disabled={!reminderTime}
              className="text-xs text-tg-link disabled:text-tg-hint"
            >
              Отключить
            </button>
          </span>
        </label>
        <p className="text-xs text-tg-hint">
          Часовой пояс устройства: {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}.
          Оставь время пустым, чтобы отключить напоминания.
        </p>
        {error ? <p role="alert" className="text-sm text-tg-destructive">{error}</p> : null}
        <button type="submit" className="w-full rounded-xl bg-tg-button py-3 font-semibold text-tg-buttonText">
          Сохранить план
        </button>
      </form>
    </details>
  );
}

function PresetCard({ preset, selected, onSelect, onEdit, onDelete, collapsible = false }) {
  const [expanded, setExpanded] = useState(!collapsible);

  return (
    <article
      className={`rounded-2xl bg-tg-section p-4 shadow-card ${
        selected ? "ring-2 ring-tg-button" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => {
            haptic("medium");
            onSelect(preset);
          }}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[17px] font-semibold">{preset.name}</div>
              <div className="mt-0.5 text-sm text-tg-hint">{preset.description}</div>
            </div>
            {selected ? (
              <span className="shrink-0 rounded-full bg-tg-button px-2 py-0.5 text-[11px] font-semibold text-tg-buttonText">
                Выбран
              </span>
            ) : null}
          </div>
          <div
            id={`preset-exercises-${preset.id}`}
            className={`mt-3 flex flex-wrap gap-1.5 ${collapsible && !expanded ? "hidden" : ""}`}
          >
            {preset.exercises.map((name) => (
              <span key={name} className="rounded-full bg-tg-bg px-2.5 py-1 text-[12px] text-tg-text/90">
                {name}
              </span>
            ))}
          </div>
        </button>
        {collapsible ? (
          <button
            type="button"
            aria-label={`${expanded ? "Скрыть" : "Показать"} упражнения сплита ${preset.name}`}
            aria-expanded={expanded}
            aria-controls={`preset-exercises-${preset.id}`}
            title={`${expanded ? "Скрыть" : "Показать"} упражнения`}
            onClick={() => {
              haptic("light");
              setExpanded((visible) => !visible);
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-tg-hint hover:bg-black/20 hover:text-tg-link"
          >
            <ChevronIcon expanded={expanded} />
          </button>
        ) : null}
        {onEdit && onDelete ? (
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              aria-label={`Редактировать сплит ${preset.name}`}
              title={selected ? "Заверши активную тренировку, чтобы изменить сплит" : "Редактировать сплит"}
              disabled={selected}
              onClick={() => onEdit(preset)}
              className="grid h-9 w-9 place-items-center rounded-lg text-tg-hint hover:bg-black/20 hover:text-tg-link disabled:opacity-40"
            >
              <EditIcon />
            </button>
            <button
              type="button"
              aria-label={`Удалить сплит ${preset.name}`}
              title={selected ? "Заверши активную тренировку, чтобы удалить сплит" : "Удалить сплит"}
              disabled={selected}
              onClick={() => onDelete(preset)}
              className="grid h-9 w-9 place-items-center rounded-lg text-tg-hint hover:bg-black/20 hover:text-tg-destructive disabled:opacity-40"
            >
              <DeleteIcon />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CreateSplitForm({ initialPreset, onCancel, onSubmit }) {
  const [name, setName] = useState(initialPreset?.name ?? "");
  const [exercise, setExercise] = useState("");
  const [categoryId, setCategoryId] = useState(EXERCISE_CATEGORIES[0].id);
  const [exercises, setExercises] = useState(() =>
    (initialPreset?.exercises ?? []).map((item) => ({
      name: item,
      image: EXERCISE_CATEGORIES.flatMap((category) => category.exercises).find((entry) => entry.name === item)?.image ?? null,
    })),
  );
  const [error, setError] = useState("");
  const category = EXERCISE_CATEGORIES.find((item) => item.id === categoryId);

  const addExercise = (item) => {
    const clean = (typeof item === "string" ? item : item.name).trim();
    if (!clean) return;
    if (exercises.some((selected) => selected.name === clean)) {
      setError("Такое упражнение уже есть");
      return;
    }
    setExercises((current) => [
      ...current,
      { name: clean, image: typeof item === "string" ? null : item.image },
    ]);
    if (typeof item === "string") setExercise("");
    setError("");
    haptic("light");
  };

  return (
    <form
      className="space-y-3 rounded-2xl bg-tg-section p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim() || exercises.length === 0) {
          setError("Нужны название и хотя бы одно упражнение");
          return;
        }
        try {
          const saved = await onSubmit({
            name: name.trim(),
            description: initialPreset?.description || "Мой сплит",
            exercises: exercises.map((item) => item.name),
          });
          if (saved === false) return;
        } catch {
          setError("Не удалось сохранить сплит. Проверь подключение и попробуй ещё раз.");
          return;
        }
        onCancel();
      }}
    >
      <div className="text-[17px] font-semibold">{initialPreset ? "Редактировать сплит" : "Новый сплит"}</div>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Название, например «Грудь/трицепс»"
        className="w-full rounded-xl bg-tg-bg px-3 py-3 outline-none placeholder:text-tg-hint"
      />
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-tg-hint">Группа мышц</span>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-xl bg-tg-bg px-3 py-3 text-tg-text outline-none"
        >
          {EXERCISE_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {category.exercises.map((item) => {
          const added = exercises.some((selected) => selected.name === item.name);
          return (
            <article key={item.name} className="overflow-hidden rounded-lg bg-tg-section">
              <div className="relative aspect-[4/3] bg-tg-secondary">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(event) => event.currentTarget.remove()}
                />
              </div>
              <div className="space-y-2 p-2.5">
                <div className="min-h-10 text-sm font-medium leading-snug">{item.name}</div>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => addExercise(item)}
                  className="w-full rounded-lg bg-tg-button px-2 py-2 text-xs font-semibold text-tg-buttonText disabled:bg-tg-secondary disabled:text-tg-hint"
                >
                  {added ? "Добавлено" : "+ Добавить"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-tg-link">Добавить своё упражнение</summary>
        <div className="mt-2 flex gap-2">
          <input
            value={exercise}
            onChange={(event) => setExercise(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addExercise(exercise);
              }
            }}
            placeholder="Название упражнения"
            className="min-w-0 flex-1 rounded-xl bg-tg-bg px-3 py-3 outline-none placeholder:text-tg-hint"
          />
          <button
            type="button"
            onClick={() => addExercise(exercise)}
            className="rounded-xl bg-tg-button px-3 font-semibold text-tg-buttonText"
          >
            Добавить
          </button>
        </div>
      </details>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-tg-hint">
          В сплите: {exercises.length}
        </div>
        {exercises.map((item, index) => (
          <div key={item.name} className="flex items-center gap-3 border-b border-tg-divider py-2">
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className="h-12 w-12 rounded-lg bg-tg-secondary object-cover"
                onError={(event) => event.currentTarget.remove()}
              />
            ) : null}
            <span className="min-w-0 flex-1 text-sm">
              {index + 1}. {item.name}
            </span>
            <button
              type="button"
              className="text-sm text-tg-hint"
              onClick={() => setExercises((current) => current.filter((selected) => selected.name !== item.name))}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-tg-hint">
        Иллюстрации предоставлены <a href="https://wger.de" target="_blank" rel="noreferrer" className="text-tg-link">wger.de</a>.
      </p>
      {error ? <p className="text-sm text-tg-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-tg-secondary py-3 text-tg-hint">
          Отмена
        </button>
        <button type="submit" className="flex-1 rounded-xl bg-tg-button py-3 font-semibold text-tg-buttonText">
          {initialPreset ? "Сохранить изменения" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14 5 5 5M4 20l4.5-1 10.2-10.2a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
    </svg>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${expanded ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
