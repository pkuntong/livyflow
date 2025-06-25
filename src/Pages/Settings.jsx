import React, { useState } from 'react';
import AlertSettings from '../components/AlertSettings';
import AlertHistory from '../components/AlertHistory';
import EmailPreferences from '../components/EmailPreferences';
import AccountManagement from '../components/AccountManagement';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', name: 'Account', icon: '👤' },
    { id: 'alerts', name: 'Alert Settings', icon: '🔔' },
    { id: 'history', name: 'Alert History', icon: '📋' },
    { id: 'email', name: 'Email Notifications', icon: '📧' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences and notifications.</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'account' && <AccountManagement />}
        {activeTab === 'alerts' && <AlertSettings />}
        {activeTab === 'history' && <AlertHistory />}
        {activeTab === 'email' && <EmailPreferences />}
      </div>
    </div>
  );
};

export default Settings; 