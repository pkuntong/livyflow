import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';

// Input variant configurations
const inputVariants = {
  base: "w-full transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  
  // Size variants
  sizes: {
    sm: "h-8 px-3 py-1.5 text-sm",
    base: "h-10 px-3 py-2.5 text-sm",
    lg: "h-12 px-4 py-3 text-base",
  },
  
  // Style variants
  variants: {
    default: "border border-neutral-300 bg-white rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500",
    filled: "border-2 border-transparent bg-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500 focus:bg-white",
    underlined: "border-0 border-b-2 border-neutral-300 bg-transparent rounded-none px-0 focus:ring-0 focus:border-primary-500",
  },
  
  // State variants
  states: {
    default: "",
    error: "border-error-500 focus:ring-error-200 focus:border-error-500",
    success: "border-success-500 focus:ring-success-200 focus:border-success-500",
    warning: "border-warning-500 focus:ring-warning-200 focus:border-warning-500",
  }
};

/**
 * Label Component for form fields
 */
const Label = forwardRef(({ 
  children, 
  required = false, 
  className, 
  htmlFor,
  ...props 
}, ref) => (
  <label
    ref={ref}
    htmlFor={htmlFor}
    className={cn(
      "block text-sm font-medium text-neutral-700 mb-1",
      className
    )}
    {...props}
  >
    {children}
    {required && (
      <span className="text-error-500 ml-1" aria-label="required">*</span>
    )}
  </label>
));

Label.displayName = 'Label';

/**
 * Helper text component
 */
const HelperText = ({ children, state, className }) => {
  const stateStyles = {
    error: "text-error-600",
    success: "text-success-600", 
    warning: "text-warning-600",
    default: "text-neutral-500",
  };

  const StateIcon = {
    error: AlertCircle,
    success: CheckCircle,
    warning: AlertCircle,
  }[state];

  return (
    <div className={cn("flex items-start gap-1 mt-1", className)}>
      {StateIcon && <StateIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />}
      <span className={cn("text-xs", stateStyles[state] || stateStyles.default)}>
        {children}
      </span>
    </div>
  );
};

/**
 * Base Input Component
 */
const Input = forwardRef(({
  type = 'text',
  size = 'base',
  variant = 'default',
  state = 'default',
  placeholder,
  disabled = false,
  required = false,
  leftIcon,
  rightIcon,
  className,
  id,
  name,
  value,
  onChange,
  onFocus,
  onBlur,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  // Build input classes
  const inputClasses = cn(
    inputVariants.base,
    inputVariants.sizes[size],
    inputVariants.variants[variant],
    inputVariants.states[state],
    leftIcon && "pl-10",
    (rightIcon || isPassword) && "pr-10",
    className
  );

  // Icon sizing based on input size
  const getIconSize = (size) => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'base': return 'w-4 h-4';  
      case 'lg': return 'w-5 h-5';
      default: return 'w-4 h-4';
    }
  };

  // Icon positioning based on input size
  const getIconPosition = (size, position) => {
    const positions = {
      sm: { left: 'left-2.5', right: 'right-2.5' },
      base: { left: 'left-3', right: 'right-3' },
      lg: { left: 'left-3', right: 'right-3' },
    };
    return positions[size]?.[position] || positions.base[position];
  };

  const iconClasses = cn(
    "absolute top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none",
    getIconSize(size)
  );

  return (
    <div className="relative">
      {/* Left Icon */}
      {leftIcon && (
        <div className={cn(iconClasses, getIconPosition(size, 'left'))}>
          {React.cloneElement(leftIcon, {
            className: cn(getIconSize(size), leftIcon.props?.className)
          })}
        </div>
      )}

      {/* Input Element */}
      <input
        ref={ref}
        id={id}
        name={name}
        type={inputType}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClasses}
        aria-invalid={state === 'error'}
        aria-describedby={ariaDescribedBy}
        {...props}
      />

      {/* Right Icon or Password Toggle */}
      {(rightIcon || isPassword) && (
        <div className={cn(
          "absolute top-1/2 transform -translate-y-1/2",
          getIconPosition(size, 'right')
        )}>
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                "text-neutral-400 hover:text-neutral-600 focus:outline-none focus:text-neutral-600",
                getIconSize(size)
              )}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          ) : (
            <div className={cn(iconClasses, "pointer-events-none")}>
              {React.cloneElement(rightIcon, {
                className: cn(getIconSize(size), rightIcon.props?.className)
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Textarea Component
 */
const Textarea = forwardRef(({
  size = 'base',
  variant = 'default', 
  state = 'default',
  rows = 3,
  resize = 'vertical',
  className,
  ...props
}, ref) => {
  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x', 
    both: 'resize',
  };

  const textareaClasses = cn(
    inputVariants.base,
    inputVariants.variants[variant],
    inputVariants.states[state],
    "py-2 px-3 min-h-[2.5rem]", // Base padding and min-height
    resizeClasses[resize],
    className
  );

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={textareaClasses}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

/**
 * FormField Component - Combines Label, Input, and HelperText
 */
const FormField = ({
  label,
  helperText,
  errorMessage,
  successMessage,
  required = false,
  children,
  className,
  id,
  ...props
}) => {
  // Determine state based on messages
  let state = 'default';
  let message = helperText;

  if (errorMessage) {
    state = 'error';
    message = errorMessage;
  } else if (successMessage) {
    state = 'success';
    message = successMessage;
  }

  const fieldId = id || `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = message ? `${fieldId}-helper` : undefined;

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      
      <div>
        {React.cloneElement(children, {
          id: fieldId,
          required,
          state,
          'aria-describedby': helperId,
          ...props
        })}
      </div>
      
      {message && (
        <HelperText state={state} id={helperId}>
          {message}
        </HelperText>
      )}
    </div>
  );
};

// Export all components
export { Input, Textarea, Label, FormField, HelperText };
export default Input;