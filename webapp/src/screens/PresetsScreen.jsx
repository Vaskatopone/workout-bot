import { useState } from "react";
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
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState("");

  const addExercise = () => {
    const clean = exercise.trim();
    if (!clean) return;
    if (exercises.includes(clean)) {
      setError("Такое упражнение уже есть");
      return;
    }
    setExercises((current) => [...current, clean]);
    setExercise("");
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
        await onCreate({ name: name.trim(), exercises });
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
      <div className="flex gap-2">
        <input
          value={exercise}
          onChange={(event) => setExercise(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addExercise();
            }
          }}
          placeholder="Упражнение"
          className="min-w-0 flex-1 rounded-xl bg-black/30 px-3 py-3 outline-none placeholder:text-tg-hint"
        />
        <button
          type="button"
          onClick={addExercise}
          className="rounded-xl bg-tg-button px-3 font-semibold text-tg-buttonText"
        >
          Добавить
        </button>
      </div>
      <div className="space-y-2">
        {exercises.map((item, index) => (
          <div key={item} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
            <span className="text-sm">
              {index + 1}. {item}
            </span>
            <button
              type="button"
              className="text-sm text-tg-hint"
              onClick={() => setExercises((current) => current.filter((name) => name !== item))}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
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
