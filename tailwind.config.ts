import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        viracis: {
          navy: '#0A2540',
          cyan: '#0099B8',
          'cyan-hover': '#007A94',
          'cyan-light': '#E0F4F8',
          'cyan-hero': '#4DD8E8',
        },
        gray: {
          50: '#F5F7F9',
          200: '#D6DEE3',
          400: '#8FA3B3',
          600: '#4A6274',
          900: '#0A2540',
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
