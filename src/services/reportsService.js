import axios from 'axios';
import { auth } from '../firebase';

class ReportsService {
  constructor() {
    // In development, use the Vite proxy to avoid CORS issues
    const isDev = import.meta.env.DEV;
    this.baseURL = isDev ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');
    console.log("🔧 ReportsService initialized with API URL:", this.baseURL);
    console.log("🔧 Development mode:", isDev);
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

  // Get monthly spending report
  async getMonthlyReport() {
    try {
      console.log("📊 Fetching monthly spending report...");
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/reports/monthly`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Monthly report fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching monthly report:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  // Get weekly spending report
  async getWeeklyReport() {
    try {
      console.log("📊 Fetching weekly spending report...");
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/reports/weekly`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Weekly report fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching weekly report:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  // Get category spending report
  async getCategoryReport() {
    try {
      console.log("📊 Fetching category spending report...");
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/reports/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("✅ Category report fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching category report:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }
}

export default new ReportsService(); 