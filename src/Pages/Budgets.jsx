import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Loader2, PiggyBank, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import budgetService from '../services/budgetService';
import BudgetModal from '../components/budgets/BudgetModal';
import BudgetCard from '../components/budgets/BudgetCard';
import BudgetCharts from '../components/budgets/BudgetCharts';
import BudgetSuggestions from '../components/budgets/BudgetSuggestions';

export default function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [spendingSummary, setSpendingSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (user) {
      fetchBudgets();
      fetchSpendingSummary();
    }
  }, [user]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchBudgets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔄 Fetching budgets...");
      
      const response = await budgetService.getBudgets();
      console.log("✅ Budgets fetched:", response);
      
      setBudgets(response.budgets || []);
    } catch (error) {
      console.error("❌ Error fetching budgets:", error);
      setError("Failed to load budgets. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSpendingSummary = async () => {
    try {
      console.log("🔄 Fetching spending summary...");
      
      const response = await budgetService.getSpendingSummary();
      console.log("✅ Spending summary fetched:", response);
      
      setSpendingSummary(response.summary);
    } catch (error) {
      console.error("❌ Error fetching spending summary:", error);
      // Don't set error for summary, as it's not critical
    }
  };

  const handleCreateBudget = async (budgetData) => {
    try {
      console.log("🚀 Creating new budget:", budgetData);
      
      const response = await budgetService.createBudget(budgetData);
      console.log("✅ Budget created:", response);
      
      // Refresh budgets and summary
      await fetchBudgets();
      await fetchSpendingSummary();
      
      setSuccessMessage("Budget created successfully!");
      
      return response;
    } catch (error) {
      console.error("❌ Error creating budget:", error);
      throw error;
    }
  };

  const handleUpdateBudget = async (budgetData) => {
    try {
      console.log("🚀 Updating budget:", editingBudget.id, budgetData);
      
      const response = await budgetService.updateBudget(editingBudget.id, budgetData);
      console.log("✅ Budget updated:", response);
      
      // Refresh budgets and summary
      await fetchBudgets();
      await fetchSpendingSummary();
      
      setSuccessMessage("Budget updated successfully!");
      
      return response;
    } catch (error) {
      console.error("❌ Error updating budget:", error);
      throw error;
    }
  };

  const handleSaveBudget = async (budgetData) => {
    if (editingBudget) {
      return await handleUpdateBudget(budgetData);
    } else {
      return await handleCreateBudget(budgetData);
    }
  };

  // Handle applying a budget suggestion
  const handleApplySuggestion = async (budgetData) => {
    try {
      console.log("🚀 Applying budget suggestion:", budgetData);
      
      const response = await budgetService.createBudget(budgetData);
      console.log("✅ Budget suggestion applied:", response);
      
      // Refresh budgets and summary
      await fetchBudgets();
      await fetchSpendingSummary();
      
      return response;
    } catch (error) {
      console.error("❌ Error applying budget suggestion:", error);
      throw error;
    }
  };

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleDeleteBudget = async (budgetId) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) {
      return;
    }

    try {
      console.log("🗑️ Deleting budget:", budgetId);
      
      await budgetService.deleteBudget(budgetId);
      console.log("✅ Budget deleted successfully");
      
      // Refresh budgets and summary
      await fetchBudgets();
      await fetchSpendingSummary();
    } catch (error) {
      console.error("❌ Error deleting budget:", error);
      alert("Failed to delete budget. Please try again.");
    }
  };

  const handleRefresh = async () => {
    await fetchBudgets();
    await fetchSpendingSummary();
  };

  const openCreateModal = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
  };

  // Calculate summary stats
  const totalBudgets = budgets.length;
  const overBudgetCount = budgets.filter(b => b.percentage_used >= 100).length;
  const nearLimitCount = budgets.filter(b => b.percentage_used >= 80 && b.percentage_used < 100).length;

  if (isLoading && budgets.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading budgets...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Budget Planning</h1>
              <p className="text-gray-600 mt-1">Set and track your monthly spending limits</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Budget
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Summary Cards */}
        {spendingSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PiggyBank className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${spendingSummary.total_budget.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-xl font-bold text-red-600">
                    ${spendingSummary.total_spent.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className={`text-xl font-bold ${
                    spendingSummary.total_remaining < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ${spendingSummary.total_remaining.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Over Budget</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {overBudgetCount} of {totalBudgets}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="mb-8">
        <BudgetCharts budgets={budgets} spendingSummary={spendingSummary} />
      </div>

      {/* Smart Budget Suggestions */}
      <div className="mb-8">
        <BudgetSuggestions onApplySuggestion={handleApplySuggestion} />
      </div>

      {/* Budgets List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Budgets ({budgets.length})
          </h2>
          {nearLimitCount > 0 && (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {nearLimitCount} budget{nearLimitCount > 1 ? 's' : ''} near limit
              </span>
            </div>
          )}
        </div>

        {budgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Budgets Yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first budget to start tracking your spending and stay on top of your finances.
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Budget
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={handleEditBudget}
                onDelete={handleDeleteBudget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={closeModal}
        budget={editingBudget}
        onSave={handleSaveBudget}
      />
    </div>
  );
} 