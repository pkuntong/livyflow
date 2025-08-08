import React, { forwardRef } from 'react';
import { cn } from '../utils/cn';

// Progress variant configurations
const progressVariants = {
  base: "relative overflow-hidden transition-all duration-300",
  
  // Size variants
  sizes: {
    sm: "h-1",
    base: "h-2", 
    lg: "h-3",
    xl: "h-4",
  },
  
  // Style variants
  variants: {
    default: "bg-neutral-200",
    primary: "bg-primary-100",
    success: "bg-success-100",
    warning: "bg-warning-100", 
    error: "bg-error-100",
  },
  
  // Bar color variants
  barColors: {
    default: "bg-neutral-600",
    primary: "bg-primary-600",
    success: "bg-success-600",
    warning: "bg-warning-600",
    error: "bg-error-600",
  },
  
  // Shape variants
  shapes: {
    default: "rounded-full",
    square: "rounded-none",
    rounded: "rounded-md",
  }
};

/**
 * Progress Component
 * 
 * A flexible progress bar component for showing completion status, loading states,
 * and quantitative progress indicators like budget usage.
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Progress value (0-100)
 * @param {number} props.max - Maximum value (default: 100)
 * @param {'default' | 'primary' | 'success' | 'warning' | 'error'} props.variant - Color variant
 * @param {'sm' | 'base' | 'lg' | 'xl'} props.size - Progress bar height
 * @param {'default' | 'square' | 'rounded'} props.shape - Progress bar shape
 * @param {boolean} props.animated - Enable animation
 * @param {boolean} props.striped - Show striped pattern
 * @param {boolean} props.showValue - Show percentage text
 * @param {string} props.label - Accessible label
 * @param {string} props.className - Additional CSS classes
 */
const Progress = forwardRef(({
  value = 0,
  max = 100,
  variant = 'primary',
  size = 'base',
  shape = 'default',
  animated = false,
  striped = false,
  showValue = false,
  label,
  className,
  ...props
}, ref) => {
  // Ensure value is within bounds
  const clampedValue = Math.max(0, Math.min(value, max));
  const percentage = (clampedValue / max) * 100;

  // Determine color variant based on percentage for smart color changing
  const getSmartVariant = (percentage) => {
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    if (percentage >= 60) return 'success';
    return 'primary';
  };

  const smartVariant = variant === 'auto' ? getSmartVariant(percentage) : variant;

  // Progress bar classes
  const progressClasses = cn(
    progressVariants.base,
    progressVariants.sizes[size],
    progressVariants.variants[smartVariant],
    progressVariants.shapes[shape],
    className
  );

  // Progress fill classes
  const fillClasses = cn(
    "h-full transition-all duration-500 ease-out",
    progressVariants.barColors[smartVariant],
    animated && "animate-pulse",
    striped && "bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:2rem_100%] animate-[slide_1s_infinite_linear]"
  );

  const ariaProps = {
    'aria-valuenow': clampedValue,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label || `Progress: ${percentage.toFixed(1)}%`,
  };

  return (
    <div className="space-y-1">
      {/* Progress bar */}
      <div
        ref={ref}
        role="progressbar"
        className={progressClasses}
        {...ariaProps}
        {...props}
      >
        <div
          className={fillClasses}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Value display */}
      {showValue && (
        <div className="flex justify-between items-center text-xs text-neutral-600">
          <span>{clampedValue}</span>
          <span>{percentage.toFixed(1)}%</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
});

Progress.displayName = 'Progress';

/**
 * Budget Progress Component
 * Specialized progress bar for budget tracking with spending indicators
 */
const BudgetProgress = forwardRef(({
  spent = 0,
  budget = 0,
  currency = '$',
  showAmounts = true,
  showPercentage = true,
  className,
  ...props
}, ref) => {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  
  // Determine status based on spending
  const getStatus = (percentage) => {
    if (percentage >= 100) return { variant: 'error', label: 'Over Budget' };
    if (percentage >= 80) return { variant: 'warning', label: 'Near Limit' };
    return { variant: 'success', label: 'On Track' };
  };

  const status = getStatus(percentage);
  const remaining = Math.max(0, budget - spent);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <Progress
        ref={ref}
        value={spent}
        max={budget}
        variant={status.variant}
        size="lg"
        label={`Budget progress: ${percentage.toFixed(1)}% used`}
        {...props}
      />
      
      {/* Budget details */}
      <div className="flex items-center justify-between text-sm">
        {showAmounts && (
          <div className="flex items-center gap-4">
            <span className="text-neutral-600">
              Spent: <span className="font-medium text-neutral-900">{currency}{spent.toFixed(2)}</span>
            </span>
            <span className="text-neutral-600">
              Remaining: <span className={cn(
                "font-medium",
                remaining < 0 ? "text-error-600" : "text-neutral-900"
              )}>{currency}{remaining.toFixed(2)}</span>
            </span>
          </div>
        )}
        
        {showPercentage && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              status.variant === 'error' && "bg-error-100 text-error-700",
              status.variant === 'warning' && "bg-warning-100 text-warning-700", 
              status.variant === 'success' && "bg-success-100 text-success-700"
            )}>
              {status.label}
            </span>
            <span className="text-neutral-600 font-medium">
              {percentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

BudgetProgress.displayName = 'BudgetProgress';

/**
 * Loading Progress Component
 * Specialized progress bar for loading states
 */
const LoadingProgress = forwardRef(({
  indeterminate = false,
  size = 'base',
  className,
  ...props
}, ref) => {
  if (indeterminate) {
    return (
      <div
        ref={ref}
        className={cn(
          progressVariants.base,
          progressVariants.sizes[size],
          progressVariants.variants.primary,
          progressVariants.shapes.default,
          className
        )}
        {...props}
      >
        <div className="h-full bg-primary-600 animate-[loading_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary-600 to-transparent bg-[length:200%_100%]" />
      </div>
    );
  }

  return (
    <Progress
      ref={ref}
      size={size}
      variant="primary"
      animated
      className={className}
      {...props}
    />
  );
});

LoadingProgress.displayName = 'LoadingProgress';

/**
 * Multi Step Progress Component
 * Progress bar with step indicators
 */
const MultiStepProgress = forwardRef(({
  currentStep = 1,
  totalSteps = 1,
  steps = [],
  size = 'base',
  className,
  ...props
}, ref) => {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Step labels */}
      {steps.length > 0 && (
        <div className="flex justify-between text-xs">
          {steps.map((step, index) => (
            <span
              key={index}
              className={cn(
                "font-medium",
                index < currentStep 
                  ? "text-primary-600" 
                  : index === currentStep - 1
                  ? "text-neutral-900"
                  : "text-neutral-400"
              )}
            >
              {step}
            </span>
          ))}
        </div>
      )}
      
      {/* Progress bar */}
      <Progress
        ref={ref}
        value={percentage}
        size={size}
        variant="primary"
        label={`Step ${currentStep} of ${totalSteps}`}
        {...props}
      />
      
      {/* Step counter */}
      <div className="text-center text-sm text-neutral-600">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
});

MultiStepProgress.displayName = 'MultiStepProgress';

// Export all components
export { Progress, BudgetProgress, LoadingProgress, MultiStepProgress };
export default Progress;