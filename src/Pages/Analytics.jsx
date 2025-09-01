import React, { useState } from 'react';
import { Menu } from '@headlessui/react';
import { ChevronDown, BarChart3, LineChart, TrendingUp as TrendingUpIcon } from 'lucide-react';

const TIME_PERIODS = [
  { label: 'Last 6 Months', value: '6m' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last Month', value: '1m' },
  { label: 'This Year', value: '1y' },
];


function TimeSelector({ selectedPeriod, onPeriodChange }) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        {selectedPeriod.label}
        <ChevronDown className="w-4 h-4" />
      </Menu.Button>
      <Menu.Items className="absolute left-0 right-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 min-w-[200px]">
        {TIME_PERIODS.map((period) => (
          <Menu.Item key={period.value}>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-gray-50' : ''
                } w-full text-left px-4 py-2 text-sm text-gray-700`}
                onClick={() => onPeriodChange(period)}
              >
                {period.label}
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState(TIME_PERIODS[0]);


  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Analytics</h1>
          <p className="text-gray-600">Insights into your spending patterns and financial trends</p>
        </div>
        <TimeSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Empty State */}
      <div className="text-center py-8 lg:py-16">
        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
          <BarChart3 className="w-8 h-8 lg:w-10 lg:h-10 text-blue-600" />
        </div>
        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3">No Analytics Data Yet</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto px-4">
          Connect your bank account and add some transactions to see detailed analytics about your spending patterns, income vs expenses, and financial trends.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-500 px-4">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            <span>Income vs Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span>Spending Categories</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4" />
            <span>Financial Trends</span>
          </div>
        </div>
      </div>
    </div>
  );
} 