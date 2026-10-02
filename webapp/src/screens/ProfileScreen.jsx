import { useEffect, useState } from "react";
import { haptic, getTelegram } from "../telegram.js";
import { todayISO } from "../storage.js";

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function formatWeight(value) {
  return Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

function parseWeight(value) {
  return Number(value.trim().replace(",", "."));
}

export default function ProfileScreen({ profile, onSaveProfile, onAddWeight }) {
  const telegramUser = getTelegram()?.initDataUnsafe?.user;
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [entryWeight, setEntryWeight] = useState("");
  const [entryDate, setEntryDate] = useState(todayISO());
  const [error, setError] = useState("");

  useEffect(() => {
    setCurrentWeight(profile.current_weight ?? "");
    setTargetWeight(profile.target_weight ?? "");
  }, [profile.current_weight, profile.target_weight]);

  const fullName = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ");
  const initials = [telegramUser?.first_name?.[0], telegramUser?.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toLocaleUpperCase() || "?";
  const entries = [...(profile.weight_entries ?? [])].sort((left, right) => left.logged_on.localeCompare(right.logged_on));
  const recentEntries = [...entries].reverse();
  const current = profile.current_weight;
  const target = profile.target_weight;
  const deltaToTarget = current != null && target != null ? current - target : null;

  async function submitProfile(event) {
    event.preventDefault();
    const parsedCurrent = currentWeight === "" ? null : parseWeight(currentWeight);
    const parsedTarget = targetWeight === "" ? null : parseWeight(targetWeight);
    if ([parsedCurrent, parsedTarget].some((value) => value !== null && (!Number.isFinite(value) || value <= 0 || value > 500))) {
      setError("Укажи вес от 0,1 до 500 кг");
      return;
    }
    setError("");
    await onSaveProfile({ current_weight: parsedCurrent, target_weight: parsedTarget });
  }

  async function submitWeight(event) {
    event.preventDefault();
    const parsedWeight = parseWeight(entryWeight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 500 || !entryDate) {
      setError("Укажи дату и вес от 0,1 до 500 кг");
      return;
    }
    haptic("medium");
    setError("");
    await onAddWeight({ logged_on: entryDate, weight: parsedWeight });
    setEntryWeight("");
  }

  const chartWidth = 320;
  const chartHeight = 112;
  const padding = 12;
  const weights = entries.map((entry) => Number(entry.weight));
  const minWeight = weights.length ? Math.min(...weights) : 0;
  const maxWeight = weights.length ? Math.max(...weights) : 1;
  const scaleMin = minWeight === maxWeight ? minWeight - 0.5 : minWeight;
  const scaleMax = minWeight === maxWeight ? maxWeight + 0.5 : maxWeight;
  const points = weights.map((weight, index) => {
    const x = weights.length === 1
      ? chartWidth / 2
      : padding + (index / (weights.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((weight - scaleMin) / (scaleMax - scaleMin)) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">Профиль</h1>
      </header>

      <section className="flex items-center gap-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-tg-section text-lg font-semibold">
          <span>{initials}</span>
          {telegramUser?.photo_url ? (
            <img
              src={telegramUser.photo_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => event.currentTarget.remove()}
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{fullName || "Профиль Telegram"}</div>
          {telegramUser?.username ? (
            <div className="mt-0.5 text-sm text-tg-hint">@{telegramUser.username}</div>
          ) : (
            <div className="mt-0.5 text-sm text-tg-hint">Данные аккаунта Telegram</div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <WeightStat label="Текущий вес" value={current} />
        <WeightStat label="Желаемый вес" value={target} />
      </section>

      {deltaToTarget !== null ? (
        <p className="-mt-4 text-sm text-tg-hint">
          {Math.abs(deltaToTarget) < 0.05
            ? "Цель достигнута"
            : `${formatWeight(Math.abs(deltaToTarget))} кг ${deltaToTarget > 0 ? "до снижения" : "до набора"}`}
        </p>
      ) : null}

      <form onSubmit={submitProfile} className="space-y-3 border-t border-tg-divider pt-5">
        <h2 className="text-lg font-semibold">Целевой вес</h2>
        <div className="grid grid-cols-2 gap-3">
          <WeightInput label="Текущий, кг" value={currentWeight} onChange={setCurrentWeight} />
          <WeightInput label="Желаемый, кг" value={targetWeight} onChange={setTargetWeight} />
        </div>
        <button type="submit" className="w-full rounded-xl bg-tg-button py-3 font-semibold text-tg-buttonText">
          Сохранить профиль
        </button>
      </form>

      <form onSubmit={submitWeight} className="space-y-3 border-t border-tg-divider pt-5">
        <h2 className="text-lg font-semibold">Ежедневный замер</h2>
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] uppercase text-tg-hint">Дата</span>
            <input
              type="date"
              value={entryDate}
              max={todayISO()}
              onChange={(event) => setEntryDate(event.target.value)}
              className="w-full min-w-0 rounded-xl bg-tg-section px-2 py-3 text-sm"
            />
          </label>
          <WeightInput label="Вес, кг" value={entryWeight} onChange={setEntryWeight} placeholder="72,5" />
          <button type="submit" aria-label="Сохранить замер" title="Сохранить замер" className="mb-px h-11 w-11 rounded-xl bg-tg-button text-xl font-semibold text-tg-buttonText">
            +
          </button>
        </div>
      </form>

      {error ? <p role="alert" className="text-sm text-tg-destructive">{error}</p> : null}

      <section className="space-y-3 border-t border-tg-divider pt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Изменение веса</h2>
          {entries.length > 0 ? <span className="text-xs text-tg-hint">{entries.length} замеров</span> : null}
        </div>
        {entries.length > 0 ? (
          <div className="rounded-xl bg-tg-section p-3">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="График изменения веса" className="h-28 w-full overflow-visible">
              {points.length > 1 ? <polyline points={points.join(" ")} fill="none" stroke="var(--tg-link)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
              {points.map((point, index) => {
                const [cx, cy] = point.split(",");
                return <circle key={entries[index].logged_on} cx={cx} cy={cy} r="4" fill="var(--tg-button)" stroke="var(--tg-section-bg)" strokeWidth="2" />;
              })}
            </svg>
            <div className="flex justify-between text-[11px] text-tg-hint">
              <span>{formatDate(entries[0].logged_on)}</span>
              <span>{formatDate(entries[entries.length - 1].logged_on)}</span>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-tg-section p-4 text-sm text-tg-hint">Добавь первый замер, чтобы начать отслеживать динамику.</p>
        )}
      </section>

      {recentEntries.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">История замеров</h2>
          <div>
            {recentEntries.map((entry, index) => {
              const previous = recentEntries[index + 1];
              const change = previous ? Number(entry.weight) - Number(previous.weight) : null;
              return (
                <div key={entry.logged_on} className="flex items-center justify-between border-b border-tg-divider py-3">
                  <span className="text-sm capitalize">{formatDate(entry.logged_on)}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold tabular-nums">{formatWeight(entry.weight)} кг</span>
                    {change !== null ? (
                      <span className={`text-xs tabular-nums ${change < 0 ? "text-emerald-400" : change > 0 ? "text-tg-hint" : "text-tg-hint"}`}>
                        {change > 0 ? "+" : ""}{formatWeight(change)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function WeightStat({ label, value }) {
  return (
    <div className="rounded-xl bg-tg-section p-3">
      <div className="text-xs text-tg-hint">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {value == null ? "—" : `${formatWeight(value)} кг`}
      </div>
    </div>
  );
}

function WeightInput({ label, value, onChange, placeholder = "70" }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] uppercase text-tg-hint">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-tg-section px-3 py-3 outline-none placeholder:text-tg-hint"
      />
    </label>
  );
}