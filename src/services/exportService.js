import axios from 'axios';
import { auth } from '../firebase';

class ExportService {
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
    
    console.log("🔧 ExportService initialized with API URL:", this.baseURL);
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

  // Export transactions as CSV
  async exportTransactionsCSV(params = {}) {
    try {
      console.log("📊 Exporting transactions as CSV...");
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const queryParams = new URLSearchParams({
        format: 'csv',
        ...params
      });

      const response = await axios.get(`${this.baseURL}/api/v1/export/transactions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        responseType: 'blob', // Important for file downloads
      });

      console.log("✅ CSV export successful");
      console.log("📁 File size:", response.data.size, "bytes");

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'livyflow_transactions.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('❌ Error exporting CSV:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }

  // Export transactions as PDF
  async exportTransactionsPDF(params = {}) {
    try {
      console.log("📄 Exporting transactions as PDF...");
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found - user must be signed in');
      }

      const queryParams = new URLSearchParams({
        format: 'pdf',
        ...params
      });

      const response = await axios.get(`${this.baseURL}/api/v1/export/transactions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        responseType: 'blob', // Important for file downloads
      });

      console.log("✅ PDF export successful");
      console.log("📁 File size:", response.data.size, "bytes");

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'livyflow_transactions.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }
}

export default new ExportService(); 