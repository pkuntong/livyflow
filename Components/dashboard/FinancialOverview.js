import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";

export default function FinancialOverview({ accounts, transactions }) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = transactions.filter(t => 
    t.date.slice(0, 7) === currentMonth
  );
  
  const monthlyIncome = currentMonthTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyExpenses = Math.abs(currentMonthTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0));

  const netIncome = monthlyIncome - monthlyExpenses;

  const cards = [
    {
      title: "Total Balance",
      value: `$${totalBalance.toLocaleString()}`,
      icon: Wallet,
      trend: null,
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Monthly Income",
      value: `$${monthlyIncome.toLocaleString()}`,
      icon: TrendingUp,
      trend: "+8.2%",
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      title: "Monthly Expenses",
      value: `$${monthlyExpenses.toLocaleString()}`,
      icon: TrendingDown,
      trend: "-12.5%",
      gradient: "from-orange-500 to-red-600"
    },
    {
      title: "Net Income",
      value: `$${netIncome.toLocaleString()}`,
      icon: DollarSign,
      trend: netIncome >= 0 ? "+15.3%" : "-8.1%",
      gradient: netIncome >= 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-pink-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} bg-opacity-10`}>
              {React.createElement(card.icon, { className: "w-4 h-4 text-gray-700" })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {card.value}
            </div>
            {card.trend && (
              <div className={`flex items-center text-sm ${
                card.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {card.trend.startsWith('+') ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {card.trend} from last month
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}