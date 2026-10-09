/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#006d36",
        "primary-container": "#35c76f",
        "on-primary": "#ffffff",
        "on-primary-container": "#004d24",
        "primary-fixed": "#72fd9e",
        "primary-fixed-dim": "#53e084",
        
        "secondary": "#006d35",
        "secondary-container": "#84f7a2",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#007237",
        "secondary-fixed": "#87faa5",
        "secondary-fixed-dim": "#6add8b",

        "tertiary": "#006a60",
        "tertiary-container": "#25c3b1",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#004b43",
        "tertiary-fixed": "#6df8e5",
        "tertiary-fixed-dim": "#4bdcc9",

        "surface": "#effdf4",
        "surface-dim": "#d0ddd5",
        "surface-bright": "#effdf4",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#e9f7ee",
        "surface-container": "#e3f1e8",
        "surface-container-high": "#deebe3",
        "surface-container-highest": "#d8e6dd",
        "surface-variant": "#d8e6dd",

        "on-surface": "#121e19",
        "on-surface-variant": "#3d4a3e",
        "outline": "#6d7b6d",
        "outline-variant": "#bccabb",

        "background": "#effdf4",
        "on-background": "#121e19",

        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        // Dark mode surface tokens
        "dark-surface": "#121e19",
        "dark-surface-card": "#1a2c24",
        "dark-surface-card-high": "#233930",
        "dark-border": "#2e483d"
      },
      borderRadius: {
        "sm": "0.25rem",
        "DEFAULT": "0.5rem",
        "md": "0.75rem",
        "lg": "1rem",
        "xl": "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        "full": "9999px"
      },
      spacing: {
        "2xs": "2px",
        "xs": "4px",
        "sm": "8px",
        "md": "12px",
        "base": "16px",
        "lg": "20px",
        "xl": "24px",
        "2xl": "32px",
        "3xl": "40px",
        "4xl": "48px",
        "screen-gutter": "20px",
        "card-gap": "16px"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Plus Jakarta Sans", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"]
      },
      boxShadow: {
        "ambient": "0 4px 20px -2px rgba(23, 32, 27, 0.04)",
        "glow-primary": "0 8px 24px -2px rgba(53, 199, 111, 0.35)",
        "glow-teal": "0 0 32px -4px rgba(39, 196, 178, 0.20), 0 4px 12px -2px rgba(53, 199, 111, 0.12)",
        "elevated": "0 10px 30px -4px rgba(0, 109, 54, 0.15)"
      }
    }
  },
  plugins: []
}
