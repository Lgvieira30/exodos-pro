import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f6f7f9',
        card: '#ffffff',
        section: '#191919',
        'green-decision': '#c6efce',
        'yellow-decision': '#fff2cc',
        'red-soft': '#f4cccc',
        'red-hard': '#ff7575',
        'gray-decision': '#e5e7eb',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
