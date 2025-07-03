import { auth } from '../firebase';

// In development, use the Vite proxy to avoid CORS issues
const isDev = import.meta.env.DEV;
const API_BASE_URL = isDev ? '/api/v1' : 'https://livyflow.onrender.com/api/v1';
console.log("🔧 EmailPreferencesService initialized with API URL:", API_BASE_URL);
console.log("🔧 Development mode:", isDev);

// Helper function to get auth token
const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No authenticated user');
    }
    return await user.getIdToken();
};

class EmailPreferencesService {
    // Get user's email preferences
    async getPreferences() {
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/email/preferences`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch email preferences');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching email preferences:', error);
            throw error;
        }
    }

    // Update user's email preferences
    async updatePreferences(preferences) {
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/email/preferences`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preferences),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update email preferences');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating email preferences:', error);
            throw error;
        }
    }
}

export default new EmailPreferencesService(); 