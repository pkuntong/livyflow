import { getPlaidClient } from '../_plaidClient.js';
import { verifyAuth } from '../_auth.js';
import { getToken } from '../_tokenStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = await verifyAuth(req);
    const tokenData = await getToken(userId);
    const accessToken = tokenData?.accessToken;
    if (!accessToken) {
      // Return mock data for development when no bank is connected
      const mockTransactions = {
        transactions: [
          {
            transaction_id: 'mock_1',
            account_id: 'mock_account_1',
            amount: -45.50,
            date: '2025-08-08',
            name: 'Starbucks',
            merchant_name: 'Starbucks',
            category: ['Food and Drink', 'Coffee Shop'],
            personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_COFFEE' }
          },
          {
            transaction_id: 'mock_2',
            account_id: 'mock_account_1',
            amount: -120.00,
            date: '2025-08-07',
            name: 'Whole Foods Market',
            merchant_name: 'Whole Foods',
            category: ['Shops', 'Food and Beverage Store'],
            personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_GROCERIES' }
          },
          {
            transaction_id: 'mock_3',
            account_id: 'mock_account_1',
            amount: -25.99,
            date: '2025-08-06',
            name: 'Netflix',
            merchant_name: 'Netflix',
            category: ['Service', 'Subscription'],
            personal_finance_category: { primary: 'ENTERTAINMENT', detailed: 'ENTERTAINMENT_TV_AND_MOVIES' }
          }
        ],
        total: 3
      };
      return res.status(200).json(mockTransactions);
    }

    const client = getPlaidClient();

    const { start_date, end_date, count } = req.query;
    let clampedCount = Number.isFinite(Number(count)) ? Math.max(1, Math.min(100, parseInt(count, 10))) : 100;

    const request = {
      access_token: accessToken,
      start_date: start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      end_date: end_date || new Date().toISOString().slice(0, 10),
      options: { include_personal_finance_category: true, count: clampedCount },
    };

    const response = await client.transactionsGet(request);
    return res.status(200).json({
      transactions: response.data.transactions,
      total: response.data.total_transactions,
    });
  } catch (err) {
    const data = err.response?.data;
    console.error('transactions error', data || err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to fetch transactions',
      code: data?.error_code,
      request_id: data?.request_id,
      message: data?.error_message || data?.display_message,
    });
  }
}
