/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agentA: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
        },
        agentB: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
        },
        agentC: {
          DEFAULT: '#6B7280',
          light: '#F3F4F6',
        },
      },
    },
  },
  plugins: [],
}

