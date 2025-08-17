import { apiRequest } from '../utils/apiClient';

// In development, use the Vite proxy to avoid CORS issues
const isDev = import.meta.env.DEV;
const API_BASE_URL = '/api/v1';
console.log("🔧 InsightService initialized with API URL:", API_BASE_URL);
console.log("🔧 Development mode:", isDev);

// Get all insights for the current user
export const fetchInsights = async () => {
  try {
    const response = await apiRequest(`${API_BASE_URL}/insights`, {
      method: 'GET',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching insights:', error);
    throw error;
  }
}; 