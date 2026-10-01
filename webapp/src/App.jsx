import { useEffect, useMemo, useState } from "react";
import TabBar from "./components/TabBar.jsx";
import { BUILTIN_PRESETS } from "./presets.js";
import PresetsScreen from "./screens/PresetsScreen.jsx";
import WorkoutScreen from "./screens/WorkoutScreen.jsx";
import HistoryScreen from "./screens/HistoryScreen.jsx";
import { createCustomPreset, loadCustomPresets, loadHistory, saveWorkout, todayISO } from "./storage.js";
import { notify } from "./telegram.js";

function emptyDraft(preset) {
  return (preset?.exercises ?? []).map((name) => ({ name, weight: "", reps: "", sets: [] }));
}

export default function App() {
  const [tab, setTab] = useState("presets");
  const [custom, setCustom] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [draft, setDraft] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [presets, days] = await Promise.all([loadCustomPresets(), loadHistory()]);
      if (cancelled) return;
      setCustom(presets);
      setHistory(days);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
            setSelected(preset);
            setDraft(emptyDraft(preset));
            setTab("workout");
          }}
          onCreate={async (payload) => {
            const preset = await createCustomPreset(payload);
            setCustom((current) => [preset, ...current]);
            showToast("Сплит сохранён");
          }}
        />
      ),
      workout: (
        <WorkoutScreen
          preset={selected}
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
            await saveWorkout({ logged_on: date, preset_name: selected.name, sets });
            const days = await loadHistory();
            setHistory(days);
            setDraft(emptyDraft(selected));
            notify("success");
            showToast("Тренировка сохранена");
            setTab("history");
          }}
        />
      ),
      history: <HistoryScreen history={history} />,
    }),
    [custom, date, draft, history, selected, selectedId],
  );

  return (
    <div className="min-h-[100dvh] bg-tg-bg text-tg-text">
      <main className="mx-auto max-w-lg px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
        {screens[tab]}
      </main>
      <TabBar tab={tab} onChange={setTab} />
      {toast ? (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto w-fit rounded-full bg-black/80 px-4 py-2 text-sm">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
