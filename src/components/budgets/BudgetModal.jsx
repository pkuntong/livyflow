import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, DollarSign, Tag } from 'lucide-react';

export default function BudgetModal({ isOpen, onClose, budget = null, onSave }) {
  const [formData, setFormData] = useState({
    category: '',
    monthly_limit: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the first input when modal opens
    const firstInput = document.querySelector('#budget-category-input');
    if (firstInput) {
      firstInput.focus();
    }

    // Trap focus within modal
    const modal = document.querySelector('[role="dialog"]');
    const focusableElements = modal?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0];
    const lastElement = focusableElements?.[focusableElements.length - 1];

    const trapFocus = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    modal?.addEventListener('keydown', trapFocus);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      modal?.removeEventListener('keydown', trapFocus);
    };
  }, [isOpen, onClose]);

  // Common budget categories
  const commonCategories = [
    'Food and Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Utilities',
    'Housing',
    'Education',
    'Travel',
    'Insurance',
    'Personal Care',
    'Gifts',
    'Subscriptions',
    'Other'
  ];

  useEffect(() => {
    if (budget) {
      // Editing existing budget
      setFormData({
        category: budget.category || '',
        monthly_limit: budget.monthly_limit || '',
        description: budget.description || ''
      });
    } else {
      // Creating new budget
      setFormData({
        category: '',
        monthly_limit: '',
        description: ''
      });
    }
    setErrors({});
  }, [budget, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.monthly_limit) {
      newErrors.monthly_limit = 'Monthly limit is required';
    } else {
      const limit = parseFloat(formData.monthly_limit);
      if (isNaN(limit) || limit <= 0) {
        newErrors.monthly_limit = 'Monthly limit must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const budgetData = {
        category: formData.category.trim(),
        monthly_limit: parseFloat(formData.monthly_limit),
        description: formData.description.trim() || null
      };

      await onSave(budgetData);
      onClose();
    } catch (error) {
      console.error('Error saving budget:', error);
      // Handle specific errors
      if (error.response?.status === 400) {
        setErrors({ general: error.response.data.detail || 'Failed to save budget' });
      } else {
        setErrors({ general: 'Failed to save budget. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    handleInputChange('category', category);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
        aria-describedby="budget-modal-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" aria-hidden="true">
              {budget ? <Edit3 className="w-4 h-4 text-blue-600" /> : <DollarSign className="w-4 h-4 text-blue-600" />}
            </div>
            <h1 id="budget-modal-title" className="text-lg font-semibold text-gray-900">
              {budget ? 'Edit Budget' : 'Create New Budget'}
            </h1>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          <div id="budget-modal-description" className="sr-only">
            {budget ? 'Edit an existing budget category and monthly spending limit' : 'Create a new budget category with a monthly spending limit'}
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="polite">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Category */}
          <div>
            <label htmlFor="budget-category-input" className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <div className="relative">
              <input
                id="budget-category-input"
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Enter category name"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none ${
                  errors.category ? 'border-red-300 aria-invalid' : 'border-gray-300'
                }`}
                aria-describedby={errors.category ? 'category-error' : 'category-help'}
                aria-invalid={errors.category ? 'true' : 'false'}
                required
              />
              <Tag className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" aria-hidden="true" />
            </div>
            {errors.category ? (
              <p id="category-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.category}
              </p>
            ) : (
              <p id="category-help" className="mt-1 text-sm text-gray-500">
                Choose a category for this budget
              </p>
            )}
            
            {/* Common Categories */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Quick select common categories:</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Common budget categories">
                {commonCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    aria-label={`Select ${category} category`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Limit */}
          <div>
            <label htmlFor="budget-limit-input" className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Limit *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500" aria-hidden="true">$</span>
              <input
                id="budget-limit-input"
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_limit}
                onChange={(e) => handleInputChange('monthly_limit', e.target.value)}
                placeholder="0.00"
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none ${
                  errors.monthly_limit ? 'border-red-300' : 'border-gray-300'
                }`}
                aria-describedby={errors.monthly_limit ? 'limit-error' : 'limit-help'}
                aria-invalid={errors.monthly_limit ? 'true' : 'false'}
                required
              />
            </div>
            {errors.monthly_limit ? (
              <p id="limit-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.monthly_limit}
              </p>
            ) : (
              <p id="limit-help" className="mt-1 text-sm text-gray-500">
                Enter the maximum amount you want to spend per month in this category
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="budget-description-input" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="budget-description-input"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add a description for this budget..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none"
              aria-describedby="description-help"
            />
            <p id="description-help" className="mt-1 text-sm text-gray-500">
              Optional notes about this budget category
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-describedby="save-status"
            >
              <span id="save-status" className="flex items-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" aria-hidden="true" />
                    <span>{budget ? 'Update Budget' : 'Create Budget'}</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 