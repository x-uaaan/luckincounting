import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        input: "#dbeafe",      // blue cells = user input
        computed: "#f3f4f6",   // grey cells = auto-calculated
        warn: "#fecaca",       // red outline = validation warning
      },
    },
  },
  plugins: [],
};

export default config;
