import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-crimson-text)", "Georgia", "serif"],
        serif: ["var(--font-cinzel-decorative)", "Cinzel", "serif"],
        mono: ["var(--font-medieval-sharp)", "monospace"],
        heading: ["Coroy", "serif"],   // ← YEH ADD KARO

      },
      colors: {
        gold: {
          50: "#fdf9e7",
          100: "#faf0c3",
          200: "#f5e085",
          300: "#edc847",
          400: "#e4b020",
          500: "#d4af37",
          600: "#b8942f",
          700: "#936f28",
          800: "#785827",
          900: "#664925",
        },
        crimson: {
          50: "#fdf2f2",
          100: "#fce7e7",
          200: "#fad3d3",
          300: "#f5afaf",
          400: "#ee7f7f",
          500: "#dc143c",
          600: "#c21235",
          700: "#a30e2c",
          800: "#870d27",
          900: "#710f25",
        },
        parchment: {
          50: "#fefdfb",
          100: "#fcf7f0",
          200: "#f8ebdc",
          300: "#f2d9be",
          400: "#e8c099",
          500: "#d9a66d",
          600: "#c98a4d",
          700: "#a86e3e",
          800: "#885838",
          900: "#6f4a31",
        },
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "ember": "ember 3s ease-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "marquee": "marquee 30s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        ember: {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-100px) scale(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(212, 175, 55, 0.6)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "medieval-pattern": `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='%23d4af37' stroke-width='0.5' opacity='0.1'/%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
};

export default config;
