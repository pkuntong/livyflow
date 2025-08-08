import React from 'react';
import { Edit3, Trash2, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../../../Components/ui/card';
import { Button, StatusBadge, BudgetProgress } from '../../design-system';

export default function BudgetCard({ budget, onEdit, onDelete }) {
  const getStatusFromPercentage = (percentage) => {
    if (percentage >= 100) return 'over-budget';
    if (percentage >= 80) return 'near-limit';
    return 'on-track';
  };

  const getStatusIcon = (percentage) => {
    if (percentage >= 100) return <TrendingUp className="w-4 h-4" />;
    if (percentage >= 80) return <TrendingUp className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const status = getStatusFromPercentage(budget.percentage_used);

  return (
    <Card 
      variant="default" 
      size="base" 
      interactive="hover"
      className="transition-shadow duration-200"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-neutral-900">{budget.category}</h3>
              {getStatusIcon(budget.percentage_used)}
            </div>
            {budget.description && (
              <p className="text-sm text-neutral-600">{budget.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={() => onEdit(budget)}
              aria-label="Edit budget"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={() => onDelete(budget.id)}
              className="text-neutral-400 hover:text-error-600 hover:bg-error-50"
              aria-label="Delete budget"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-neutral-700">Progress</span>
          <StatusBadge status={status} />
        </div>
        
        {/* Progress Bar with Budget Details */}
        <BudgetProgress
          spent={budget.actual_spent}
          budget={budget.monthly_limit}
          currency="$"
          showAmounts={false}
          showPercentage={true}
        />

        {/* Financial Details */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-medium text-neutral-600">Monthly Limit</span>
            </div>
            <p className="text-lg font-semibold text-neutral-900">
              ${budget.monthly_limit.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-medium text-neutral-600">Remaining</span>
            </div>
            <p className={`text-lg font-semibold ${
              budget.remaining < 0 ? 'text-error-600' : 'text-neutral-900'
            }`}>
              ${budget.remaining.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <div className="w-full space-y-2">
          {/* Spending Summary */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Spent this month:</span>
            <span className="text-sm font-medium text-neutral-900">
              ${budget.actual_spent.toFixed(2)}
            </span>
          </div>
          
          {/* Warning Messages */}
          {budget.remaining < 0 && (
            <div className="flex items-start gap-2 p-3 bg-error-50 border border-error-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-error-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-error-800">
                You've exceeded your budget by ${Math.abs(budget.remaining).toFixed(2)}
              </p>
            </div>
          )}
          
          {budget.percentage_used >= 80 && budget.percentage_used < 100 && (
            <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning-800">
                You're approaching your budget limit
              </p>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 