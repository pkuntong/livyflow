import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PiggyBank } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password);
      navigate('/app/dashboard');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Failed to create an account.');
      }
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-3 mb-4">
            <PiggyBank className="w-10 h-10 text-emerald-500" aria-hidden="true" />
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">LivyFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-1">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-emerald-600 hover:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded"
            >
              Sign in
            </Link>
          </p>
        </div>
        
        {error && (
          <div 
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address *
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                placeholder="you@example.com"
                aria-describedby="email-requirements"
                aria-invalid={error && error.includes('email') ? 'true' : 'false'}
              />
              <div id="email-requirements" className="mt-1 text-sm text-gray-500">
                Enter a valid email address
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                placeholder="••••••••"
                aria-describedby="password-requirements"
                aria-invalid={error && error.includes('password') ? 'true' : 'false'}
              />
              <div id="password-requirements" className="mt-1 text-sm text-gray-500">
                Must be at least 6 characters long
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password *
            </label>
            <div className="mt-1">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                placeholder="••••••••"
                aria-describedby="confirm-password-requirements"
                aria-invalid={error && error.includes('match') ? 'true' : 'false'}
              />
              <div id="confirm-password-requirements" className="mt-1 text-sm text-gray-500">
                Must match the password above
              </div>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-describedby="signup-status"
            >
              <span id="signup-status">
                {loading ? 'Creating Account...' : 'Create Account'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 