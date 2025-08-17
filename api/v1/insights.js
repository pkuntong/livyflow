import { verifyAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyAuth(req);
    
    // Return mock insights data
    const mockInsights = {
      totalAccounts: 3,
      totalBalance: 15420.50,
      monthlyIncome: 5200.00,
      monthlyExpenses: 2800.75,
      savingsRate: 46.15,
      insights: [
        'Your savings rate is excellent at 46.15%',
        'You have consistent income patterns',
        'Consider reviewing your dining expenses which increased 20% this month'
      ],
      categoryInsights: {
        topSpendingCategory: 'Food & Dining',
        unusualSpending: [],
        recommendations: [
          'Set up automatic transfers to savings',
          'Review subscription services for potential savings'
        ]
      }
    };

    return res.status(200).json(mockInsights);
  } catch (err) {
    console.error('insights error', err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to fetch insights',
      message: err.message,
    });
  }
}