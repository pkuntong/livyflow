import axios from 'axios';
import { auth } from '../firebase';

class BudgetService {
  constructor() {
    // Use environment variable for API URL, fallback to localhost for development
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    console.log("🔧 BudgetService initialized with API URL:", this.baseURL);
  }

  // Get Firebase ID token for authentication
  async getAuthToken() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("🔑 No authenticated user found");
        return null;
      }
      
      console.log("🔑 Getting Firebase ID token for user:", user.email);
      const idToken = await user.getIdToken();
      console.log("🔑 Firebase ID token retrieved:", idToken ? "✅ Present" : "❌ Missing");
      if (idToken) {
        console.log("🔑 Token length:", idToken.length);
        console.log("🔑 Token preview:", idToken.substring(0, 20) + "...");
      }
      return idToken;
    } catch (error) {
      console.error("❌ Error getting Firebase ID token:", error);
      return null;
    }
  }

  // Create a new budget
  async createBudget(budgetData) {
    try {
      console.log("📊 Creating new budget:", budgetData);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.post(`${this.baseURL}/api/v1/budgets`, budgetData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Budget created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating budget:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  // Get all budgets for the user
  async getBudgets() {
    try {
      console.log("📊 Fetching user budgets...");
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/budgets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Budgets fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching budgets:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  // Update an existing budget
  async updateBudget(budgetId, budgetData) {
    try {
      console.log(`📊 Updating budget ${budgetId}:`, budgetData);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.put(`${this.baseURL}/api/v1/budgets/${budgetId}`, budgetData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Budget updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating budget:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  // Delete a budget
  async deleteBudget(budgetId) {
    try {
      console.log(`🗑️ Deleting budget ${budgetId}...`);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.delete(`${this.baseURL}/api/v1/budgets/${budgetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Budget deleted successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting budget:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  // Get spending summary
  async getSpendingSummary() {
    try {
      console.log("📊 Fetching spending summary...");
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/budgets/spending-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Spending summary fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching spending summary:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  // Get budget suggestions
  async getBudgetSuggestions() {
    try {
      console.log("🧠 Fetching budget suggestions...");
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/budgets/suggestions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Budget suggestions fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching budget suggestions:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }
}

export default new BudgetService(); 