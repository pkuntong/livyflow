import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PlaidLink from './PlaidLink';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

const ConnectBankAccount = () => {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [connectedAccounts, setConnectedAccounts] = useState([]);



  const handlePlaidSuccess = (result, metadata) => {
    // Add the connected account to the list
    const newAccount = {
      id: result.access_token,
      institution: metadata.institution?.name || 'Unknown Bank',
      accounts: metadata.accounts || [],
      connectedAt: new Date().toISOString(),
    };
    
    setConnectedAccounts(prev => {
      const updated = [...prev, newAccount];
      return updated;
    });
    setConnectionStatus('success');
  };

  const handlePlaidExit = (err, metadata) => {
    if (err) {
      setConnectionStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-8 h-8 text-emerald-500" />
          <h2 className="text-2xl font-bold text-gray-900">Connect Bank Account</h2>
        </div>

        {connectionStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-800 font-medium">
                Bank account connected successfully!
              </span>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-800 font-medium">
                Failed to connect bank account. Please try again.
              </span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connect Your Bank
            </h3>
            <p className="text-gray-600 mb-4">
              Securely connect your bank account to automatically import transactions 
              and track your spending in LivyFlow.
            </p>
            
            <PlaidLink
              onSuccess={handlePlaidSuccess}
              onExit={handlePlaidExit}
            >
              Connect Bank Account
            </PlaidLink>
          </div>

          {connectedAccounts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Connected Accounts
              </h3>
              <div className="space-y-3">
                {connectedAccounts.map((account, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {account.institution}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {account.accounts.length} account(s) connected
                        </p>
                        <p className="text-xs text-gray-400">
                          Connected on {new Date(account.connectedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectBankAccount; 