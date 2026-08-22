import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#006565",
        "primary-container": "#008080",
        "on-primary": "#ffffff",
        "on-primary-container": "#e3fffe",
        "primary-fixed": "#93f2f2",
        "primary-fixed-dim": "#76d6d5",
        "on-primary-fixed": "#002020",
        "on-primary-fixed-variant": "#004f4f",
        "inverse-primary": "#76d6d5",

        secondary: "#096969",
        "secondary-container": "#a2f0ef",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#166f6f",
        "secondary-fixed": "#a2f0ef",
        "secondary-fixed-dim": "#86d4d3",
        "on-secondary-fixed": "#002020",
        "on-secondary-fixed-variant": "#004f4f",

        tertiary: "#4c43d3",
        "tertiary-container": "#665eed",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#fcf8ff",
        "tertiary-fixed": "#e3dfff",
        "tertiary-fixed-dim": "#c3c0ff",
        "on-tertiary-fixed": "#100069",
        "on-tertiary-fixed-variant": "#372abf",

        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        surface: "#f8f9ff",
        "surface-dim": "#ccdbf2",
        "surface-bright": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eef4ff",
        "surface-container": "#e5efff",
        "surface-container-high": "#dbe9ff",
        "surface-container-highest": "#d4e4fa",
        "surface-variant": "#d4e4fa",
        "surface-tint": "#006a6a",

        "on-surface": "#0d1c2d",
        "on-surface-variant": "#3e4949",
        "inverse-surface": "#233143",
        "inverse-on-surface": "#e9f1ff",

        background: "#f8f9ff",
        "on-background": "#0d1c2d",

        outline: "#6e7979",
        "outline-variant": "#bdc9c8",

        // Custom clinical brand
        "teal-brand": "#008080",
        "teal-light": "#E6F2F2",
        "teal-deep": "#006666",
        "navy-deep": "#0B1C30",
        "slate-charcoal": "#434654",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        card: "1rem",
        full: "9999px",
      },
      spacing: {
        baseline: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        gutter: "16px",
        "margin-mobile": "20px",
        "margin-tablet": "32px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        headline: ["var(--font-inter)", "Inter", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      boxShadow: {
        "level-1": "0 4px 12px 0 rgba(0, 0, 0, 0.04)",
        card: "0 4px 12px 0 rgba(0, 0, 0, 0.04)",
        floating: "0 8px 24px -4px rgba(0, 101, 101, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
