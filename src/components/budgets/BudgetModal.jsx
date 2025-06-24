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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              {budget ? <Edit3 className="w-4 h-4 text-blue-600" /> : <DollarSign className="w-4 h-4 text-blue-600" />}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {budget ? 'Edit Budget' : 'Create New Budget'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Enter category name"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.category ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <Tag className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
            
            {/* Common Categories */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Common categories:</p>
              <div className="flex flex-wrap gap-2">
                {commonCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Limit *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_limit}
                onChange={(e) => handleInputChange('monthly_limit', e.target.value)}
                placeholder="0.00"
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.monthly_limit ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.monthly_limit && (
              <p className="mt-1 text-sm text-red-600">{errors.monthly_limit}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add a description for this budget..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {budget ? 'Update Budget' : 'Create Budget'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 