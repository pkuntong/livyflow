import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PiggyBank } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/app/dashboard');
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
      console.error('Login error:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Sign in to your account</h1>
          <p className="text-gray-600 mt-1">
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="font-medium text-emerald-600 hover:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded"
            >
              Sign up
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
                aria-describedby={error && error.includes('email') ? 'email-error' : undefined}
                aria-invalid={error && error.includes('email') ? 'true' : 'false'}
              />
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                placeholder="••••••••"
                aria-describedby={error && error.includes('password') ? 'password-error' : undefined}
                aria-invalid={error && error.includes('password') ? 'true' : 'false'}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a 
                href="#" 
                className="font-medium text-emerald-600 hover:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded"
                aria-label="Reset your password (functionality not yet implemented)"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-describedby="signin-status"
            >
              <span id="signin-status">
                {loading ? 'Signing In...' : 'Sign In'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 