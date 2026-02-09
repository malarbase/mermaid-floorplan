/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './floorplan-viewer/index.html',
    './floorplan-viewer/src/**/*.{js,ts,jsx,tsx}',
    './floorplan-editor/index.html',
    './floorplan-editor/src/**/*.{js,ts,jsx,tsx}',
    './floorplan-viewer-core/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Preserve existing layout CSS variables for panel positioning
      spacing: {
        header: 'var(--layout-header-height, 40px)',
        editor: 'var(--layout-editor-width, 0px)',
      },
      transitionDuration: {
        // Keep existing animation timing
        panel: '300ms',
      },
      transitionTimingFunction: {
        panel: 'ease',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        // Light theme matching existing app colors
        light: {
          primary: '#4a90d9', // Current accent color (buttons, links)
          'primary-content': '#ffffff',
          secondary: '#666666', // Secondary button color
          'secondary-content': '#ffffff',
          accent: '#4a90d9',
          'accent-content': '#ffffff',
          neutral: '#333333',
          'neutral-content': '#ffffff',
          'base-100': '#ffffff', // Main background
          'base-200': '#f8f8f8', // Panel backgrounds (.fp-section-header)
          'base-300': '#f0f0f0', // Hover states
          'base-content': '#333333', // Text color
          info: '#4a90d9',
          'info-content': '#ffffff',
          success: '#4a4', // Success states (.fp-editor-status.success)
          'success-content': '#ffffff',
          warning: '#f5a623', // Warning alerts
          'warning-content': '#333333',
          error: '#f44336', // Error states (.error-banner, .fp-editor-status.error)
          'error-content': '#ffffff',
        },
      },
      {
        // Dark theme matching existing app colors
        dark: {
          primary: '#4a90d9', // Same accent color
          'primary-content': '#ffffff',
          secondary: '#666666',
          'secondary-content': '#ffffff',
          accent: '#4a90d9',
          'accent-content': '#ffffff',
          neutral: '#e0e0e0',
          'neutral-content': '#1a1a1a',
          'base-100': '#1a1a1a', // Main background (body dark theme)
          'base-200': '#252526', // Panel backgrounds (#editor-panel-header)
          'base-300': '#2d2d2d', // Hover states, secondary panels
          'base-content': '#e0e0e0', // Text color
          info: '#4a90d9',
          'info-content': '#ffffff',
          success: '#8f8', // Success states (bright green in dark)
          'success-content': '#1a1a1a',
          warning: '#f5a623',
          'warning-content': '#1a1a1a',
          error: '#f44336',
          'error-content': '#ffffff',
        },
      },
    ],
    // Don't add dark class, use data-theme attribute
    darkTheme: 'dark',
    // Styling options
    styled: true,
    base: true,
    utils: true,
    logs: true,
    themeRoot: ':root',
  },
};
