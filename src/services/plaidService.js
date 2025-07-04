import axios from 'axios';
import { auth } from '../firebase';

class PlaidService {
  constructor() {
    // In development, use the Vite proxy to avoid CORS issues
    const isDev = import.meta.env.DEV;
    
    // Use production URL directly if not in development
    if (isDev) {
      this.baseURL = ''; // Use Vite proxy
    } else {
      // Production - use the actual backend URL
      this.baseURL = 'https://livyflow.onrender.com';
    }
    
    // Security: Only log in development
    if (isDev) {
      console.log("PlaidService initialized with API URL:", this.baseURL);
      console.log("Environment:", import.meta.env.VITE_ENVIRONMENT || 'development');
    }
  }

  // Get Firebase ID token for authentication
  async getAuthToken() {
    try {
      const user = auth.currentUser;
      if (!user) {
        return null;
      }
      
      const idToken = await user.getIdToken();
      return idToken;
    } catch (error) {
      console.error("Error getting Firebase ID token:", error);
      return null;
    }
  }

  // Check if backend is available
  async checkBackendHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/api/health`, {
        timeout: 5000 // 5 second timeout
      });
      return response.status === 200;
    } catch (error) {
      console.error("❌ Backend health check failed:", error.message);
      return false;
    }
  }

  // Fetch link token from backend (with fallback to test endpoint)
  async getLinkToken(useTestEndpoint = false) {
    try {
      // Check if backend is available
      const backendAvailable = await this.checkBackendHealth();
      if (!backendAvailable) {
        throw new Error('Backend server is not available. Please ensure the backend is running on localhost:8000');
      }

      const endpoint = '/api/v1/plaid/link-token';
      if (import.meta.env.DEV) {
        console.log("Making request to:", `${this.baseURL}${endpoint}`);
      }
      
      let config = {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      };

      // Only add auth header if not using test endpoint
      if (!useTestEndpoint) {
        const token = await this.getAuthToken();
        if (!token) {
          throw new Error('No authentication token found - user must be signed in');
        }
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(`${this.baseURL}${endpoint}`, config);

      if (import.meta.env.DEV) {
        console.log("Response status:", response.status);
        console.log("Link token received");
      }

      return response.data.link_token;
    } catch (error) {
      console.error('Error fetching link token:', error);
      
      // Handle specific error cases
      if (error.code === 'ECONNREFUSED' || error.message.includes('Backend server is not available')) {
        throw new Error('Backend server is not running. Please start the backend server.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Backend configuration error. Please check the server logs.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please sign in again.');
      }
      throw error;
    }
  }

  // Exchange public token for access token
  async exchangePublicToken(publicToken) {
    try {
      if (import.meta.env.DEV) {
        console.log("Making request to:", `${this.baseURL}/api/v1/plaid/exchange-token`);
      }
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const requestBody = {
        public_token: publicToken,
      };

      const response = await axios.post(`${this.baseURL}/api/v1/plaid/exchange-token`, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });

      if (import.meta.env.DEV) {
        console.log("Response status:", response.status);
      }

      return response.data;
    } catch (error) {
      console.error('Error exchanging public token:', error);
      
      // Handle specific error cases
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server is not running. Please start the backend server.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Backend configuration error. Please check the server logs.');
      }
      
      throw error;
    }
  }

  // Get accounts from Plaid
  async getAccounts() {
    try {
      if (import.meta.env.DEV) {
        console.log("Making request to:", `${this.baseURL}/api/v1/plaid/accounts`);
      }
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/plaid/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });

      if (import.meta.env.DEV) {
        console.log("Response status:", response.status);
        console.log("Account count:", response.data.accounts?.length || 0);
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      
      // Handle specific error cases
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server is not running. Please start the backend server.');
      }
      
      if (error.response?.status === 400) {
        throw new Error('No bank account connected. Please connect your bank account first.');
      }
      
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }

  // Get transactions from Plaid (updated to use stored access token)
  async getTransactions(startDate = null, endDate = null, count = 100) {
    try {
      console.log("🌐 Making request to:", `${this.baseURL}/api/v1/plaid/transactions`);
      console.log("📅 Date range:", { startDate, endDate, count });
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const params = new URLSearchParams({
        count: count.toString()
      });
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const url = `${this.baseURL}/api/v1/plaid/transactions?${params.toString()}`;
      console.log("🔗 Full URL:", url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000 // 15 second timeout for transactions
      });

      console.log("📡 Response status:", response.status);
      console.log("📦 Full response data:", response.data);
      console.log("💰 Transaction count:", response.data.transactions?.length || 0);

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      
      // Handle specific error cases
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server is not running. Please start the backend server on localhost:8000');
      }
      
      if (error.response?.status === 400) {
        throw new Error('No bank account connected. Please connect your bank account first.');
      }
      
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }
}

export default new PlaidService(); 