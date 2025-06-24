import React, { useState, useEffect } from 'react';
import emailPreferencesService from '../services/emailPreferencesService';
import { ToastContainer, toast } from 'react-toastify';

const EmailPreferences = () => {
    const [preferences, setPreferences] = useState({
        weekly_email_summary: false,
        budget_alerts: true,
        spending_alerts: true,
        account_alerts: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            setLoading(true);
            const data = await emailPreferencesService.getEmailPreferences();
            setPreferences(data);
        } catch (error) {
            console.error('Error loading preferences:', error);
            toast.error('Failed to load email preferences');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key) => {
        try {
            setSaving(true);
            const updatedPreferences = {
                ...preferences,
                [key]: !preferences[key]
            };
            
            const result = await emailPreferencesService.updateEmailPreferences({
                [key]: !preferences[key]
            });
            
            setPreferences(result);
            toast.success(`${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} updated successfully`);
        } catch (error) {
            console.error('Error updating preference:', error);
            toast.error('Failed to update preference');
        } finally {
            setSaving(false);
        }
    };

    const handleTestWeeklyEmail = async () => {
        try {
            setTesting(true);
            await emailPreferencesService.testWeeklyEmail();
            toast.success('Test weekly email sent successfully! Check your inbox.');
        } catch (error) {
            console.error('Error sending test email:', error);
            toast.error('Failed to send test email');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-6 bg-gray-200 rounded w-12"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <ToastContainer />
            
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">📧 Email Notifications</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Manage your email notification preferences
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Weekly Email Summary */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 text-lg">📊</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">Weekly Budget Summary</h4>
                                <p className="text-sm text-gray-600">
                                    Receive a detailed summary of your spending every Monday
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleTestWeeklyEmail}
                            disabled={testing || !preferences.weekly_email_summary}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                preferences.weekly_email_summary
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {testing ? 'Sending...' : 'Test'}
                        </button>
                        <button
                            onClick={() => handleToggle('weekly_email_summary')}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                preferences.weekly_email_summary ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    preferences.weekly_email_summary ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Budget Alerts */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="text-green-600 text-lg">💰</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">Budget Alerts</h4>
                            <p className="text-sm text-gray-600">
                                Get notified when you exceed your budget limits
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('budget_alerts')}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            preferences.budget_alerts ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                preferences.budget_alerts ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                {/* Spending Alerts */}
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <span className="text-yellow-600 text-lg">⚠️</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">Spending Alerts</h4>
                            <p className="text-sm text-gray-600">
                                Receive alerts for unusual spending patterns
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('spending_alerts')}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            preferences.spending_alerts ? 'bg-yellow-600' : 'bg-gray-200'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                preferences.spending_alerts ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                {/* Account Alerts */}
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-purple-600 text-lg">🏦</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">Account Alerts</h4>
                            <p className="text-sm text-gray-600">
                                Get notified about account balance changes
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('account_alerts')}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            preferences.account_alerts ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                preferences.account_alerts ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs">ℹ️</span>
                    </div>
                    <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-700 mb-1">About Email Notifications</p>
                        <p>
                            Weekly summaries are sent every Monday at 9 AM. You can test the weekly email 
                            feature by clicking the "Test" button above. Make sure to check your spam folder 
                            if you don't receive emails.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailPreferences; 