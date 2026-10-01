import { useState } from "react";
import { EXERCISE_CATEGORIES } from "../presets.js";
import { haptic } from "../telegram.js";

export default function PresetsScreen({ builtin, custom, selectedId, onSelect, onCreate }) {
  const [creating, setCreating] = useState(false);

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
          setCreating(true);
        }}
        className="w-full rounded-2xl bg-tg-button py-3.5 text-[15px] font-semibold text-tg-buttonText"
      >
        Создать свой сплит
      </button>

      {creating ? <CreateSplitForm onCancel={() => setCreating(false)} onCreate={onCreate} /> : null}

      {custom.length > 0 ? (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-tg-hint">Мои сплиты</h2>
          {custom.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              selected={selectedId === preset.id}
              onSelect={onSelect}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-tg-hint">Встроенные</h2>
        {builtin.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={selectedId === preset.id}
            onSelect={onSelect}
          />
        ))}
      </section>
    </div>
  );
}

function PresetCard({ preset, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic("medium");
        onSelect(preset);
      }}
      className={`w-full rounded-2xl bg-tg-section p-4 text-left shadow-card ${
        selected ? "ring-2 ring-tg-button" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[17px] font-semibold">{preset.name}</div>
          <div className="mt-0.5 text-sm text-tg-hint">{preset.description}</div>
        </div>
        {selected ? (
          <span className="rounded-full bg-tg-button px-2 py-0.5 text-[11px] font-semibold text-tg-buttonText">
            Выбран
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {preset.exercises.map((name) => (
          <span key={name} className="rounded-full bg-black/25 px-2.5 py-1 text-[12px] text-tg-text/90">
            {name}
          </span>
        ))}
      </div>
    </button>
  );
}

function CreateSplitForm({ onCancel, onCreate }) {
  const [name, setName] = useState("");
  const [exercise, setExercise] = useState("");
  const [categoryId, setCategoryId] = useState(EXERCISE_CATEGORIES[0].id);
  const [exercises, setExercises] = useState([]);
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
        await onCreate({ name: name.trim(), exercises: exercises.map((item) => item.name) });
        onCancel();
      }}
    >
      <div className="text-[17px] font-semibold">Новый сплит</div>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Название, например «Грудь/трицепс»"
        className="w-full rounded-xl bg-black/30 px-3 py-3 outline-none placeholder:text-tg-hint"
      />
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-tg-hint">Группа мышц</span>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-xl bg-black/30 px-3 py-3 text-tg-text outline-none"
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
              <div className="relative aspect-[4/3] bg-black/25">
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
                  className="w-full rounded-lg bg-tg-button px-2 py-2 text-xs font-semibold text-tg-buttonText disabled:bg-black/30 disabled:text-tg-hint"
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
            className="min-w-0 flex-1 rounded-xl bg-black/30 px-3 py-3 outline-none placeholder:text-tg-hint"
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
          <div key={item.name} className="flex items-center gap-3 border-b border-white/5 py-2">
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className="h-12 w-12 rounded-lg bg-black/25 object-cover"
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
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-black/30 py-3 text-tg-hint">
          Отмена
        </button>
        <button type="submit" className="flex-1 rounded-xl bg-tg-button py-3 font-semibold text-tg-buttonText">
          Сохранить
        </button>
      </div>
    </form>
  );
}
