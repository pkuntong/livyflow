import { auth } from '../firebase';

// In development, use the Vite proxy to avoid CORS issues
const isDev = import.meta.env.DEV;
const API_BASE_URL = isDev ? '/api/v1' : 'https://livyflow.onrender.com/api/v1';
console.log("🔧 RecurringSubscriptionsService initialized with API URL:", API_BASE_URL);
console.log("🔧 Development mode:", isDev);

// Helper function to get auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return await user.getIdToken();
};

class RecurringSubscriptionsService {
  // Get all recurring subscriptions for the current user
  async getSubscriptions() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/transactions/recurring`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch recurring subscriptions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching recurring subscriptions:', error);
      throw error;
    }
  }

  // Get subscription icon based on name
  getSubscriptionIcon(name) {
    const icons = {
      'netflix': '📺',
      'spotify': '🎵',
      'amazon': '📦',
      'apple': '🍎',
      'google': '🔍',
      'microsoft': '💻',
      'adobe': '🎨',
      'dropbox': '☁️',
      'zoom': '📹',
      'slack': '💬',
      'github': '🐙',
      'figma': '🎨',
      'notion': '📝',
      'canva': '🎨',
      'mailchimp': '📧',
      'stripe': '💳',
      'shopify': '🛒',
      'squarespace': '🌐',
      'wix': '🌐',
      'wordpress': '📝'
    };

    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }
    return '💳'; // Default icon
  }

  // Get frequency color
  getFrequencyColor(frequency) {
    const colors = {
      'monthly': 'bg-blue-100 text-blue-800',
      'yearly': 'bg-green-100 text-green-800',
      'weekly': 'bg-purple-100 text-purple-800',
      'daily': 'bg-red-100 text-red-800'
    };
    return colors[frequency.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  // Format next expected date
  formatNextExpectedDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
      
      if (diffInDays < 0) {
        return 'Overdue';
      } else if (diffInDays === 0) {
        return 'Today';
      } else if (diffInDays === 1) {
        return 'Tomorrow';
      } else if (diffInDays < 7) {
        return `In ${diffInDays} days`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      return 'Invalid date';
    }
  }
}

export default new RecurringSubscriptionsService(); 