/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '"Segoe UI"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#ecf8ff",
          100: "#d9edff",
          200: "#a7d5ff",
          300: "#74baff",
          400: "#3696f6",
          500: "#1f7bdd",
          600: "#155fb0",
          700: "#0d437f",
          800: "#072a52",
          900: "#03162d",
        },
        ink: {
          50: "#f6f8fb",
          100: "#eaeef5",
          200: "#d5ddeb",
          300: "#b0bfd9",
          400: "#7b92b8",
          500: "#526c95",
          600: "#3c5376",
          700: "#2c3f5b",
          800: "#1f2d42",
          900: "#151f2d",
        },
      },
      boxShadow: {
        card: "0 10px 40px rgba(5, 15, 35, 0.12)",
      },
    },
  },
  plugins: [],
};
