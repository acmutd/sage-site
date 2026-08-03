/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        mermaid: ["Mermaid", "cursive"],
        dmsans: ["DM Sans", "sans-serif"],
      },
      borderRadius: {
        lg: "42px",
        md: "18px",
        sm: "8px",
      },
      colors: {
        accent: "#5AED86",
        secondary: "#D3E2D8",
        destructive: "#DB0000",

        bglight: "#F9FBF9",
        bgdark: "#101211",
        border: "#CBD5E1",
        innercontainer: "#F4F4F4",

        textlight: "#ECF8F0",
        textdark: "#0F172A",
        textsecondary: "#6C6C6C",

        buttonhover: "#4DCC73",
        buttondisabled: "#DDDDDD",
      },
    },
  },
};
