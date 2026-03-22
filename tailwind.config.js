/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        bg: {
          900: "#0a0a0f",
          800: "#0f0f1a",
          700: "#141420",
          600: "#1a1a2e",
        },
        accent: {
          primary: "#6ee7f7",
          secondary: "#a78bfa",
          green: "#4ade80",
          orange: "#fb923c",
          red: "#f87171",
          yellow: "#facc15",
        },
        border: {
          subtle: "rgba(110, 231, 247, 0.1)",
          DEFAULT: "rgba(110, 231, 247, 0.2)",
          strong: "rgba(110, 231, 247, 0.4)",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(110,231,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,247,0.03) 1px, transparent 1px)",
        "glow-radial":
          "radial-gradient(ellipse at center, rgba(110,231,247,0.15) 0%, transparent 70%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
    },
  },
  plugins: [],
};
