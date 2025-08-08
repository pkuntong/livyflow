import axios from 'axios';
import { auth } from '../firebase';

class PlaidService {
  constructor() {
    // In development, use the Vite proxy to avoid CORS issues
    const isDev = import.meta.env.DEV;
    
    // Use same-origin API on Vercel
    if (isDev) {
      this.baseURL = ''; // Use Vite proxy
    } else {
      this.baseURL = ''; // Same origin (Vercel serverless functions under /api)
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
      // For serverless, treat same-origin as available
      return true;
    } catch (error) {
      return false;
    }
  }

  // Fetch link token from backend (with fallback to test endpoint)
  async getLinkToken(useTestEndpoint = false) {
    try {
      const endpoint = '/api/plaid/link-token';
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
      return response.data.link_token;
    } catch (error) {
      console.error('Error fetching link token:', error);
      throw error;
    }
  }

  // Exchange public token for access token
  async exchangePublicToken(publicToken) {
    try {
      if (import.meta.env.DEV) {
        console.log("Making request to:", `${this.baseURL}/api/plaid/exchange-token`);
      }
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const requestBody = { public_token: publicToken };

      const response = await axios.post(`${this.baseURL}/api/plaid/exchange-token`, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });

      return response.data;
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw error;
    }
  }

  // Get accounts from Plaid
  async getAccounts() {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/plaid/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  // Get transactions from Plaid
  async getTransactions(startDate = null, endDate = null, count = 100) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const params = new URLSearchParams({ count: String(count) });
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const url = `${this.baseURL}/api/plaid/transactions?${params.toString()}`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      throw error;
    }
  }
}

export default new PlaidService(); 