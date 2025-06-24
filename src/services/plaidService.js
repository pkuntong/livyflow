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

  // Fetch link token from backend
  async getLinkToken() {
    try {
      console.log("🌐 Making request to:", `${this.baseURL}/api/v1/plaid/link-token`);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/plaid/link-token`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("📡 Response status:", response.status);
      console.log("📦 Full response data:", response.data);
      console.log("✅ Link token:", response.data.link_token);

      return response.data.link_token;
    } catch (error) {
      console.error('❌ Error fetching link token:', error);
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
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", response.headers);
      console.log("📦 Full response data:", response.data);

      return response.data;
    } catch (error) {
      console.error('❌ Error exchanging public token:', error);
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
      });

      console.log("📡 Response status:", response.status);
      console.log("📦 Full response data:", response.data);
      console.log("🏦 Account count:", response.data.accounts?.length || 0);

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
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
      });

      console.log("📡 Response status:", response.status);
      console.log("📦 Full response data:", response.data);
      console.log("💰 Transaction count:", response.data.transactions?.length || 0);

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }
}

export default new PlaidService(); 