import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Receipt, PiggyBank, CreditCard, LineChart } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-white safe-top safe-bottom">
      {/* Header */}
      <nav className="w-full px-4 sm:px-6 py-4 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          <PiggyBank className="w-8 h-8 text-emerald-500" />
          <span className="text-xl sm:text-2xl font-bold text-gray-800">LivyFlow</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/login" className="text-gray-600 hover:text-emerald-600 font-medium px-3 py-2 rounded-lg tap-highlight haptic-feedback text-sm sm:text-base">
            Login
          </Link>
          <Link
            to="/signup"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 sm:px-5 py-2 rounded-lg shadow-sm transition-colors touch-target tap-highlight haptic-feedback text-sm sm:text-base"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Take Control of Your <span className="text-emerald-500">Finances</span> with LivyFlow
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-2xl">
            The modern, privacy-first personal finance dashboard. Track spending, set budgets, and visualize your financial future—all in one beautiful app.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 sm:px-8 py-3 rounded-lg shadow-lg transition-colors text-base sm:text-lg touch-target tap-highlight haptic-feedback"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16" id="features">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-10">Why Choose LivyFlow?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center tap-highlight haptic-feedback transition-transform hover:scale-105">
            <LayoutGrid className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="font-semibold text-lg mb-3">Unified Dashboard</h3>
            <p className="text-gray-600 text-sm sm:text-base">See all your accounts, budgets, and transactions in one place for a complete financial overview.</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center tap-highlight haptic-feedback transition-transform hover:scale-105">
            <Receipt className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="font-semibold text-lg mb-3">Effortless Tracking</h3>
            <p className="text-gray-600 text-sm sm:text-base">Automatically track your income and expenses, categorize transactions, and never miss a beat.</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center tap-highlight haptic-feedback transition-transform hover:scale-105">
            <CreditCard className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="font-semibold text-lg mb-3">Smart Budgeting</h3>
            <p className="text-gray-600 text-sm sm:text-base">Set custom budgets, monitor progress, and get alerts to stay on top of your financial goals.</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center tap-highlight haptic-feedback transition-transform hover:scale-105">
            <LineChart className="w-12 h-12 text-pink-500 mb-4" />
            <h3 className="font-semibold text-lg mb-3">Powerful Analytics</h3>
            <p className="text-gray-600 text-sm sm:text-base">Visualize trends, analyze spending, and make smarter decisions with beautiful charts and insights.</p>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">Preview the LivyFlow Experience</h2>
        <div className="w-full flex justify-center">
          {/* Placeholder for dashboard preview */}
          <div
            className="rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"
            style={{ minHeight: 240, background: '#f3f4f6' }}
          >
            <div className="text-center p-8">
              <PiggyBank className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">Dashboard Preview Coming Soon</p>
            </div>
          </div>
        </div>
        <p className="text-gray-500 mt-4 text-center max-w-xl text-sm sm:text-base">
          Intuitive, responsive, and designed for clarity—LivyFlow makes managing your money a delight.
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full bg-white border-t border-gray-100 py-6 px-4 sm:px-6 safe-bottom">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm sm:text-base">
            <PiggyBank className="w-5 h-5 text-emerald-400" />
            <span>LivyFlow &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4 sm:gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-emerald-500 transition-colors tap-highlight haptic-feedback px-2 py-1">Features</a>
            <a href="#" className="hover:text-emerald-500 transition-colors tap-highlight haptic-feedback px-2 py-1">Privacy</a>
            <a href="#" className="hover:text-emerald-500 transition-colors tap-highlight haptic-feedback px-2 py-1">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
} 