import React, { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '../contexts/AuthContext';
import plaidService from '../services/plaidService';

const PlaidLink = ({ onSuccess, onExit, children }) => {
  const { user } = useAuth();
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch link token from backend
  useEffect(() => {
    const fetchLinkToken = async () => {
      if (!user) {
        console.log("🔒 User not authenticated, skipping link token fetch");
        setError('Please sign in to connect your bank account.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log("🔄 Fetching Plaid link token...");
        console.log("👤 User:", user?.email);
        
        const token = await plaidService.getLinkToken();
        console.log("✅ Link token received:", token);
        
        if (token && typeof token === 'string' && token.length > 0) {
          setLinkToken(token);
        } else {
          throw new Error('Invalid link token received');
        }
      } catch (err) {
        console.error("❌ Error fetching link token:", err);
        console.error("❌ Error response data:", err.response?.data);
        console.error("❌ Error status:", err.response?.status);
        
        // Handle 403 Forbidden error - user not authenticated
        if (err.response?.status === 403) {
          console.log("🚫 403 Forbidden - User not authenticated");
          setError('Please sign in to connect your bank account.');
        } else {
          setError('Failed to initialize Plaid Link. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLinkToken();
  }, [user]);

  const onPlaidSuccess = async (publicToken, metadata) => {
    console.log("🎉 Plaid Link Success!");
    console.log("✅ Public Token received:", publicToken);
    console.log("🔍 Metadata:", metadata);
    console.log("📊 Institution:", metadata.institution);
    console.log("🏦 Accounts:", metadata.accounts);
    console.log("🔗 Link Session ID:", metadata.link_session_id);
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Exchanging public token for access token...");
      const result = await plaidService.exchangePublicToken(publicToken);
      console.log("✅ Access token exchange successful:", result);
      console.log("🔑 Access Token:", result.access_token);
      console.log("🆔 Item ID:", result.item_id);
      
      // Call the success callback with the result
      if (onSuccess) {
        onSuccess(result, metadata);
      }
    } catch (err) {
      console.error("❌ Error exchanging public token:", err);
      setError('Failed to connect your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onPlaidExit = (err, metadata) => {
    console.log("🚪 Plaid Link Exit");
    console.log("🔍 Exit metadata:", metadata);
    if (err) {
      console.error("❌ Plaid Link error:", err);
      console.log("🚫 Error display name:", err.display_message);
      console.log("🚫 Error code:", err.error_code);
      console.log("🚫 Error type:", err.error_type);
    }
    if (onExit) {
      onExit(err, metadata);
    }
  };

  // Don't call usePlaidLink until linkToken is ready
  const config = linkToken
    ? {
        token: linkToken,
        onSuccess: onPlaidSuccess,
        onExit: onPlaidExit,
      }
    : null;

  const { open, ready } = usePlaidLink(config || {}); // avoids crash by ensuring config is at least {}

  const handleClick = () => {
    if (ready && !loading && linkToken) {
      console.log("🚀 Opening Plaid Link...");
      console.log("🔗 Link Token:", linkToken);
      open();
    } else {
      console.log("⚠️ Plaid Link not ready yet");
    }
  };

  // Show loading state while fetching token
  if (loading && !linkToken) {
    return (
      <button
        disabled
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Loading Plaid...
        </div>
      </button>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
        <button
          onClick={() => {
            setError(null);
            setLinkToken(null);
          }}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Optionally wait to render the button
  if (!linkToken) {
    return (
      <button
        disabled
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
      >
        Loading Plaid...
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!ready || loading}
      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Connecting...
        </div>
      ) : (
        children || 'Connect Bank Account'
      )}
    </button>
  );
};

export default PlaidLink; 