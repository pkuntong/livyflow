import React, { forwardRef, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import Button from './Button';

// Modal variant configurations
const modalVariants = {
  overlay: "fixed inset-0 bg-black/50 backdrop-blur-sm z-modal",
  
  // Size variants
  sizes: {
    sm: "max-w-md",
    base: "max-w-lg", 
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]",
  },
  
  // Animation variants
  animations: {
    enter: "animate-in fade-in-0 zoom-in-95 duration-200",
    exit: "animate-out fade-out-0 zoom-out-95 duration-200",
  }
};

/**
 * Modal Overlay Component
 * Handles the dark background and click-outside-to-close functionality
 */
const ModalOverlay = forwardRef(({ 
  children, 
  onClose, 
  closeOnOverlayClick = true,
  className 
}, ref) => {
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      ref={ref}
      className={cn(modalVariants.overlay, className)}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
});

ModalOverlay.displayName = 'ModalOverlay';

/**
 * Modal Content Component
 * The main modal container with proper styling
 */
const ModalContent = forwardRef(({ 
  children, 
  size = 'base',
  className,
  ...props 
}, ref) => {
  const contentClasses = cn(
    "relative bg-white rounded-lg shadow-xl mx-4 my-8 w-full",
    "flex flex-col max-h-[calc(100vh-4rem)]", // Ensure modal fits in viewport
    modalVariants.sizes[size],
    modalVariants.animations.enter,
    className
  );

  return (
    <div
      ref={ref}
      className="flex items-center justify-center min-h-full p-4"
      {...props}
    >
      <div className={contentClasses}>
        {children}
      </div>
    </div>
  );
});

ModalContent.displayName = 'ModalContent';

/**
 * Modal Header Component
 * Header section with title and close button
 */
const ModalHeader = forwardRef(({ 
  children, 
  onClose,
  showCloseButton = true,
  className,
  ...props 
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between p-6 border-b border-neutral-200",
        className
      )}
      {...props}
    >
      <div className="flex-1 pr-4">
        {children}
      </div>
      
      {showCloseButton && onClose && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onClose}
          className="flex-shrink-0"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

ModalHeader.displayName = 'ModalHeader';

/**
 * Modal Title Component
 */
const ModalTitle = forwardRef(({ 
  children, 
  className,
  as: Component = 'h2',
  ...props 
}, ref) => {
  return (
    <Component
      ref={ref}
      className={cn(
        "text-lg font-semibold text-neutral-900 leading-6",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

ModalTitle.displayName = 'ModalTitle';

/**
 * Modal Description Component
 */
const ModalDescription = forwardRef(({ 
  children, 
  className,
  ...props 
}, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-neutral-600 mt-1", className)}
      {...props}
    >
      {children}
    </p>
  );
});

ModalDescription.displayName = 'ModalDescription';

/**
 * Modal Body Component
 * Main content area that can scroll if needed
 */
const ModalBody = forwardRef(({ 
  children, 
  className,
  scrollable = true,
  ...props 
}, ref) => {
  const bodyClasses = cn(
    "p-6 flex-1",
    scrollable && "overflow-y-auto",
    className
  );

  return (
    <div ref={ref} className={bodyClasses} {...props}>
      {children}
    </div>
  );
});

ModalBody.displayName = 'ModalBody';

/**
 * Modal Footer Component
 * Footer section typically containing action buttons
 */
const ModalFooter = forwardRef(({ 
  children, 
  className,
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
        "flex items-center gap-3 p-6 border-t border-neutral-200 bg-neutral-50 rounded-b-lg",
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

ModalFooter.displayName = 'ModalFooter';

/**
 * Main Modal Component
 * Combines all modal parts with proper accessibility and keyboard handling
 */
const Modal = ({ 
  isOpen = false,
  onClose,
  children,
  size = 'base',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocus = null,
  finalFocus = null,
  ...props 
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus management
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (initialFocus) {
        initialFocus.focus();
      } else if (focusableElements?.length > 0) {
        focusableElements[0].focus();
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Return focus to previously focused element
        if (finalFocus) {
          finalFocus.focus();
        } else if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, initialFocus, finalFocus]);

  // Handle focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose} closeOnOverlayClick={closeOnOverlayClick}>
      <ModalContent ref={modalRef} size={size} {...props}>
        {children}
      </ModalContent>
    </ModalOverlay>
  );
};

Modal.displayName = 'Modal';

// Export all components
export {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
};

export default Modal;