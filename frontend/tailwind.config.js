/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#f8fafc',
        surface:   '#ffffff',
        surface2:  '#f1f5f9',
        border:    '#e2e8f0',
        accent:    '#0891b2',       // cyan-600
        'accent-light': '#e0f2fe', // cyan-50
        pos:       '#16a34a',
        'pos-bg':  '#dcfce7',
        neg:       '#dc2626',
        'neg-bg':  '#fee2e2',
        neu:       '#64748b',
        'neu-bg':  '#f1f5f9',
        primary:   '#0f172a',
        secondary: '#64748b',
        dim:       '#94a3b8',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        sans:    ['"Instrument Sans"', 'sans-serif'],
      },
    },
  },
}
