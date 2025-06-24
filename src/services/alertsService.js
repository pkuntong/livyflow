import axios from 'axios';
import { auth } from '../firebase';

class AlertsService {
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

  // Fetch alerts from backend
  async getAlerts() {
    try {
      console.log("🌐 Making request to:", `${this.baseURL}/api/v1/alerts`);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const response = await axios.get(`${this.baseURL}/api/v1/alerts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("📡 Response status:", response.status);
      console.log("📦 Full response data:", response.data);
      console.log("🚨 Alert count:", response.data.alerts?.length || 0);

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching alerts:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }
}

export default new AlertsService(); 