import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Set NODE_ENV to development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API handlers
import plaidLinkToken from './api/plaid/link-token.js';
import plaidAccounts from './api/plaid/accounts.js';
import plaidTransactions from './api/plaid/transactions.js';
import plaidExchangeToken from './api/plaid/exchange-token.js';
import monthlyInsights from './api/v1/insights/monthly.js';
import transactionsTrends from './api/v1/transactions/trends.js';
import notifications from './api/v1/notifications.js';
import alerts from './api/v1/alerts.js';
import insights from './api/v1/insights.js';
import recurringTransactions from './api/v1/transactions/recurring.js';

// Helper function to wrap API handlers for Express
const wrapHandler = (handler) => {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  };
};

// API Routes
app.get('/api/plaid/link-token', wrapHandler(plaidLinkToken));
app.get('/api/plaid/accounts', wrapHandler(plaidAccounts));
app.get('/api/plaid/transactions', wrapHandler(plaidTransactions));
app.post('/api/plaid/exchange-token', wrapHandler(plaidExchangeToken));

app.get('/api/v1/insights/monthly', wrapHandler(monthlyInsights));
app.get('/api/v1/transactions/trends', wrapHandler(transactionsTrends));
app.get('/api/v1/notifications', wrapHandler(notifications));
app.post('/api/v1/notifications', wrapHandler(notifications));
app.get('/api/v1/alerts', wrapHandler(alerts));
app.get('/api/v1/insights', wrapHandler(insights));
app.get('/api/v1/transactions/recurring', wrapHandler(recurringTransactions));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API development server is working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/plaid/link-token',
      '/api/plaid/accounts', 
      '/api/plaid/transactions',
      '/api/plaid/exchange-token',
      '/api/v1/insights/monthly',
      '/api/v1/transactions/trends',
      '/api/v1/notifications',
      '/api/v1/alerts',
      '/api/v1/insights',
      '/api/v1/transactions/recurring'
    ]
  });
});

app.listen(port, () => {
  console.log(`🚀 Development API server running at http://localhost:${port}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/test`);
  console.log(`   GET  /api/plaid/link-token`);
  console.log(`   GET  /api/plaid/accounts`);
  console.log(`   GET  /api/plaid/transactions`);
  console.log(`   POST /api/plaid/exchange-token`);
  console.log(`   GET  /api/v1/insights/monthly`);
  console.log(`   GET  /api/v1/transactions/trends`);
  console.log(`   GET  /api/v1/notifications`);
  console.log(`   POST /api/v1/notifications`);
  console.log(`   GET  /api/v1/alerts`);
  console.log(`   GET  /api/v1/insights`);
  console.log(`   GET  /api/v1/transactions/recurring`);
});