/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2b2d30",
        mist: "#c9d6df",
        flame: "#ff4b2b",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        tile: "28px",
        inner: "20px",
      },
      spacing: { tile: "28px" },
      letterSpacing: { tightest: "-0.03em" },
      backgroundImage: {
        checker: "repeating-conic-gradient(#2b2d30 0 25%, #c9d6df 0 50%)",
        "checker-sm": "repeating-conic-gradient(#2b2d30 0 25%, #c9d6df 0 50%)",
      },
      backgroundSize: { checker: "20px 20px", "checker-sm": "12px 12px" },
    },
  },
  plugins: [],
};
