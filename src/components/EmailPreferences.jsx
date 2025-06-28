import React, { useState, useEffect } from 'react';
import { Mail, Bell, TrendingUp, Shield, Save, Loader2 } from 'lucide-react';
import emailPreferencesService from '../services/emailPreferencesService';
import { toast } from 'react-toastify';

const EmailPreferences = () => {
    const [preferences, setPreferences] = useState({
        weekly_email_summary: false,
        budget_alerts: true,
        spending_alerts: true,
        account_alerts: true
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const loadPreferences = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await emailPreferencesService.getPreferences();
            setPreferences(data);
        } catch (err) {
            console.error('Error loading email preferences:', err);
            setError('Failed to load email preferences');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updatedPreferences = await emailPreferencesService.updatePreferences(preferences);
            setPreferences(updatedPreferences);
            toast.success('Email preferences updated successfully!');
        } catch (err) {
            console.error('Error updating email preferences:', err);
            toast.error('Failed to update email preferences');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (key) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Load preferences on component mount
    useEffect(() => {
        loadPreferences();
    }, []);

    const preferenceItems = [
        {
            key: 'weekly_email_summary',
            title: 'Weekly Email Summary',
            description: 'Receive a weekly summary of your spending, budgets, and financial insights every Monday.',
            icon: Mail,
            color: 'bg-blue-100 text-blue-600'
        },
        {
            key: 'budget_alerts',
            title: 'Budget Alerts',
            description: 'Get notified when you\'re approaching or exceeding your budget limits.',
            icon: TrendingUp,
            color: 'bg-green-100 text-green-600'
        },
        {
            key: 'spending_alerts',
            title: 'Spending Alerts',
            description: 'Receive alerts for unusual spending patterns or high-value transactions.',
            icon: Bell,
            color: 'bg-yellow-100 text-yellow-600'
        },
        {
            key: 'account_alerts',
            title: 'Account Alerts',
            description: 'Get notified about account balance changes, connection issues, or security events.',
            icon: Shield,
            color: 'bg-purple-100 text-purple-600'
        }
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Email Preferences</h2>
                            <p className="text-sm text-gray-600">Manage your email notification settings</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-3 text-blue-600">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Loading email preferences...</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {preferenceItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.key}
                                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                                                <p className="text-sm text-gray-600">{item.description}</p>
                                            </div>
                                            
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences[item.key]}
                                                    onChange={() => handleToggle(item.key)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer Info */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">About Email Notifications</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Weekly summaries are sent every Monday at 9 AM</li>
                        <li>• Budget and spending alerts are sent in real-time</li>
                        <li>• You can unsubscribe from any email at any time</li>
                        <li>• All emails include links to manage your preferences</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default EmailPreferences; 