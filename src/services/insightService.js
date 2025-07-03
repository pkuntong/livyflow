import { auth } from '../firebase';

// In development, use the Vite proxy to avoid CORS issues
const isDev = import.meta.env.DEV;
const API_BASE_URL = isDev ? '/api/v1' : 'https://livyflow.onrender.com/api/v1';
console.log("🔧 InsightService initialized with API URL:", API_BASE_URL);
console.log("🔧 Development mode:", isDev);

// Helper function to get auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return await user.getIdToken();
};

// Get all insights for the current user
export const fetchInsights = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/insights`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching insights:', error);
    throw error;
  }
}; 