import { auth } from '../firebase';

const API_BASE_URL = 'http://localhost:8000/api/v1';

class EmailPreferencesService {
    async getAuthHeaders() {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }
        const token = await user.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    async getEmailPreferences() {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/email/preferences`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching email preferences:', error);
            throw error;
        }
    }

    async updateEmailPreferences(preferences) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/email/preferences`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(preferences),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating email preferences:', error);
            throw error;
        }
    }

    async testWeeklyEmail() {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/email/test-weekly`, {
                method: 'POST',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending test weekly email:', error);
            throw error;
        }
    }
}

export default new EmailPreferencesService(); 