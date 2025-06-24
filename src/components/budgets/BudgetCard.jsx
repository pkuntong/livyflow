import React from 'react';
import { Edit3, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function BudgetCard({ budget, onEdit, onDelete }) {
  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressBgColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-100';
    if (percentage >= 80) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  const getStatusIcon = (percentage) => {
    if (percentage >= 100) return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (percentage >= 80) return <TrendingUp className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-green-600" />;
  };

  const getStatusText = (percentage) => {
    if (percentage >= 100) return 'Over Budget';
    if (percentage >= 80) return 'Near Limit';
    return 'On Track';
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{budget.category}</h3>
            {getStatusIcon(budget.percentage_used)}
          </div>
          {budget.description && (
            <p className="text-sm text-gray-600">{budget.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(budget)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit budget"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete budget"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className={`text-sm font-medium ${getStatusColor(budget.percentage_used)}`}>
            {getStatusText(budget.percentage_used)}
          </span>
        </div>
        
        <div className={`w-full h-3 rounded-full ${getProgressBgColor(budget.percentage_used)} overflow-hidden`}>
          <div
            className={`h-full ${getProgressColor(budget.percentage_used)} transition-all duration-300 ease-out`}
            style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            {budget.percentage_used.toFixed(1)}% used
          </span>
          <span className="text-xs text-gray-500">
            ${budget.actual_spent.toFixed(2)} / ${budget.monthly_limit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Financial Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Monthly Limit</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            ${budget.monthly_limit.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Remaining</span>
          </div>
          <p className={`text-lg font-semibold ${
            budget.remaining < 0 ? 'text-red-600' : 'text-gray-900'
          }`}>
            ${budget.remaining.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Spending Details */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Spent this month:</span>
          <span className="text-sm font-medium text-gray-900">
            ${budget.actual_spent.toFixed(2)}
          </span>
        </div>
        
        {budget.remaining < 0 && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-800">
              ⚠️ You've exceeded your budget by ${Math.abs(budget.remaining).toFixed(2)}
            </p>
          </div>
        )}
        
        {budget.percentage_used >= 80 && budget.percentage_used < 100 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              ⚠️ You're approaching your budget limit
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 