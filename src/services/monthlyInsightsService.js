import { auth } from '../firebase';

// In development, use the Vite proxy to avoid CORS issues
const isDev = import.meta.env.DEV;
const API_BASE_URL = isDev ? '/api/v1' : 'https://livyflow.onrender.com/api/v1';
console.log("🔧 MonthlyInsightsService initialized with API URL:", API_BASE_URL);
console.log("🔧 Development mode:", isDev);

export const monthlyInsightsService = {
  async fetchMonthlyInsights() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/insights/monthly`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch monthly insights');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching monthly insights:', error);
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

  // Helper function to get change indicator
  getChangeIndicator(changePercent) {
    if (changePercent > 0) {
      return { icon: '🔴', color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (changePercent < 0) {
      return { icon: '🟢', color: 'text-green-600', bgColor: 'bg-green-50' };
    } else {
      return { icon: '⚪', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
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
  }
}; 