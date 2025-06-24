import { auth } from '../firebase';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const trendsService = {
  async fetchSpendingTrends(category = null, range = '6') {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      let url = `${API_BASE_URL}/transactions/trends?range=${range}`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch spending trends');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching spending trends:', error);
      throw error;
    }
  },

  // Helper function to get unique categories from trends data
  getUniqueCategories(trends) {
    const categories = new Set();
    trends.forEach(month => {
      month.categories.forEach(cat => {
        categories.add(cat.category);
      });
    });
    return Array.from(categories);
  },

  // Helper function to format data for Recharts
  formatDataForCharts(trends, selectedCategories = null) {
    if (!trends || trends.length === 0) {
      return [];
    }

    // Get all unique categories if none selected
    const allCategories = this.getUniqueCategories(trends);
    const categoriesToShow = selectedCategories || allCategories;

    // Create data points for each month
    return trends.map(month => {
      const dataPoint = {
        month: month.month,
        name: this.formatMonthName(month.month)
      };

      // Add data for each category
      categoriesToShow.forEach(category => {
        const categoryData = month.categories.find(cat => cat.category === category);
        dataPoint[category] = categoryData ? categoryData.amount : 0;
      });

      return dataPoint;
    });
  },

  // Helper function to format month names
  formatMonthName(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  },

  // Helper function to get color for category
  getCategoryColor(category, index = 0) {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000',
      '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
      '#800080', '#008000', '#000080', '#808000', '#800080'
    ];
    
    // Try to match common categories with specific colors
    const categoryColors = {
      'Food and Drink': '#ff6b6b',
      'Shopping': '#4ecdc4',
      'Transportation': '#45b7d1',
      'Entertainment': '#96ceb4',
      'Bills and Utilities': '#feca57',
      'Health and Fitness': '#ff9ff3',
      'Travel': '#54a0ff',
      'Education': '#5f27cd',
      'Personal Care': '#00d2d3',
      'Home Improvement': '#ff9f43'
    };

    return categoryColors[category] || colors[index % colors.length];
  }
}; 