import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

// Button variant configurations
const buttonVariants = {
  // Base styles for all buttons
  base: "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  
  // Variant styles
  variants: {
    primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-200",
    secondary: "bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-200",
    outline: "border border-primary-600 text-primary-600 bg-transparent hover:bg-primary-50 focus:ring-primary-200",
    ghost: "text-neutral-700 bg-transparent hover:bg-neutral-100 focus:ring-neutral-200",
    danger: "bg-error-600 text-white hover:bg-error-700 focus:ring-error-200",
    success: "bg-success-600 text-white hover:bg-success-700 focus:ring-success-200",
    warning: "bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-200",
  },
  
  // Size styles
  sizes: {
    sm: "h-8 px-3 py-2 text-sm",
    base: "h-10 px-4 py-2.5 text-sm",
    lg: "h-12 px-5 py-3 text-base",
    xl: "h-14 px-6 py-4 text-lg",
  },
  
  // Icon-only styles
  iconOnly: {
    sm: "h-8 w-8 p-0",
    base: "h-10 w-10 p-0",
    lg: "h-12 w-12 p-0",
    xl: "h-14 w-14 p-0",
  },
};

/**
 * Button Component
 * 
 * A flexible button component with multiple variants, sizes, and states.
 * Built with accessibility in mind and follows the LivyFlow design system.
 * 
 * @param {Object} props - Component props
 * @param {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'} props.variant - Button style variant
 * @param {'sm' | 'base' | 'lg' | 'xl'} props.size - Button size
 * @param {boolean} props.loading - Show loading spinner
 * @param {boolean} props.disabled - Disable button
 * @param {boolean} props.iconOnly - Style as icon-only button
 * @param {React.ReactNode} props.leftIcon - Icon to show on the left
 * @param {React.ReactNode} props.rightIcon - Icon to show on the right
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {Function} props.onClick - Click handler
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'base',
  loading = false,
  disabled = false,
  iconOnly = false,
  leftIcon,
  rightIcon,
  className,
  children,
  type = 'button',
  onClick,
  ...props
}, ref) => {
  // Build className based on variant and size
  const buttonClass = cn(
    buttonVariants.base,
    buttonVariants.variants[variant],
    iconOnly ? buttonVariants.iconOnly[size] : buttonVariants.sizes[size],
    className
  );

  // Handle loading state
  const isDisabled = disabled || loading;

  // Loading spinner component
  const LoadingSpinner = () => (
    <Loader2 className="w-4 h-4 animate-spin" />
  );

  // Icon size based on button size
  const getIconSize = (size) => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'base': return 'w-4 h-4';
      case 'lg': return 'w-5 h-5';
      case 'xl': return 'w-6 h-6';
      default: return 'w-4 h-4';
    }
  };

  // Clone icons with appropriate sizing
  const cloneIcon = (icon) => {
    if (!icon) return null;
    return React.cloneElement(icon, {
      className: cn(getIconSize(size), icon.props?.className)
    });
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={buttonClass}
      aria-disabled={isDisabled}
      {...props}
    >
      {/* Loading state */}
      {loading && (
        <>
          <LoadingSpinner />
          {!iconOnly && <span className="sr-only">Loading...</span>}
        </>
      )}
      
      {/* Left icon */}
      {!loading && leftIcon && (
        <span className={iconOnly ? '' : 'mr-2'}>
          {cloneIcon(leftIcon)}
        </span>
      )}
      
      {/* Button content */}
      {!iconOnly && !loading && children}
      {iconOnly && !loading && (leftIcon || rightIcon || children)}
      
      {/* Right icon */}
      {!loading && rightIcon && !iconOnly && (
        <span className="ml-2">
          {cloneIcon(rightIcon)}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

// Export button variants for external use
export { buttonVariants };