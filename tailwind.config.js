/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mermaid: ["Mermaid", "cursive"],
        dmsans: ["DM Sans", "sans-serif"]
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
        
        
        // Default tailwind config colors that will stick around for now so I don't break any shadcn styling
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // secondary: {
        //   DEFAULT: "hsl(var(--secondary))",
        //   foreground: "hsl(var(--secondary-foreground))",
        // },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // accent: {
        //   DEFAULT: "hsl(var(--accent))",
        //   foreground: "hsl(var(--accent-foreground))",
        // },
        // destructive: {
        //   DEFAULT: "hsl(var(--destructive))",
        //   foreground: "hsl(var(--destructive-foreground))",
        // },
        // border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        backgroundColor: {
          light: "var(--white-color)",
          dark: "var(--black-color)",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
