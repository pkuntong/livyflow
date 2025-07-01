import { auth } from '../firebase';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1`;
console.log("🔧 AlertService initialized with API URL:", API_BASE_URL);

export const alertService = {
  async createAlertRule(alertData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create alert rule');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating alert rule:', error);
      throw error;
    }
  },

  async getAlertRules() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch alert rules');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      throw error;
    }
  },

  async updateAlertRule(alertId, alertData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update alert rule');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating alert rule:', error);
      throw error;
    }
  },

  async deleteAlertRule(alertId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete alert rule');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      throw error;
    }
  },

  async checkAlerts() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/alerts/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to check alerts');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking alerts:', error);
      throw error;
    }
  },

  async getAlertTriggers() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/alerts/triggers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch alert triggers');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching alert triggers:', error);
      throw error;
    }
  },

  async resolveAlertTrigger(triggerId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/alerts/triggers/${triggerId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to resolve alert trigger');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error resolving alert trigger:', error);
      throw error;
    }
  },

  // Helper function to get alert type display name
  getAlertTypeDisplayName(type) {
    const typeNames = {
      'balance_low': 'Low Balance',
      'spending_high': 'High Spending',
      'recurring_subscription': 'New Subscription',
      'budget_exceeded': 'Budget Exceeded'
    };
    return typeNames[type] || type;
  },

  // Helper function to get alert type icon
  getAlertTypeIcon(type) {
    const icons = {
      'balance_low': '⚠️',
      'spending_high': '💰',
      'recurring_subscription': '🔄',
      'budget_exceeded': '📊'
    };
    return icons[type] || '🔔';
  },

  // Helper function to get alert type color
  getAlertTypeColor(type) {
    const colors = {
      'balance_low': 'text-red-600 bg-red-50',
      'spending_high': 'text-orange-600 bg-orange-50',
      'recurring_subscription': 'text-blue-600 bg-blue-50',
      'budget_exceeded': 'text-purple-600 bg-purple-50'
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  },

  // Helper function to format trigger date
  formatTriggerDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
}; 