import { auth } from '../firebase';

// In development, use the Vite proxy to avoid CORS issues
const isDev = import.meta.env.DEV;
const API_BASE_URL = isDev ? '/api/v1' : 'https://livyflow.onrender.com/api/v1';
console.log("🔧 BudgetRecommendationsService initialized with API URL:", API_BASE_URL);
console.log("🔧 Development mode:", isDev);

export const budgetRecommendationsService = {
  async fetchBudgetRecommendations() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/budget/recommendations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch budget recommendations');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching budget recommendations:', error);
      throw error;
    }
  },

  // Helper function to format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  },

  // Helper function to get category icon
  getCategoryIcon(category) {
    const categoryIcons = {
      'Food and Drink': '🍽️',
      'Shopping': '🛍️',
      'Transportation': '🚗',
      'Entertainment': '🎬',
      'Bills and Utilities': '💡',
      'Health and Fitness': '💪',
      'Travel': '✈️',
      'Education': '📚',
      'Personal Care': '💄',
      'Home Improvement': '🏠',
      'Other': '📊'
    };
    
    return categoryIcons[category] || '📊';
  },

  // Helper function to get category color
  getCategoryColor(category) {
    const categoryColors = {
      'Food and Drink': 'bg-green-50 border-green-200',
      'Shopping': 'bg-blue-50 border-blue-200',
      'Transportation': 'bg-purple-50 border-purple-200',
      'Entertainment': 'bg-pink-50 border-pink-200',
      'Bills and Utilities': 'bg-yellow-50 border-yellow-200',
      'Health and Fitness': 'bg-red-50 border-red-200',
      'Travel': 'bg-indigo-50 border-indigo-200',
      'Education': 'bg-teal-50 border-teal-200',
      'Personal Care': 'bg-orange-50 border-orange-200',
      'Home Improvement': 'bg-gray-50 border-gray-200',
      'Other': 'bg-slate-50 border-slate-200'
    };
    
    return categoryColors[category] || 'bg-slate-50 border-slate-200';
  }
}; 