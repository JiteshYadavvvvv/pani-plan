import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "var(--color-ivory)",
        cream: "var(--color-cream)",
        surface: "var(--color-surface)",
        forest: {
          DEFAULT: "var(--color-forest)",
          dark: "var(--color-forest-dark)",
        },
        sage: {
          DEFAULT: "var(--color-sage)",
          light: "var(--color-sage-light)",
        },
        gold: {
          DEFAULT: "var(--color-gold)",
          light: "var(--color-gold-light)",
        },
        earth: {
          DEFAULT: "var(--color-earth)",
          light: "var(--color-earth-light)",
        },
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        stress: {
          low: "var(--color-stress-low)",
          "low-bg": "var(--color-stress-low-bg)",
          "low-border": "var(--color-stress-low-border)",
          moderate: "var(--color-stress-moderate)",
          "moderate-bg": "var(--color-stress-moderate-bg)",
          "moderate-border": "var(--color-stress-moderate-border)",
          high: "var(--color-stress-high)",
          "high-bg": "var(--color-stress-high-bg)",
          "high-border": "var(--color-stress-high-border)",
          severe: "var(--color-stress-severe)",
          "severe-bg": "var(--color-stress-severe-bg)",
          "severe-border": "var(--color-stress-severe-border)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
