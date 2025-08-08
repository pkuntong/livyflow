import React from 'react';
import { CreditCard, Shield, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/design-system';

const OnboardingGuide = ({ onConnectBank }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome to LivyFlow! 🎉
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Connect your bank account to start tracking your finances and see your real-time financial overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Bank-Level Security</h3>
          <p className="text-sm text-gray-600">256-bit SSL encryption keeps your data safe</p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Automatic Sync</h3>
          <p className="text-sm text-gray-600">Transactions sync automatically from your bank</p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Smart Insights</h3>
          <p className="text-sm text-gray-600">Get personalized spending insights and trends</p>
        </div>
      </div>

      <div className="text-center">
        <Button 
          onClick={onConnectBank}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          Connect Bank Account
        </Button>
        <p className="text-xs text-gray-500 mt-3">
          Powered by Plaid • Read-only access • No account credentials stored
        </p>
      </div>
    </div>
  );
};

export default OnboardingGuide;
