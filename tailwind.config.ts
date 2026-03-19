import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "Georgia", "serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#1a1a2e",
          soft: "#2d2d44",
          muted: "#6b6b8a",
        },
        paper: {
          DEFAULT: "#f8f7f4",
          warm: "#fffef9",
          border: "#e8e5de",
        },
        accent: {
          DEFAULT: "#c4783a",
          light: "#d4924f",
          dark: "#a05e28",
        },
        success: "#2d7a4f",
        error: "#c4423a",
      },
      boxShadow: {
        card: "0 1px 3px rgba(26,26,46,0.08), 0 4px 16px rgba(26,26,46,0.04)",
        "card-hover": "0 4px 8px rgba(26,26,46,0.12), 0 12px 32px rgba(26,26,46,0.08)",
        input: "inset 0 1px 3px rgba(26,26,46,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
