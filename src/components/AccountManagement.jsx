import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { toast } from 'react-toastify';

const AccountManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Account Information Form
  const [accountForm, setAccountForm] = useState({
    fullName: '',
    email: '',
    currentPassword: ''
  });

  // Password Change Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (currentUser) {
      setAccountForm({
        fullName: currentUser.displayName || '',
        email: currentUser.email || '',
        currentPassword: ''
      });
    }
  }, [currentUser]);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Password validation
  const validatePassword = (password) => {
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleAccountFormChange = (e) => {
    const { name, value } = e.target;
    setAccountForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear email error when user starts typing
    if (name === 'email') {
      setEmailError('');
    }
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear password error when user starts typing
    if (name === 'newPassword') {
      setPasswordError('');
    }
  };

  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email if it changed
      if (accountForm.email !== currentUser.email && !validateEmail(accountForm.email)) {
        setLoading(false);
        return;
      }

      // Re-authenticate user before making changes
      if (accountForm.currentPassword) {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          accountForm.currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
      }

      // Update profile
      const updates = {};
      if (accountForm.fullName !== currentUser.displayName) {
        updates.displayName = accountForm.fullName;
      }
      if (accountForm.email !== currentUser.email) {
        updates.email = accountForm.email;
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(currentUser, updates);
        if (updates.email) {
          await updateEmail(currentUser, updates.email);
        }
      }

      // Clear current password field
      setAccountForm(prev => ({ ...prev, currentPassword: '' }));

      toast.success('Account information updated successfully!');
    } catch (error) {
      console.error('Error updating account:', error);
      
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Email is already in use by another account');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Please re-authenticate to make these changes');
      } else {
        toast.error('Failed to update account information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      // Validate new password
      if (!validatePassword(passwordForm.newPassword)) {
        setPasswordLoading(false);
        return;
      }

      // Check if passwords match
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setPasswordError('New passwords do not match');
        setPasswordLoading(false);
        return;
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordForm.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, passwordForm.newPassword);

      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Error updating password:', error);
      
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please choose a stronger password');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          Please log in to manage your account settings.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Information Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 text-lg">👤</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            <p className="text-sm text-gray-600">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleAccountUpdate} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={accountForm.fullName}
              onChange={handleAccountFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={accountForm.email}
              onChange={handleAccountFormChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                emailError ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your email address"
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600">{emailError}</p>
            )}
          </div>

          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={accountForm.currentPassword}
              onChange={handleAccountFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your current password"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Required to confirm any changes to your account
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !accountForm.currentPassword}
              className={`w-full px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                loading || !accountForm.currentPassword
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-green-600 text-lg">🔐</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
            <p className="text-sm text-gray-600">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label htmlFor="passwordCurrent" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              id="passwordCurrent"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your current password"
              required
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordFormChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                passwordError ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your new password"
              required
            />
            {passwordError && (
              <p className="mt-1 text-sm text-red-600">{passwordError}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your new password"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className={`w-full px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountManagement; 