import React, { useState } from 'react';
import { Check, Plus, Plane, Coffee, ShoppingBag, Car, Home, Utensils } from 'lucide-react';
import BudgetModal from '../components/budgets/BudgetModal';

const CATEGORY_ICONS = {
  'Travel': { icon: Plane, bgColor: 'bg-blue-100', color: 'text-blue-600' },
  'Coffee': { icon: Coffee, bgColor: 'bg-amber-100', color: 'text-amber-600' },
  'Shopping': { icon: ShoppingBag, bgColor: 'bg-pink-100', color: 'text-pink-600' },
  'Transport': { icon: Car, bgColor: 'bg-purple-100', color: 'text-purple-600' },
  'Housing': { icon: Home, bgColor: 'bg-emerald-100', color: 'text-emerald-600' },
  'Food': { icon: Utensils, bgColor: 'bg-orange-100', color: 'text-orange-600' },
};

const mockBudgets = [
  {
    id: 1,
    category: 'Travel',
    spent: 0,
    budget: 20,
    icon: Plane,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  }
];

export default function Budgets() {
  const [budgets, setBudgets] = useState(mockBudgets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  
  const currentDate = new Date();
  const monthYear = new Intl.DateTimeFormat('en-US', { 
    month: 'long', 
    year: 'numeric' 
  }).format(currentDate);

  const calculateProgress = (spent, budget) => {
    if (budget <= 0) return 0;
    const progress = (spent / budget) * 100;
    return Math.min(progress, 100).toFixed(1);
  };

  const handleOpenModal = (budget = null) => {
    setSelectedBudget(budget);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedBudget(null);
    setIsModalOpen(false);
  };

  const handleSaveBudget = (formData) => {
    const categoryConfig = CATEGORY_ICONS[formData.category] || {
      icon: Check,
      bgColor: 'bg-gray-100',
      color: 'text-gray-600'
    };

    if (selectedBudget) {
      // Edit existing budget
      setBudgets(budgets.map(budget => 
        budget.id === selectedBudget.id 
          ? { 
              ...budget, 
              category: formData.category, 
              budget: parseFloat(formData.budget),
              icon: categoryConfig.icon,
              iconBgColor: categoryConfig.bgColor,
              iconColor: categoryConfig.color
            }
          : budget
      ));
    } else {
      // Add new budget
      const newBudget = {
        id: Date.now(),
        category: formData.category,
        budget: parseFloat(formData.budget),
        spent: 0,
        icon: categoryConfig.icon,
        iconBgColor: categoryConfig.bgColor,
        iconColor: categoryConfig.color
      };
      setBudgets([...budgets, newBudget]);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Tracker</h1>
          <p className="text-gray-600">Set spending limits and track your progress for {monthYear}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget) => (
          <div 
            key={budget.id} 
            onClick={() => handleOpenModal(budget)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${budget.iconBgColor} rounded-xl flex items-center justify-center`}>
                <budget.icon className={`w-5 h-5 ${budget.iconColor}`} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{budget.category}</h2>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <span className={`text-sm font-medium ${
                  parseFloat(calculateProgress(budget.spent, budget.budget)) >= 100 
                    ? 'text-red-600' 
                    : 'text-emerald-600'
                }`}>
                  {calculateProgress(budget.spent, budget.budget)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    parseFloat(calculateProgress(budget.spent, budget.budget)) >= 100 
                      ? 'bg-red-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${calculateProgress(budget.spent, budget.budget)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-baseline mb-4">
              <div>
                <p className="text-sm text-gray-600">Spent</p>
                <p className={`text-xl font-semibold ${
                  budget.spent > budget.budget ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  ${budget.spent.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Budget</p>
                <p className="text-xl font-semibold text-gray-900">${budget.budget.toFixed(2)}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Remaining: ${Math.max(budget.budget - budget.spent, 0).toFixed(2)}
            </p>
          </div>
        ))}

        {/* Add Budget Card */}
        <button 
          onClick={() => handleOpenModal()}
          className="bg-gray-50 rounded-xl border-2 border-gray-200 border-dashed p-6 flex flex-col items-center justify-center gap-3 hover:bg-gray-100 transition-colors cursor-pointer min-h-[250px] group"
        >
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
            <Plus className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-gray-600 font-medium">Add New Budget</p>
          <p className="text-sm text-gray-500 text-center">
            Create a new budget to track your spending
          </p>
        </button>
      </div>

      <BudgetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBudget}
        budget={selectedBudget}
        categories={Object.keys(CATEGORY_ICONS)}
      />
    </div>
  );
} 