import React, { useState } from 'react';
import { Menu } from '@headlessui/react';
import { ChevronDown, TrendingUp, TrendingDown, Calculator, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const TIME_PERIODS = [
  { label: 'Last 6 Months', value: '6m' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last Month', value: '1m' },
  { label: 'This Year', value: '1y' },
];

const mockData = {
  incomeVsExpenses: [
    { month: 'Jan', income: 800, expenses: 322.93 },
    { month: 'Feb', income: 900, expenses: 450.50 },
    { month: 'Mar', income: 750, expenses: 380.25 },
    { month: 'Apr', income: 850, expenses: 420.75 },
    { month: 'May', income: 800, expenses: 322.93 },
    { month: 'Jun', income: 950, expenses: 500.00 },
  ],
  topSpendingCategories: [
    { category: 'food dining', amount: 150.50 },
    { category: 'entertainment', amount: 89.99 },
    { category: 'transportation', amount: 75.25 },
    { category: 'shopping', amount: 120.75 },
    { category: 'bills utilities', amount: 200.00 },
  ]
};

function StatCard({ title, amount, subtitle, trend, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600">{title}</h3>
        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{amount}</p>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}

function TimeSelector({ selectedPeriod, onPeriodChange }) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        {selectedPeriod.label}
        <ChevronDown className="w-4 h-4" />
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
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
  const [data] = useState(mockData);

  const totalIncome = 800;
  const totalExpenses = 322.93;
  const netIncome = totalIncome - totalExpenses;
  const savingsRate = ((netIncome / totalIncome) * 100).toFixed(1);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Analytics</h1>
          <p className="text-gray-600">Insights into your spending patterns and financial trends</p>
        </div>
        <TimeSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Income"
          amount={formatCurrency(totalIncome)}
          subtitle={`Avg: ${formatCurrency(133.33)}/month`}
          icon={TrendingUp}
          color="bg-emerald-500"
        />
        <StatCard
          title="Total Expenses"
          amount={formatCurrency(totalExpenses)}
          subtitle={`Avg: ${formatCurrency(53.822)}/month`}
          icon={TrendingDown}
          color="bg-red-500"
        />
        <StatCard
          title="Net Income"
          amount={formatCurrency(netIncome)}
          subtitle="Period total"
          icon={Calculator}
          color="bg-blue-500"
        />
        <StatCard
          title="Savings Rate"
          amount={`${savingsRate}%`}
          subtitle="Of total income"
          icon={Clock}
          color="bg-purple-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Income vs Expenses</h2>
          <p className="text-gray-600 mb-6">Monthly comparison over time</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.incomeVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Spending Categories Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Top Spending Categories</h2>
          <p className="text-gray-600 mb-6">Where your money goes</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topSpendingCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="category" type="category" stroke="#6b7280" width={100} />
                <Tooltip />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
} 