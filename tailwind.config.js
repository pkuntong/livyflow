/** @type {import('tailwindcss').Config} */
import { designTokens } from './src/design-system/tokens.js';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./Components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      // Design system colors
      colors: {
        primary: designTokens.colors.primary,
        secondary: designTokens.colors.secondary,
        neutral: designTokens.colors.neutral,
        success: designTokens.colors.success,
        warning: designTokens.colors.warning,
        error: designTokens.colors.error,
        info: designTokens.colors.info,
        
        // Legacy color mappings for backward compatibility
        gray: designTokens.colors.neutral,
        green: designTokens.colors.success,
        blue: designTokens.colors.secondary,
        red: designTokens.colors.error,
        yellow: designTokens.colors.warning,
        emerald: designTokens.colors.primary,
      },
      
      // Typography
      fontFamily: designTokens.typography.fontFamily,
      fontSize: designTokens.typography.fontSize,
      fontWeight: designTokens.typography.fontWeight,
      
      // Spacing
      spacing: designTokens.spacing,
      
      // Border radius
      borderRadius: designTokens.borderRadius,
      
      // Shadows
      boxShadow: designTokens.boxShadow,
      
      // Z-index
      zIndex: designTokens.zIndex,
      
      // Animation
      transitionDuration: designTokens.animation.duration,
      transitionTimingFunction: designTokens.animation.easing,
      
      // Custom component utilities
      height: {
        'button-sm': designTokens.components.button.height.sm,
        'button': designTokens.components.button.height.base,
        'button-lg': designTokens.components.button.height.lg,
        'input-sm': designTokens.components.input.height.sm,
        'input': designTokens.components.input.height.base,
        'input-lg': designTokens.components.input.height.lg,
      },
      
      // Custom spacing for components
      padding: {
        'card-sm': designTokens.components.card.padding.sm,
        'card': designTokens.components.card.padding.base,
        'card-lg': designTokens.components.card.padding.lg,
      },
    },
  },
  plugins: [
    // Custom utility classes for the design system
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Button variants
        '.btn-primary': {
          backgroundColor: theme('colors.primary.600'),
          color: theme('colors.white'),
          '&:hover': {
            backgroundColor: theme('colors.primary.700'),
          },
          '&:focus': {
            outline: '2px solid transparent',
            outlineOffset: '2px',
            boxShadow: `0 0 0 3px ${theme('colors.primary.200')}`,
          },
        },
        '.btn-secondary': {
          backgroundColor: theme('colors.secondary.600'),
          color: theme('colors.white'),
          '&:hover': {
            backgroundColor: theme('colors.secondary.700'),
          },
          '&:focus': {
            outline: '2px solid transparent',
            outlineOffset: '2px',
            boxShadow: `0 0 0 3px ${theme('colors.secondary.200')}`,
          },
        },
        '.btn-outline': {
          backgroundColor: 'transparent',
          color: theme('colors.primary.600'),
          borderWidth: '1px',
          borderColor: theme('colors.primary.600'),
          '&:hover': {
            backgroundColor: theme('colors.primary.50'),
          },
          '&:focus': {
            outline: '2px solid transparent',
            outlineOffset: '2px',
            boxShadow: `0 0 0 3px ${theme('colors.primary.200')}`,
          },
        },
        '.btn-ghost': {
          backgroundColor: 'transparent',
          color: theme('colors.neutral.700'),
          '&:hover': {
            backgroundColor: theme('colors.neutral.100'),
          },
          '&:focus': {
            outline: '2px solid transparent',
            outlineOffset: '2px',
            boxShadow: `0 0 0 3px ${theme('colors.neutral.200')}`,
          },
        },
        
        // Status variants
        '.status-success': {
          backgroundColor: theme('colors.success.50'),
          color: theme('colors.success.700'),
          borderColor: theme('colors.success.200'),
        },
        '.status-warning': {
          backgroundColor: theme('colors.warning.50'),
          color: theme('colors.warning.700'),
          borderColor: theme('colors.warning.200'),
        },
        '.status-error': {
          backgroundColor: theme('colors.error.50'),
          color: theme('colors.error.700'),
          borderColor: theme('colors.error.200'),
        },
        '.status-info': {
          backgroundColor: theme('colors.info.50'),
          color: theme('colors.info.700'),
          borderColor: theme('colors.info.200'),
        },
      };
      
      addUtilities(newUtilities);
    }
  ],
} 