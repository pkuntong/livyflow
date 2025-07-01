import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PlaidLink from './PlaidLink';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

const ConnectBankAccount = () => {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  // Add mount logging
  useEffect(() => {
    console.log("🚨 ConnectBankAccount component mounted");
    console.log("👤 User authentication status:", user ? "✅ Signed in" : "❌ Not signed in");
    if (user) {
      console.log("👤 User email:", user.email);
      console.log("🆔 User ID:", user.uid);
    }
  }, [user]);

  const handlePlaidSuccess = (result, metadata) => {
    console.log("🎉 ConnectBankAccount: Plaid connection successful!");
    console.log("📊 Full result:", result);
    console.log("🔍 Full metadata:", metadata);
    console.log("🔑 Access token:", result.access_token);
    console.log("🆔 Item ID:", result.item_id);
    console.log("👤 User ID:", result.user_id);
    console.log("💾 Stored status:", result.stored);
    console.log("📝 Message:", result.message);
    
    // Add the connected account to the list
    const newAccount = {
      id: result.access_token,
      institution: metadata.institution?.name || 'Unknown Bank',
      accounts: metadata.accounts || [],
      connectedAt: new Date().toISOString(),
    };
    
    console.log("💾 New account object:", newAccount);
    console.log("📋 Institution name:", newAccount.institution);
    console.log("🏦 Number of accounts:", newAccount.accounts.length);
    console.log("📅 Connected at:", newAccount.connectedAt);
    
    setConnectedAccounts(prev => {
      const updated = [...prev, newAccount];
      console.log("📈 Updated accounts list:", updated);
      return updated;
    });
    setConnectionStatus('success');
    
    // You can store this data in your backend or state management
    console.log("💾 Ready to store account data in backend/database");
    
    // Show success toast
    console.log("🎉 Plaid connection completed successfully!");
  };

  const handlePlaidExit = (err, metadata) => {
    console.log("🚪 ConnectBankAccount: Plaid connection exited");
    console.log("🔍 Exit metadata:", metadata);
    if (err) {
      console.error("❌ Plaid exit error:", err);
      console.log("🚫 Error display message:", err.display_message);
      console.log("🚫 Error code:", err.error_code);
      console.log("🚫 Error type:", err.error_type);
      setConnectionStatus('error');
    } else {
      console.log("✅ Plaid exited without error (user cancelled)");
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