import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import plaidService from '../services/plaidService';
import { toast } from 'react-toastify';

const PlaidLink = ({ onSuccess, onExit, children }) => {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate link token on component mount
  useEffect(() => {
    generateLinkToken();
  }, []);

  const generateLinkToken = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Generating Plaid link token...");
      
      // Use test endpoint for easier development (no auth required)
      const token = await plaidService.getLinkToken(true);
      console.log("✅ Link token generated:", token ? "Success" : "Failed");
      
      setLinkToken(token);
    } catch (error) {
      console.error("❌ Failed to generate link token:", error);
      setError(error.message);
      
      // Show user-friendly error message
      if (error.message.includes('Backend server is not running')) {
        toast.error('Backend server is not running. Please start the backend server and try again.');
      } else if (error.message.includes('Backend error')) {
        toast.error('Backend configuration error. Please check the server logs.');
      } else {
        toast.error(`Failed to connect to Plaid: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const onPlaidSuccess = async (public_token, metadata) => {
    console.log("✅ Bank linked!", metadata);

    try {
      // Now I must exchange the public_token with your backend:
      const response = await fetch("http://localhost:8000/api/v1/plaid/exchange-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ public_token, user_id: "CURRENT_USER_ID" }) // use your real user id
      });

      if (response.ok) {
        console.log("✅ Access token saved successfully");
        const result = await response.json();
        
        // Call the success callback with the correct parameters
        if (onSuccess) {
          console.log("📞 Calling parent onSuccess callback...");
          onSuccess(result, metadata);
        } else {
          console.warn("⚠️ No onSuccess callback provided");
        }
        
        toast.success('Bank account connected successfully!');
      } else {
        console.error("❌ Failed to save access token");
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save access token');
      }
    } catch (error) {
      console.error("❌ Failed to exchange public token:", error);
      
      // Show user-friendly error message
      if (error.message.includes('Backend server is not running')) {
        toast.error('Backend server is not running. Please start the backend server and try again.');
      } else if (error.message.includes('Backend error')) {
        toast.error('Backend configuration error. Please check the server logs.');
      } else if (error.message.includes('No public token')) {
        toast.error('Plaid connection failed: No token received. Please try again.');
      } else if (error.message.includes('Invalid response')) {
        toast.error('Plaid connection failed: Invalid server response. Please try again.');
      } else {
        toast.error(`Failed to connect bank account: ${error.message}`);
      }
      
      if (onExit) {
        onExit(error, metadata);
      }
    }
  };

  const onPlaidExit = (err, metadata) => {
    console.log("🚪 Plaid link exited");
    console.log("❌ Error:", err);
    console.log("📦 Metadata:", metadata);
    
    if (err) {
      toast.error(`Plaid connection failed: ${err.display_message || err.error_message || 'Unknown error'}`);
    }
    
    if (onExit) {
      onExit(err, metadata);
    }
  };

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = () => {
    if (!ready) {
      toast.warning('Plaid is not ready yet. Please wait a moment and try again.');
      return;
    }
    
    if (!linkToken) {
      toast.error('Link token not available. Please try refreshing the page.');
      return;
    }
    
    console.log("🚀 Opening Plaid link...");
    open();
  };

  if (loading) {
    return (
      <button 
        disabled 
        className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
      >
        Loading Plaid...
      </button>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <button 
          onClick={generateLinkToken}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Retry Plaid Connection
        </button>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!ready || !linkToken}
      className={`px-4 py-2 rounded-lg transition-colors ${
        ready && linkToken
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-400 text-white cursor-not-allowed'
      }`}
    >
      {children || 'Connect Bank Account'}
    </button>
  );
};

export default PlaidLink; 