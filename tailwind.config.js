/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mermaid: ["Mermaid", "cursive"], // Fallback to cursive if Mermaid fails
        dmsans: ["DMSans", "cursive"],
      },
    },
  },
  plugins: [],
};
