import React, { forwardRef } from 'react';
import { cn } from '../utils/cn';

// Badge variant configurations
const badgeVariants = {
  base: "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  
  // Style variants
  variants: {
    default: "bg-neutral-100 text-neutral-900 border border-neutral-200",
    primary: "bg-primary-100 text-primary-800 border border-primary-200",
    secondary: "bg-secondary-100 text-secondary-800 border border-secondary-200",
    success: "bg-success-100 text-success-800 border border-success-200",
    warning: "bg-warning-100 text-warning-800 border border-warning-200",
    error: "bg-error-100 text-error-800 border border-error-200",
    info: "bg-info-100 text-info-800 border border-info-200",
  },
  
  // Solid variants
  solid: {
    default: "bg-neutral-900 text-white",
    primary: "bg-primary-600 text-white",
    secondary: "bg-secondary-600 text-white",
    success: "bg-success-600 text-white",
    warning: "bg-warning-600 text-white",
    error: "bg-error-600 text-white",
    info: "bg-info-600 text-white",
  },
  
  // Outline variants
  outline: {
    default: "bg-transparent text-neutral-900 border border-neutral-300",
    primary: "bg-transparent text-primary-600 border border-primary-300",
    secondary: "bg-transparent text-secondary-600 border border-secondary-300",
    success: "bg-transparent text-success-600 border border-success-300",
    warning: "bg-transparent text-warning-600 border border-warning-300",
    error: "bg-transparent text-error-600 border border-error-300",
    info: "bg-transparent text-info-600 border border-info-300",
  },
  
  // Size variants
  sizes: {
    sm: "px-2 py-1 text-xs rounded-md h-5",
    base: "px-2.5 py-1.5 text-xs rounded-md h-6",
    lg: "px-3 py-2 text-sm rounded-lg h-8",
  },
  
  // Shape variants
  shapes: {
    default: "",
    pill: "rounded-full",
    square: "rounded-none",
  }
};

/**
 * Badge Component
 * 
 * A versatile badge component for displaying status, categories, counts, and labels.
 * Supports multiple variants, sizes, and interactive states.
 * 
 * @param {Object} props - Component props
 * @param {'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'} props.variant - Color variant
 * @param {'default' | 'solid' | 'outline'} props.style - Style variant
 * @param {'sm' | 'base' | 'lg'} props.size - Badge size
 * @param {'default' | 'pill' | 'square'} props.shape - Badge shape
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {boolean} props.removable - Show remove button
 * @param {Function} props.onRemove - Remove button click handler
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Badge content
 */
const Badge = forwardRef(({
  variant = 'default',
  style = 'default',
  size = 'base',
  shape = 'default',
  icon,
  removable = false,
  onRemove,
  className,
  children,
  ...props
}, ref) => {
  // Build badge classes
  const badgeClasses = cn(
    badgeVariants.base,
    badgeVariants[style][variant] || badgeVariants.variants[variant],
    badgeVariants.sizes[size],
    shape !== 'default' && badgeVariants.shapes[shape],
    className
  );

  // Icon sizing based on badge size
  const getIconSize = (size) => {
    switch (size) {
      case 'sm': return 'w-3 h-3';
      case 'base': return 'w-3.5 h-3.5';
      case 'lg': return 'w-4 h-4';
      default: return 'w-3.5 h-3.5';
    }
  };

  // Clone icon with proper sizing
  const cloneIcon = (icon) => {
    if (!icon) return null;
    return React.cloneElement(icon, {
      className: cn(getIconSize(size), icon.props?.className)
    });
  };

  return (
    <span
      ref={ref}
      className={badgeClasses}
      {...props}
    >
      {/* Icon */}
      {icon && (
        <span className={cn(children && "mr-1")}>
          {cloneIcon(icon)}
        </span>
      )}
      
      {/* Content */}
      {children}
      
      {/* Remove button */}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className={cn(
            "ml-1 rounded-full hover:bg-black/10 focus:outline-none focus:bg-black/10",
            size === 'sm' ? 'p-0.5' : 'p-1'
          )}
          aria-label="Remove badge"
        >
          <svg 
            className={getIconSize(size)} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

/**
 * Status Badge Component
 * Specialized badge for status indicators with predefined status types
 */
const StatusBadge = forwardRef(({
  status,
  className,
  ...props
}, ref) => {
  const statusMapping = {
    // Budget statuses
    'on-track': { variant: 'success', children: 'On Track' },
    'near-limit': { variant: 'warning', children: 'Near Limit' },
    'over-budget': { variant: 'error', children: 'Over Budget' },
    
    // Transaction statuses  
    'pending': { variant: 'warning', children: 'Pending' },
    'completed': { variant: 'success', children: 'Completed' },
    'failed': { variant: 'error', children: 'Failed' },
    
    // Account statuses
    'active': { variant: 'success', children: 'Active' },
    'inactive': { variant: 'default', children: 'Inactive' },
    'suspended': { variant: 'error', children: 'Suspended' },
    
    // General statuses
    'draft': { variant: 'default', children: 'Draft' },
    'published': { variant: 'success', children: 'Published' },
    'archived': { variant: 'default', children: 'Archived' },
    'new': { variant: 'primary', children: 'New' },
    'updated': { variant: 'info', children: 'Updated' },
  };

  const statusProps = statusMapping[status] || { variant: 'default', children: status };

  return (
    <Badge
      ref={ref}
      className={className}
      {...statusProps}
      {...props}
    />
  );
});

StatusBadge.displayName = 'StatusBadge';

/**
 * Count Badge Component
 * Specialized badge for displaying counts and numbers
 */
const CountBadge = forwardRef(({
  count = 0,
  max = 99,
  showZero = false,
  className,
  ...props
}, ref) => {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Format count display
  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      ref={ref}
      variant="error"
      style="solid"
      size="sm"
      shape="pill"
      className={cn("min-w-[1.25rem] h-5 text-xs font-bold", className)}
      {...props}
    >
      {displayCount}
    </Badge>
  );
});

CountBadge.displayName = 'CountBadge';

/**
 * Priority Badge Component  
 * Specialized badge for priority levels
 */
const PriorityBadge = forwardRef(({
  priority,
  className,
  ...props
}, ref) => {
  const priorityMapping = {
    low: { variant: 'success', children: 'Low' },
    medium: { variant: 'warning', children: 'Medium' },
    high: { variant: 'error', children: 'High' },
    critical: { variant: 'error', style: 'solid', children: 'Critical' },
  };

  const priorityProps = priorityMapping[priority] || { variant: 'default', children: priority };

  return (
    <Badge
      ref={ref}
      size="sm"
      className={className}
      {...priorityProps}
      {...props}
    />
  );
});

PriorityBadge.displayName = 'PriorityBadge';

// Export all components
export { Badge, StatusBadge, CountBadge, PriorityBadge };
export default Badge;