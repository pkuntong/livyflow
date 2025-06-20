import React from 'react';
import { Receipt } from 'lucide-react';
import FinancialOverview from '../../Components/dashboard/FinancialOverview.js';

export default function Dashboard({ accounts, transactions }) {
  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your financial overview.</p>
      </div>

      {/* Financial Overview Cards */}
      <div className="mb-8">
        <FinancialOverview accounts={accounts} transactions={transactions} />
      </div>

      {/* Additional Dashboard Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 flex items-center justify-between border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
            <button className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-sm border border-gray-200 hover:bg-gray-50">
              + Add Transaction
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {transaction.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-gray-500">Unknown Account</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Dec {transaction.date.split('-')[2]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Spending by Category */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Spending by Category</h2>
            <p className="text-sm text-gray-600 mt-1">Current month breakdown</p>
          </div>
          <div className="p-6 flex items-center justify-center h-[300px]">
            <div className="text-center text-gray-500">
              <p>No expense data for this month</p>
              <p className="text-sm mt-1">Add some transactions to see the breakdown</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 