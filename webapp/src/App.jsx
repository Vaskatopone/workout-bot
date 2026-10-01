import { useEffect, useMemo, useState } from "react";
import TabBar from "./components/TabBar.jsx";
import { BUILTIN_PRESETS } from "./presets.js";
import PresetsScreen from "./screens/PresetsScreen.jsx";
import WorkoutScreen from "./screens/WorkoutScreen.jsx";
import HistoryScreen from "./screens/HistoryScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import {
  createCustomPreset,
  deleteWorkoutDay,
  deleteCustomPreset,
  loadCustomPresets,
  loadHistory,
  loadProfile,
  saveProfile,
  saveWeightEntry,
  saveWorkout,
  todayISO,
  updateCustomPreset,
} from "./storage.js";
import { confirmAction, notify } from "./telegram.js";

function emptyDraft(preset, history, workoutDate) {
  return (preset?.exercises ?? []).map((name) => {
    const previousDay = [...history]
      .filter((day) => day.date <= workoutDate)
      .sort((left, right) => right.date.localeCompare(left.date))
      .find((day) => day.sets.some((set) => set.exercise === name));
    const previousSets = previousDay?.sets.filter((set) => set.exercise === name) ?? [];
    const previousWeight = previousSets[previousSets.length - 1]?.weight;
    return {
      name,
      weight: previousWeight == null ? "" : String(previousWeight),
      previousWeight: previousWeight ?? null,
      reps: "",
      sets: [],
    };
  });
}

export default function App() {
  const [tab, setTab] = useState("presets");
  const [custom, setCustom] = useState([]);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({ current_weight: null, target_weight: null, weight_entries: [] });
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [draft, setDraft] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [presets, days, userProfile] = await Promise.all([
        loadCustomPresets(),
        loadHistory(),
        loadProfile(),
      ]);
      if (cancelled) return;
      setCustom(presets);
      setHistory(days);
      setProfile(userProfile);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (startedAt === null) return undefined;
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    updateElapsed();
    const timerId = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timerId);
  }, [startedAt]);

  const selectedId = selected?.id ?? null;

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  const screens = useMemo(
    () => ({
      presets: (
        <PresetsScreen
          builtin={BUILTIN_PRESETS}
          custom={custom}
          selectedId={selectedId}
          onSelect={(preset) => {
            const workoutDate = todayISO();
            setSelected(preset);
            setDraft(emptyDraft(preset, history, workoutDate));
            setDate(workoutDate);
            setStartedAt(Date.now());
            setElapsedSeconds(0);
            setTab("workout");
          }}
          onCreate={async (payload) => {
            const preset = await createCustomPreset(payload);
            setCustom((current) => [preset, ...current]);
            showToast("Сплит сохранён");
          }}
          onUpdate={async (preset, payload) => {
            try {
              const updated = await updateCustomPreset(preset, payload);
              setCustom((current) => current.map((item) => (item.id === preset.id ? updated : item)));
              showToast("Сплит обновлён");
              return true;
            } catch {
              notify("error");
              showToast("Не удалось сохранить изменения");
              return false;
            }
          }}
          onDelete={async (preset) => {
            if (selectedId === preset.id) {
              showToast("Сначала заверши активную тренировку");
              return false;
            }
            const confirmed = await confirmAction(`Удалить сплит «${preset.name}»? История тренировок сохранится.`);
            if (!confirmed) return false;
            try {
              await deleteCustomPreset(preset);
              setCustom((current) => current.filter((item) => item.id !== preset.id));
              showToast("Сплит удалён");
              return true;
            } catch {
              notify("error");
              showToast("Не удалось удалить сплит");
              return false;
            }
          }}
        />
      ),
      workout: (
        <WorkoutScreen
          preset={selected}
          onStart={() => setTab("presets")}
          elapsedSeconds={elapsedSeconds}
          date={date}
          onDateChange={setDate}
          draft={draft}
          onChangeDraft={setDraft}
          onFinish={async () => {
            const sets = draft.flatMap((exercise) =>
              exercise.sets.map((set) => ({
                exercise: exercise.name,
                weight: set.weight,
                repetitions: set.repetitions,
              })),
            );
            if (sets.length === 0) {
              notify("error");
              showToast("Добавь хотя бы один подход");
              return;
            }
            const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
            await saveWorkout({
              logged_on: date,
              preset_name: selected.name,
              sets,
              duration_seconds: durationSeconds,
            });
            const days = await loadHistory();
            setHistory(days);
            setSelected(null);
            setDraft([]);
            setDate(todayISO());
            setStartedAt(null);
            setElapsedSeconds(0);
            notify("success");
            showToast("Тренировка сохранена");
            setTab("history");
          }}
        />
      ),
      history: (
        <HistoryScreen
          history={history}
          onDelete={async (loggedOn) => {
            const confirmed = await confirmAction("Удалить тренировку и все её подходы? Отменить это действие нельзя.");
            if (!confirmed) return;
            setHistory(await deleteWorkoutDay(loggedOn, history));
            notify("success");
            showToast("Тренировка удалена");
          }}
        />
      ),
      profile: (
        <ProfileScreen
          profile={profile}
          onSaveProfile={async (changes) => {
            const saved = await saveProfile(changes);
            setProfile(saved);
            notify("success");
            showToast("Профиль сохранён");
          }}
          onAddWeight={async (entry) => {
            const saved = await saveWeightEntry(entry);
            setProfile(saved);
            notify("success");
            showToast("Замер сохранён");
          }}
        />
      ),
    }),
    [custom, date, draft, elapsedSeconds, history, profile, selected, selectedId, startedAt],
  );

  return (
    <div className="min-h-[100dvh] bg-tg-bg text-tg-text">
      <main className="mx-auto max-w-lg px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
        {screens[tab]}
      </main>
      <TabBar tab={tab} onChange={setTab} />
      {toast ? (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto w-fit rounded-full bg-black/80 px-4 py-2 text-sm text-white">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
