import axios from 'axios';
import { auth } from '../firebase';

class PlaidService {
  constructor() {
    // Use relative URLs since Vite will proxy /api requests to backend
    this.baseURL = '';
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

      const endpoint = useTestEndpoint ? '/api/v1/plaid/link-token/test' : '/api/v1/plaid/link-token';
      console.log("🌐 Making request to:", `${this.baseURL}${endpoint}`);
      
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

      console.log("📡 Response status:", response.status);
      console.log("📦 Full response data:", response.data);
      console.log("✅ Link token:", response.data.link_token);

      return response.data.link_token;
    } catch (error) {
      console.error('❌ Error fetching link token:', error);
      
      // Handle specific error cases
      if (error.code === 'ECONNREFUSED' || error.message.includes('Backend server is not available')) {
        throw new Error('Backend server is not running. Please start the backend server on localhost:8000');
      }
      
      if (error.response?.status === 500) {
        console.error('❌ Backend error response data:', error.response?.data);
        throw new Error(`Backend error: ${error.response?.data?.detail || 'Unknown server error'}`);
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please sign in again.');
      }
      
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }

  // Exchange public token for access token
  async exchangePublicToken(publicToken) {
    try {
      console.log("🌐 Making request to:", `${this.baseURL}/api/v1/plaid/exchange-token`);
      console.log("🔄 Public token to exchange:", publicToken);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const requestBody = {
        public_token: publicToken,
      };
      console.log("📤 Request body:", requestBody);

      const response = await axios.post(`${this.baseURL}/api/v1/plaid/exchange-token`, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", response.headers);
      console.log("📦 Full response data:", response.data);

      return response.data;
    } catch (error) {
      console.error('❌ Error exchanging public token:', error);
      
      // Handle specific error cases
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server is not running. Please start the backend server on localhost:8000');
      }
      
      if (error.response?.status === 500) {
        console.error('❌ Backend error response data:', error.response?.data);
        throw new Error(`Backend error: ${error.response?.data?.detail || 'Unknown server error'}`);
      }
      
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }

  // Get accounts from Plaid
  async getAccounts() {
    try {
      console.log("🌐 Making request to:", `${this.baseURL}/api/v1/plaid/accounts`);
      
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

      console.log("📡 Response status:", response.status);
      console.log("📦 Full response data:", response.data);
      console.log("🏦 Account count:", response.data.accounts?.length || 0);

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
      
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