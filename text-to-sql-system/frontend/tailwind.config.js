/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
      extend: {
        colors: {
          primary: {
            50: "#f0f9ff",
            100: "#e0f2fe",
            200: "#bae6fd",
            300: "#7dd3fc",
            400: "#38bdf8",
            500: "#0ea5e9",
            600: "#0284c7",
            700: "#0369a1",
            800: "#075985",
            900: "#0c4a6e",
            950: "#082f49",
          },
          secondary: {
            50: "#f0fdfa",
            100: "#ccfbf1",
            200: "#99f6e4",
            300: "#5eead4",
            400: "#2dd4bf",
            500: "#14b8a6",
            600: "#0d9488",
            700: "#0f766e",
            800: "#115e59",
            900: "#134e4a",
            950: "#042f2e",
          },
        },
        fontFamily: {
          sans: [
            "Inter",
            "ui-sans-serif",
            "system-ui",
            "-apple-system",
            "sans-serif",
          ],
          mono: ["Fira Code", "ui-monospace", "monospace"],
        },
        boxShadow: {
          card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          "card-hover":
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
        animation: {
          "fade-in": "fadeIn 0.5s ease-in-out",
          "slide-up": "slideUp 0.5s ease-out",
          pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        },
        keyframes: {
          fadeIn: {
            "0%": { opacity: 0 },
            "100%": { opacity: 1 },
          },
          slideUp: {
            "0%": { transform: "translateY(10px)", opacity: 0 },
            "100%": { transform: "translateY(0)", opacity: 1 },
          },
          pulse: {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.5 },
          },
        },
      },
    },
    plugins: [],
  };