import { auth } from '../firebase';

// In development, use the Vite proxy to avoid CORS issues
const isDev = import.meta.env.DEV;
const API_BASE_URL = isDev ? '/api/v1' : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1`;
console.log("🔧 NotificationService initialized with API URL:", API_BASE_URL);
console.log("🔧 Development mode:", isDev);

// Helper function to get auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return await user.getIdToken();
};

// Get all notifications for the current user
export const fetchNotifications = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/notifications`, {
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
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Create a new notification
export const createNotification = async (notificationData) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Mark a notification as read
export const markNotificationRead = async (notificationId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'PATCH',
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
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Delete a notification
export const deleteNotification = async (notificationId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}; 