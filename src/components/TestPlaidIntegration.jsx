import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import plaidService from '../services/plaidService';

const TestPlaidIntegration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testLinkToken = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log("🧪 Testing Plaid link token endpoint...");
      console.log("👤 User:", user.email);
      console.log("🆔 User ID:", user.uid);
      
      const linkToken = await plaidService.getLinkToken();
      setResult({ type: 'link_token', data: linkToken });
      console.log("✅ Link token test successful:", linkToken);
      console.log("📦 Full response data:", linkToken);
    } catch (err) {
      setError(err.message);
      console.error("❌ Link token test failed:", err);
      console.error("❌ Error response data:", err.response?.data);
      console.error("❌ Error status:", err.response?.status);
      console.error("❌ Error message:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const testBackendHealth = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log("🏥 Testing backend health...");
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult({ type: 'health', data });
        console.log("✅ Backend health check successful:", data);
      } else {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
    } catch (err) {
      setError(err.message);
      console.error("❌ Backend health check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Authentication Required</h3>
        <p className="text-yellow-700">Please sign in to test the Plaid integration.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Plaid Integration Test</h3>
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>User:</strong> {user.email} ({user.uid})
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={testBackendHealth}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Backend Health'}
        </button>
        
        <button
          onClick={testLinkToken}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testing...' : 'Test Link Token'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="font-semibold text-red-800">Error</h4>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800">Success</h4>
          <div className="text-green-700 text-sm">
            <p><strong>Type:</strong> {result.type}</p>
            <p><strong>Data:</strong></p>
            <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestPlaidIntegration; 