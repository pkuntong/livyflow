import React, { useState, useEffect } from 'react';
import { Save, Edit3, DollarSign, Tag } from 'lucide-react';
import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalBody, 
  ModalFooter,
  Button,
  FormField,
  Input,
  Textarea
} from '../../design-system';

export default function BudgetModalEnhanced({ isOpen, onClose, budget = null, onSave }) {
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

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="base"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              {budget ? (
                <Edit3 className="w-4 h-4 text-primary-600" />
              ) : (
                <DollarSign className="w-4 h-4 text-primary-600" />
              )}
            </div>
            <ModalTitle>
              {budget ? 'Edit Budget' : 'Create New Budget'}
            </ModalTitle>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-error-50 border border-error-200 rounded-lg" role="alert">
              <p className="text-sm text-error-800">{errors.general}</p>
            </div>
          )}

          {/* Category */}
          <FormField
            label="Category"
            required
            errorMessage={errors.category}
            helperText="Choose a category for this budget"
          >
            <Input
              type="text"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              placeholder="Enter category name"
              rightIcon={<Tag />}
              state={errors.category ? 'error' : 'default'}
              required
            />
          </FormField>
          
          {/* Common Categories */}
          <div>
            <p className="text-xs text-neutral-500 mb-2">Quick select common categories:</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Common budget categories">
              {commonCategories.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCategorySelect(category)}
                  className="h-auto px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  aria-label={`Select ${category} category`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Monthly Limit */}
          <FormField
            label="Monthly Limit"
            required
            errorMessage={errors.monthly_limit}
            helperText="Enter the maximum amount you want to spend per month in this category"
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 text-sm">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_limit}
                onChange={(e) => handleInputChange('monthly_limit', e.target.value)}
                placeholder="0.00"
                className="pl-8"
                state={errors.monthly_limit ? 'error' : 'default'}
                required
              />
            </div>
          </FormField>

          {/* Description */}
          <FormField
            label="Description"
            helperText="Optional notes about this budget category"
          >
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add a description for this budget..."
              rows={3}
            />
          </FormField>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            leftIcon={!isLoading && <Save />}
          >
            {budget ? 'Update Budget' : 'Create Budget'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}