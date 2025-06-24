import React, { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BudgetCharts({ budgets, spendingSummary }) {
  const [activeTab, setActiveTab] = useState('pie');

  // Prepare data for pie chart (spending by category)
  const pieData = budgets.map(budget => ({
    name: budget.category,
    value: budget.actual_spent,
    budget: budget.monthly_limit,
    remaining: budget.remaining,
    percentage: budget.percentage_used
  })).filter(item => item.value > 0);

  // Prepare data for bar chart (budget vs actual)
  const barData = budgets.map(budget => ({
    category: budget.category,
    budget: budget.monthly_limit,
    spent: budget.actual_spent,
    remaining: budget.remaining
  }));

  // Color palette for charts
  const COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {data.budget && (
            <p className="text-sm text-gray-600">
              Budget: <span className="font-medium">${data.budget.toFixed(2)}</span>
            </p>
          )}
          <p className="text-sm text-gray-600">
            Spent: <span className="font-medium">${data.value || data.spent}</span>
          </p>
          {data.remaining !== undefined && (
            <p className={`text-sm ${data.remaining < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              Remaining: <span className="font-medium">${data.remaining.toFixed(2)}</span>
            </p>
          )}
          {data.percentage && (
            <p className="text-sm text-gray-600">
              Used: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const budgetData = payload.find(p => p.dataKey === 'budget');
      const spentData = payload.find(p => p.dataKey === 'spent');
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {budgetData && (
            <p className="text-sm text-blue-600">
              Budget: <span className="font-medium">${budgetData.value.toFixed(2)}</span>
            </p>
          )}
          {spentData && (
            <p className="text-sm text-red-600">
              Spent: <span className="font-medium">${spentData.value.toFixed(2)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (budgets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Data</h3>
          <p className="text-gray-600">Create some budgets to see spending visualizations here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Budget Analytics</h3>
            <p className="text-sm text-gray-600">Visualize your spending patterns</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('pie')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'pie'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Spending Distribution
          </button>
          <button
            onClick={() => setActiveTab('bar')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'bar'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Budget vs Actual
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="h-80">
        {activeTab === 'pie' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="category" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend />
              <Bar dataKey="budget" fill="#3B82F6" name="Budget" />
              <Bar dataKey="spent" fill="#EF4444" name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Stats */}
      {spendingSummary && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                ${spendingSummary.total_budget.toFixed(0)}
              </p>
              <p className="text-sm text-gray-600">Total Budget</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                ${spendingSummary.total_spent.toFixed(0)}
              </p>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${
                spendingSummary.total_remaining < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                ${spendingSummary.total_remaining.toFixed(0)}
              </p>
              <p className="text-sm text-gray-600">Remaining</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${
                spendingSummary.overall_percentage >= 100 ? 'text-red-600' : 
                spendingSummary.overall_percentage >= 80 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {spendingSummary.overall_percentage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Used</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 