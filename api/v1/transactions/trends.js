import { verifyAuth } from '../../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyAuth(req);
    const { range = '6', category } = req.query;
    
    // Return mock trends data
    const mockData = {
      trends: [
        { date: '2025-02-01', amount: 650.00 },
        { date: '2025-03-01', amount: 720.50 },
        { date: '2025-04-01', amount: 580.25 },
        { date: '2025-05-01', amount: 890.75 },
        { date: '2025-06-01', amount: 760.00 },
        { date: '2025-07-01', amount: 820.30 }
      ],
      range: parseInt(range),
      category: category || 'All',
      totalSpending: 4423.80,
      avgMonthlySpending: 737.30
    };

    return res.status(200).json(mockData);
  } catch (err) {
    console.error('trends error', err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to fetch spending trends',
      message: err.message,
    });
  }
}