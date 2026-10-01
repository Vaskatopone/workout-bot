/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-bg)",
          secondary: "var(--tg-secondary-bg)",
          section: "var(--tg-section-bg)",
          text: "var(--tg-text)",
          hint: "var(--tg-hint)",
          link: "var(--tg-link)",
          button: "var(--tg-button)",
          buttonText: "var(--tg-button-text)",
          destructive: "var(--tg-destructive)",
          divider: "var(--tg-divider)",
        },
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset",
      },
    },
  },
  plugins: [],
};
