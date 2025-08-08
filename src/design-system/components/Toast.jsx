import React, { useState, useEffect, forwardRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

// Toast variant configurations
const toastVariants = {
  base: "relative w-full max-w-sm p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 ease-out",
  
  // Style variants
  variants: {
    default: "bg-white border-neutral-200 text-neutral-900",
    success: "bg-white border-success-200 text-success-900",
    error: "bg-white border-error-200 text-error-900", 
    warning: "bg-white border-warning-200 text-warning-900",
    info: "bg-white border-info-200 text-info-900",
  },
  
  // Solid variants
  solid: {
    default: "bg-neutral-900 border-neutral-900 text-white",
    success: "bg-success-600 border-success-600 text-white",
    error: "bg-error-600 border-error-600 text-white",
    warning: "bg-warning-600 border-warning-600 text-white",
    info: "bg-info-600 border-info-600 text-white",
  },
  
  // Animation states
  animations: {
    enter: "animate-in slide-in-from-right-full fade-in-0 duration-300",
    exit: "animate-out slide-out-to-right-full fade-out-0 duration-300",
  }
};

// Toast icons mapping
const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  default: Info,
};

// Toast icon colors
const iconColors = {
  success: "text-success-500",
  error: "text-error-500", 
  warning: "text-warning-500",
  info: "text-info-500",
  default: "text-neutral-500",
};

/**
 * Toast Component
 * 
 * An enhanced toast notification component with better theming, animations,
 * and accessibility features following the LivyFlow design system.
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Toast message content
 * @param {React.ReactNode} props.title - Optional toast title
 * @param {'default' | 'success' | 'error' | 'warning' | 'info'} props.type - Toast type
 * @param {'default' | 'solid'} props.style - Toast style variant
 * @param {number} props.duration - Auto-dismiss duration in ms (0 to disable)
 * @param {boolean} props.dismissible - Show close button
 * @param {React.ReactNode} props.icon - Custom icon (overrides default)
 * @param {React.ReactNode} props.action - Action button/element
 * @param {Function} props.onClose - Close handler
 * @param {string} props.className - Additional CSS classes
 */
const Toast = forwardRef(({
  message,
  title,
  type = 'info',
  style = 'default',
  duration = 5000,
  dismissible = true,
  icon,
  action,
  onClose,
  className,
  ...props
}, ref) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  // Handle close with animation
  const handleClose = () => {
    if (onClose) {
      setIsExiting(true);
      // Wait for exit animation to complete
      setTimeout(() => {
        onClose();
      }, 300);
    }
  };

  // Don't render if not visible
  if (!isVisible && !isExiting) {
    return null;
  }

  // Get icon component
  const IconComponent = icon || toastIcons[type] || toastIcons.default;

  // Toast classes
  const toastClasses = cn(
    toastVariants.base,
    toastVariants[style][type] || toastVariants.variants[type],
    isExiting ? toastVariants.animations.exit : toastVariants.animations.enter,
    className
  );

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="polite"
      className={toastClasses}
      {...props}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {React.isValidElement(IconComponent) ? (
            IconComponent
          ) : (
            <IconComponent 
              className={cn(
                "w-5 h-5",
                style === 'solid' ? "text-white" : iconColors[type]
              )} 
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <div className={cn(
              "font-medium text-sm mb-1",
              style === 'solid' ? "text-white" : "text-current"
            )}>
              {title}
            </div>
          )}
          <div className={cn(
            "text-sm",
            style === 'solid' ? "text-white/90" : "text-current"
          )}>
            {message}
          </div>
          
          {/* Action */}
          {action && (
            <div className="mt-2">
              {action}
            </div>
          )}
        </div>

        {/* Close button */}
        {dismissible && (
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "flex-shrink-0 p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
              style === 'solid' 
                ? "text-white/70 hover:text-white focus:ring-white/50" 
                : "text-neutral-400 hover:text-neutral-600 focus:ring-neutral-200"
            )}
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress bar for timed toasts */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-current/20 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-current/60 animate-[toast-progress_var(--duration)_linear_forwards]"
            style={{ '--duration': `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
});

Toast.displayName = 'Toast';

/**
 * Toast Action Button Component
 * Styled button specifically for toast actions
 */
const ToastAction = forwardRef(({
  children,
  variant = 'ghost',
  className,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === 'ghost' && "text-current hover:bg-current/10 focus:ring-current/30",
        variant === 'solid' && "bg-current text-white hover:bg-current/90 focus:ring-current/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

ToastAction.displayName = 'ToastAction';

// Export components
export { Toast, ToastAction };
export default Toast;