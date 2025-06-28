import React, { useState } from 'react';
import { X } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Checking Account' },
  { value: 'SAVINGS', label: 'Savings Account' },
  { value: 'CREDIT CARD', label: 'Credit Card' },
  { value: 'INVESTMENT', label: 'Investment Account' }
];

export default function AccountModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    type: '',
    balance: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Account name is required';
    if (!formData.institution.trim()) newErrors.institution = 'Bank/Institution is required';
    if (!formData.type) newErrors.type = 'Account type is required';
    if (!formData.balance || isNaN(formData.balance)) newErrors.balance = 'Valid balance is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        ...formData,
        balance: parseFloat(formData.balance),
        id: Date.now()
      });
      onClose();
      setFormData({
        name: '',
        institution: '',
        type: '',
        balance: ''
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Add New Account</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Main Checking, Emergency Savings"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">
              Bank / Institution
            </label>
            <input
              type="text"
              id="institution"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.institution ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Chase Bank, Bank of America"
            />
            {errors.institution && <p className="mt-1 text-sm text-red-600">{errors.institution}</p>}
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.type ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select account type</option>
              {ACCOUNT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
          </div>

          <div>
            <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">
              Current Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                id="balance"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.balance ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            {errors.balance && <p className="mt-1 text-sm text-red-600">{errors.balance}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
            >
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 