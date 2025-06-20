import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Receipt, PiggyBank, CreditCard, LineChart } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-white">
      {/* Header */}
      <nav className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PiggyBank className="w-8 h-8 text-emerald-500" />
          <span className="text-2xl font-bold text-gray-800">LivyFlow</span>
        </div>
        <div>
          <Link to="/login" className="text-gray-600 hover:text-emerald-600 font-medium mr-6">
            Login
          </Link>
          <Link
            to="/signup"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-lg shadow-sm transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="w-full px-6 py-8 flex flex-col items-center text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Take Control of Your <span className="text-emerald-500">Finances</span> with LivyFlow
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            The modern, privacy-first personal finance dashboard. Track spending, set budgets, and visualize your financial future—all in one beautiful app.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-colors text-lg"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-6 py-16" id="features">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">Why Choose LivyFlow?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <LayoutGrid className="w-10 h-10 text-emerald-500 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Unified Dashboard</h3>
            <p className="text-gray-600">See all your accounts, budgets, and transactions in one place for a complete financial overview.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <Receipt className="w-10 h-10 text-blue-500 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Effortless Tracking</h3>
            <p className="text-gray-600">Automatically track your income and expenses, categorize transactions, and never miss a beat.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <CreditCard className="w-10 h-10 text-purple-500 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Smart Budgeting</h3>
            <p className="text-gray-600">Set custom budgets, monitor progress, and get alerts to stay on top of your financial goals.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <LineChart className="w-10 h-10 text-pink-500 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Powerful Analytics</h3>
            <p className="text-gray-600">Visualize trends, analyze spending, and make smarter decisions with beautiful charts and insights.</p>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Preview the LivyFlow Experience</h2>
        <div className="w-full flex justify-center">
          {/* Replace the src below with a real screenshot or illustration if available */}
          <img
            src="/dashboard-preview.png"
            alt="LivyFlow Dashboard Preview"
            className="rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl object-cover"
            style={{ minHeight: 320, background: '#f3f4f6' }}
          />
        </div>
        <p className="text-gray-500 mt-4 text-center max-w-xl">
          Intuitive, responsive, and designed for clarity—LivyFlow makes managing your money a delight.
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full bg-white border-t border-gray-100 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <PiggyBank className="w-5 h-5 text-emerald-400" />
            <span>LivyFlow &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-emerald-500 transition-colors">Features</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
} 