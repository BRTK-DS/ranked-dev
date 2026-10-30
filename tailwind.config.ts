import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    background: "hsl(240 10% 4%)", foreground: "hsl(0 0% 98%)",
    card: "hsl(240 7% 8%)", border: "hsl(240 5% 18%)",
    primary: "hsl(158 64% 52%)", muted: "hsl(240 4% 16%)",
    "muted-foreground": "hsl(240 5% 65%)"
  } } }, plugins: []
} satisfies Config;
