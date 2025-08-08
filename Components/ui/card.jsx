import React, { forwardRef } from 'react';
import { cn } from '../../src/design-system/utils/cn';

// Card variant configurations
const cardVariants = {
  base: "bg-white transition-all duration-200",
  
  // Style variants
  variants: {
    default: "border border-neutral-200 rounded-lg shadow-sm",
    elevated: "border-0 rounded-lg shadow-md hover:shadow-lg",
    outline: "border-2 border-neutral-200 rounded-lg shadow-none",
    ghost: "border-0 shadow-none bg-transparent",
  },
  
  // Size variants
  sizes: {
    sm: "p-4",
    base: "p-6", 
    lg: "p-8",
  },
  
  // Interactive variants
  interactive: {
    none: "",
    hover: "hover:shadow-md cursor-pointer",
    clickable: "hover:shadow-md hover:border-neutral-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2",
  }
};

/**
 * Card Component
 * 
 * A flexible card container with multiple variants and interactive states.
 * Follows the LivyFlow design system principles.
 * 
 * @param {Object} props - Component props
 * @param {'default' | 'elevated' | 'outline' | 'ghost'} props.variant - Card style variant
 * @param {'sm' | 'base' | 'lg'} props.size - Card padding size
 * @param {'none' | 'hover' | 'clickable'} props.interactive - Interactive behavior
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 * @param {Function} props.onClick - Click handler (enables clickable state)
 */
export const Card = forwardRef(({
  variant = 'default',
  size = 'base', 
  interactive = 'none',
  className,
  children,
  onClick,
  ...props
}, ref) => {
  // Automatically set interactive to clickable if onClick is provided
  const interactiveState = onClick ? 'clickable' : interactive;
  
  const cardClasses = cn(
    cardVariants.base,
    cardVariants.variants[variant],
    cardVariants.sizes[size],
    cardVariants.interactive[interactiveState],
    className
  );

  const CardElement = onClick ? 'button' : 'div';

  return (
    <CardElement
      ref={ref}
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </CardElement>
  );
});

Card.displayName = 'Card';

/**
 * CardHeader Component
 * Header section of a card with consistent spacing
 */
export const CardHeader = forwardRef(({ 
  children, 
  className = "", 
  ...props 
}, ref) => {
  return (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props}>
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle Component  
 * Main title for card header
 */
export const CardTitle = forwardRef(({ 
  children, 
  className = "", 
  as: Component = 'h3',
  ...props 
}, ref) => {
  return (
    <Component 
      ref={ref} 
      className={cn("text-xl font-semibold leading-none tracking-tight text-neutral-900", className)} 
      {...props}
    >
      {children}
    </Component>
  );
});

CardTitle.displayName = 'CardTitle';

/**
 * CardDescription Component
 * Subtitle/description for card header
 */
export const CardDescription = forwardRef(({ 
  children, 
  className = "", 
  ...props 
}, ref) => {
  return (
    <p 
      ref={ref} 
      className={cn("text-sm text-neutral-600", className)} 
      {...props}
    >
      {children}
    </p>
  );
});

CardDescription.displayName = 'CardDescription';

/**
 * CardContent Component
 * Main content area of the card
 */
export const CardContent = forwardRef(({ 
  children, 
  className = "", 
  ...props 
}, ref) => {
  return (
    <div ref={ref} className={cn("pt-0", className)} {...props}>
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

/**
 * CardFooter Component
 * Footer section with actions or additional info
 */
export const CardFooter = forwardRef(({ 
  children, 
  className = "", 
  ...props 
}, ref) => {
  return (
    <div ref={ref} className={cn("flex items-center pt-4", className)} {...props}>
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

/**
 * CardActions Component
 * Container for card action buttons
 */
export const CardActions = forwardRef(({ 
  children, 
  className = "", 
  align = 'right',
  ...props 
}, ref) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center', 
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div 
      ref={ref} 
      className={cn(
        "flex items-center gap-2 pt-4",
        alignClasses[align],
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
});

CardActions.displayName = 'CardActions';

// Export default for backward compatibility
export default Card; 