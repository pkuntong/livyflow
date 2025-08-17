import { verifyAuth } from '../../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyAuth(req);
    
    // Return mock monthly insights data
    const mockData = {
      totalSpent: 2500.00,
      avgDailySpending: 83.33,
      topCategory: 'Food & Dining',
      categoryBreakdown: {
        'Food & Dining': 800,
        'Transportation': 450,
        'Shopping': 600,
        'Bills & Utilities': 350,
        'Entertainment': 300
      },
      monthOverMonthChange: 15.5,
      insights: [
        'Your spending increased 15.5% from last month',
        'Food & Dining is your largest expense category',
        'You spent $83.33 on average per day this month'
      ]
    };

    return res.status(200).json(mockData);
  } catch (err) {
    console.error('monthly insights error', err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to fetch monthly insights',
      message: err.message,
    });
  }
}