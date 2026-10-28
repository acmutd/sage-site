import uiPreset from "../packages/ui/tailwind.preset.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "../packages/ui/src/**/*.{js,ts,jsx,tsx}"],
  presets: [uiPreset],
  theme: {
    extend: {
      fontFamily: {
        // Google's sign-in button branding requires Roboto
        roboto: ["Roboto", "sans-serif"],
      },
      colors: {
        google: {
          border: "#DADCE0",
          text: "#3C4043",
        },
      },
    },
  },
};
