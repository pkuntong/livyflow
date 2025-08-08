// Design Tokens for LivyFlow Design System
// These tokens provide the foundation for consistent theming across the application

export const designTokens = {
  // Color Palette
  colors: {
    // Primary brand colors (Emerald for financial growth)
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Primary brand color
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    
    // Secondary colors (Blue for trust and reliability)
    secondary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    
    // Neutral colors (Gray scale)
    neutral: {
      0: '#ffffff',
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    
    // Semantic colors
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    
    info: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
  },
  
  // Typography Scale
  typography: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
      '5xl': ['3rem', { lineHeight: '3rem' }],        // 48px
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },
  
  // Spacing Scale (based on 4px base unit)
  spacing: {
    0: '0px',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
  },
  
  // Border Radius Scale
  borderRadius: {
    none: '0px',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },
  
  // Shadow Scale
  boxShadow: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: '0 0 #0000',
  },
  
  // Component-specific tokens
  components: {
    button: {
      height: {
        sm: '2rem',    // 32px
        base: '2.5rem', // 40px
        lg: '3rem',     // 48px
      },
      padding: {
        sm: { x: '0.75rem', y: '0.5rem' },     // px-3 py-2
        base: { x: '1rem', y: '0.625rem' },    // px-4 py-2.5
        lg: { x: '1.25rem', y: '0.75rem' },    // px-5 py-3
      },
    },
    input: {
      height: {
        sm: '2rem',     // 32px
        base: '2.5rem', // 40px
        lg: '3rem',     // 48px
      },
      padding: {
        sm: '0.5rem',   // p-2
        base: '0.75rem', // p-3
        lg: '1rem',     // p-4
      },
    },
    card: {
      padding: {
        sm: '1rem',     // p-4
        base: '1.5rem', // p-6
        lg: '2rem',     // p-8
      },
      borderRadius: '0.5rem', // rounded-lg
    },
  },
  
  // Animation & Transition
  animation: {
    duration: {
      fastest: '100ms',
      fast: '200ms',
      base: '300ms',
      slow: '500ms',
      slowest: '1000ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
};

// Semantic color mappings for easier component usage
export const semanticColors = {
  background: {
    primary: designTokens.colors.neutral[0],
    secondary: designTokens.colors.neutral[50],
    tertiary: designTokens.colors.neutral[100],
  },
  text: {
    primary: designTokens.colors.neutral[900],
    secondary: designTokens.colors.neutral[600],
    tertiary: designTokens.colors.neutral[500],
    inverse: designTokens.colors.neutral[0],
  },
  border: {
    primary: designTokens.colors.neutral[200],
    secondary: designTokens.colors.neutral[300],
    focus: designTokens.colors.primary[500],
  },
  interactive: {
    primary: designTokens.colors.primary[600],
    'primary-hover': designTokens.colors.primary[700],
    secondary: designTokens.colors.secondary[600],
    'secondary-hover': designTokens.colors.secondary[700],
  },
  status: {
    success: designTokens.colors.success[600],
    'success-bg': designTokens.colors.success[50],
    warning: designTokens.colors.warning[600],
    'warning-bg': designTokens.colors.warning[50],
    error: designTokens.colors.error[600],
    'error-bg': designTokens.colors.error[50],
    info: designTokens.colors.info[600],
    'info-bg': designTokens.colors.info[50],
  },
};

export default designTokens;