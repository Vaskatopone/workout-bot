export default function TabBar({ tab, onChange }) {
  const items = [
    { id: "presets", label: "Сплит", icon: SplitIcon },
    { id: "workout", label: "Тренировка", icon: DumbbellIcon },
    { id: "history", label: "История", icon: HistoryIcon },
    { id: "profile", label: "Профиль", icon: ProfileIcon },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-tg-divider bg-tg-secondary/95 backdrop-blur-md">
      <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[11px] ${
                active ? "text-tg-button" : "text-tg-hint"
              }`}
            >
              <Icon active={active} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SplitIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
    </svg>
  );
}

function DumbbellIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path d="M6 8v8M18 8v8M6 12h12M4 10v4M20 10v4" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
    </svg>
  );
}
