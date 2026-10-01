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
};

export function getTelegram() {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const tg = getTelegram();
  const root = document.documentElement;

  const apply = (params = {}) => {
    root.style.setProperty("--tg-bg", params.bg_color || DARK.bg);
    root.style.setProperty("--tg-secondary-bg", params.secondary_bg_color || DARK.secondary);
    root.style.setProperty("--tg-section-bg", params.section_bg_color || DARK.section);
    root.style.setProperty("--tg-text", params.text_color || DARK.text);
    root.style.setProperty("--tg-hint", params.hint_color || DARK.hint);
    root.style.setProperty("--tg-link", params.link_color || DARK.link);
    root.style.setProperty("--tg-button", params.button_color || DARK.button);
    root.style.setProperty("--tg-button-text", params.button_text_color || DARK.buttonText);
    root.style.setProperty("--tg-destructive", params.destructive_text_color || DARK.destructive);
    document.body.style.background = params.bg_color || DARK.bg;
  };

  apply(DARK);
  if (!tg) return;

  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
  apply({ ...DARK, ...tg.themeParams });
  tg.setHeaderColor?.(DARK.bg);
  tg.setBackgroundColor?.(DARK.bg);
  tg.onEvent?.("themeChanged", () => apply({ ...DARK, ...tg.themeParams }));
}

export function haptic(type = "light") {
  getTelegram()?.HapticFeedback?.impactOccurred(type);
}

export function notify(type = "success") {
  getTelegram()?.HapticFeedback?.notificationOccurred(type);
}
