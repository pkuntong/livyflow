import { auth } from '../firebase';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const recurringSubscriptionsService = {
  async getRecurringSubscriptions() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
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

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching recurring subscriptions:', error);
      throw error;
    }
  },

  async createTestData() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/transactions/recurring/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create test data');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating test data:', error);
      throw error;
    }
  },

  // Helper function to get subscription icon based on name
  getSubscriptionIcon(name) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('netflix')) return '🎬';
    if (lowerName.includes('spotify')) return '🎵';
    if (lowerName.includes('amazon') || lowerName.includes('prime')) return '📦';
    if (lowerName.includes('youtube') || lowerName.includes('google')) return '📺';
    if (lowerName.includes('apple') || lowerName.includes('icloud')) return '🍎';
    if (lowerName.includes('microsoft') || lowerName.includes('office')) return '💻';
    if (lowerName.includes('adobe')) return '🎨';
    if (lowerName.includes('dropbox')) return '☁️';
    if (lowerName.includes('zoom')) return '📹';
    if (lowerName.includes('slack')) return '💬';
    if (lowerName.includes('notion')) return '📝';
    if (lowerName.includes('figma')) return '🎨';
    if (lowerName.includes('canva')) return '🎨';
    if (lowerName.includes('grammarly')) return '✍️';
    if (lowerName.includes('lastpass') || lowerName.includes('1password')) return '🔐';
    if (lowerName.includes('uber') || lowerName.includes('lyft')) return '🚗';
    if (lowerName.includes('doordash') || lowerName.includes('grubhub')) return '🍕';
    if (lowerName.includes('gym') || lowerName.includes('fitness')) return '💪';
    if (lowerName.includes('phone') || lowerName.includes('mobile')) return '📱';
    if (lowerName.includes('internet') || lowerName.includes('wifi')) return '🌐';
    if (lowerName.includes('insurance')) return '🛡️';
    if (lowerName.includes('bank') || lowerName.includes('credit')) return '🏦';
    if (lowerName.includes('utility') || lowerName.includes('electric')) return '⚡';
    if (lowerName.includes('water')) return '💧';
    if (lowerName.includes('gas')) return '🔥';
    
    // Default icons based on category
    return '💳';
  },

  // Helper function to get frequency color
  getFrequencyColor(frequency) {
    switch (frequency) {
      case 'Weekly':
        return 'text-red-600 bg-red-50';
      case 'Bi-weekly':
        return 'text-orange-600 bg-orange-50';
      case 'Monthly':
        return 'text-blue-600 bg-blue-50';
      case 'Quarterly':
        return 'text-purple-600 bg-purple-50';
      case 'Yearly':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  },

  // Helper function to format next expected date
  formatNextExpectedDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
}; 