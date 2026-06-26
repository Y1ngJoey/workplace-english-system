import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        card: "var(--card)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        slate: "var(--slate)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        pink: "var(--pink)",
        "pink-deep": "var(--pink-deep)",
        "pink-soft": "var(--pink-soft)",
        "pink-line": "var(--pink-line)",
        grape: "var(--grape)",
        "grape-deep": "var(--grape-deep)",
        "grape-soft": "var(--grape-soft)",
        "grape-line": "var(--grape-line)",
        mint: "var(--mint)",
        "mint-deep": "var(--mint-deep)",
        "mint-soft": "var(--mint-soft)",
        "mint-line": "var(--mint-line)",
        blue: "var(--blue)",
        "blue-deep": "var(--blue-deep)",
        "blue-soft": "var(--blue-soft)",
        "blue-line": "var(--blue-line)",
      },
      boxShadow: {
        milk: "var(--shadow)",
      },
      borderRadius: {
        pill: "99px",
      },
      fontFamily: {
        display: ["var(--font-baloo)", "Nunito", "Noto Sans SC", "sans-serif"],
        sans: ["var(--font-nunito)", "var(--font-noto-sans-sc)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
