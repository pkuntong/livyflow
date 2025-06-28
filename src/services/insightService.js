import { auth } from '../firebase';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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