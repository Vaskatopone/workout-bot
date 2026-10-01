const DARK = {
  bg: "#17212b",
  secondary: "#0e1621",
  section: "#232e3c",
  text: "#ffffff",
  hint: "#708499",
  link: "#6ab3f3",
  button: "#5288c1",
  buttonText: "#ffffff",
  destructive: "#e53935",
  divider: "rgba(255, 255, 255, 0.07)",
};

const LIGHT = {
  bg: "#ffffff",
  secondary: "#f4f4f5",
  section: "#f1f3f5",
  text: "#1c1c1e",
  hint: "#707579",
  link: "#2481cc",
  button: "#3390ec",
  buttonText: "#ffffff",
  destructive: "#d94b4b",
  divider: "#e2e5e9",
};

export function getTelegram() {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const tg = getTelegram();
  const root = document.documentElement;
  const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)");

  const apply = (palette, params = {}) => {
    const colors = {
      bg: params.bg_color || palette.bg,
      secondary: params.secondary_bg_color || palette.secondary,
      section: params.section_bg_color || palette.section,
      text: params.text_color || palette.text,
      hint: params.hint_color || palette.hint,
      link: params.link_color || palette.link,
      button: params.button_color || palette.button,
      buttonText: params.button_text_color || palette.buttonText,
      destructive: params.destructive_text_color || palette.destructive,
    };
    root.style.setProperty("--tg-bg", colors.bg);
    root.style.setProperty("--tg-secondary-bg", colors.secondary);
    root.style.setProperty("--tg-section-bg", colors.section);
    root.style.setProperty("--tg-text", colors.text);
    root.style.setProperty("--tg-hint", colors.hint);
    root.style.setProperty("--tg-link", colors.link);
    root.style.setProperty("--tg-button", colors.button);
    root.style.setProperty("--tg-button-text", colors.buttonText);
    root.style.setProperty("--tg-destructive", colors.destructive);
    root.style.setProperty("--tg-divider", colors.divider);
    root.style.colorScheme = (tg?.colorScheme ?? (systemTheme?.matches ? "dark" : "light"));
    document.body.style.background = colors.bg;
  };

  const applyCurrentTheme = () => {
    const dark = tg ? tg.colorScheme === "dark" : Boolean(systemTheme?.matches);
    const palette = dark ? DARK : LIGHT;
    apply(palette, tg?.themeParams);
    tg?.setHeaderColor?.(tg.themeParams?.bg_color || palette.bg);
    tg?.setBackgroundColor?.(tg.themeParams?.bg_color || palette.bg);
  };

  applyCurrentTheme();
  if (!tg) {
    systemTheme?.addEventListener?.("change", applyCurrentTheme);
    return;
  }

  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
  tg.onEvent?.("themeChanged", applyCurrentTheme);
}

export function haptic(type = "light") {
  getTelegram()?.HapticFeedback?.impactOccurred(type);
}

export function notify(type = "success") {
  getTelegram()?.HapticFeedback?.notificationOccurred(type);
}

export function confirmAction(message) {
  const tg = getTelegram();
  if (tg?.showConfirm) {
    return new Promise((resolve) => tg.showConfirm(message, resolve));
  }
  return Promise.resolve(window.confirm(message));
}
