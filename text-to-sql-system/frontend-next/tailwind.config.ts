import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        surface: "#18181b",
        surfaceSubtle: "#111113",
        border: "#27272a",
        primary: {
          500: "#6366f1",
          600: "#4f46e5",
        },
        data: {
          emerald: "#34d399",
          amber: "#f59e0b",
          rose: "#fb7185",
          blue: "#60a5fa",
          violet: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.85rem", { lineHeight: "1.3rem" }],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.35rem",
      },
    },
  },
  plugins: [],
};

export default config;
