const LS_PRESETS = "workout.customPresets";
const LS_HISTORY = "workout.history";
const LS_PROFILE = "workout.profile";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function headers() {
  const initData = window.Telegram?.WebApp?.initData;
  const result = { "Content-Type": "application/json" };
  if (initData) result["X-Telegram-Init-Data"] = initData;
  else result["X-Dev-Telegram-Id"] = "1";
  return result;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export async function loadCustomPresets() {
  try {
    const data = await request("/api/presets");
    return data.map((preset) => ({
      id: `custom-${preset.id}`,
      dbId: preset.id,
      name: preset.name,
      description: preset.description || "Мой сплит",
      exercises: preset.exercises.map((item) => item.name),
      custom: true,
    }));
  } catch {
    return readLocal(LS_PRESETS, []);
  }
}

export async function createCustomPreset({ name, description, exercises }) {
  const local = {
    id: `custom-${Date.now()}`,
    name,
    description: description || "Мой сплит",
    exercises,
    custom: true,
  };
  try {
    const saved = await request("/api/presets", {
      method: "POST",
      body: JSON.stringify({ name, description, exercises }),
    });
    return {
      id: `custom-${saved.id}`,
      dbId: saved.id,
      name: saved.name,
      description: saved.description || local.description,
      exercises: saved.exercises.map((item) => item.name),
      custom: true,
    };
  } catch {
    writeLocal(LS_PRESETS, [...readLocal(LS_PRESETS, []), local]);
    return local;
  }
}

export async function loadHistory() {
  try {
    return await request("/api/history");
  } catch {
    return readLocal(LS_HISTORY, []);
  }
}

export async function deleteWorkoutDay(logged_on, currentHistory) {
  try {
    await request(`/api/history/${logged_on}`, { method: "DELETE" });
    return await loadHistory();
  } catch {
    const history = currentHistory.filter((day) => day.date !== logged_on);
    writeLocal(LS_HISTORY, history);
    return history;
  }
}

export async function saveWorkout({ logged_on, preset_name, sets }) {
  const entry = { date: logged_on, preset_name, sets };
  try {
    await request("/api/workouts", {
      method: "POST",
      body: JSON.stringify({ logged_on, preset_name, sets }),
    });
  } catch {
    const history = readLocal(LS_HISTORY, []);
    const existing = history.find((day) => day.date === logged_on);
    if (existing) {
      existing.preset_name = preset_name;
      existing.sets = [...existing.sets, ...sets];
    } else {
      history.unshift(entry);
    }
    writeLocal(LS_HISTORY, history);
  }
}

export async function loadProfile() {
  try {
    return await request("/api/profile");
  } catch {
    return readLocal(LS_PROFILE, { current_weight: null, target_weight: null, weight_entries: [] });
  }
}

export async function saveProfile({ current_weight, target_weight }) {
  const changes = { current_weight, target_weight };
  try {
    return await request("/api/profile", {
      method: "PUT",
      body: JSON.stringify(changes),
    });
  } catch {
    const profile = { ...loadLocalProfile(), ...changes };
    writeLocal(LS_PROFILE, profile);
    return profile;
  }
}

export async function saveWeightEntry({ logged_on, weight }) {
  try {
    return await request("/api/weights", {
      method: "POST",
      body: JSON.stringify({ logged_on, weight }),
    });
  } catch {
    const profile = loadLocalProfile();
    const latestDate = profile.weight_entries[0]?.logged_on;
    const entryIndex = profile.weight_entries.findIndex((entry) => entry.logged_on === logged_on);
    const entry = { logged_on, weight };
    if (entryIndex >= 0) profile.weight_entries[entryIndex] = entry;
    else profile.weight_entries.push(entry);
    profile.weight_entries.sort((left, right) => right.logged_on.localeCompare(left.logged_on));
    if (!latestDate || logged_on >= latestDate) profile.current_weight = weight;
    writeLocal(LS_PROFILE, profile);
    return profile;
  }
}

function loadLocalProfile() {
  const profile = readLocal(LS_PROFILE, {});
  return {
    current_weight: profile.current_weight ?? null,
    target_weight: profile.target_weight ?? null,
    weight_entries: profile.weight_entries ?? [],
  };
}
