import { verifyAuth } from '../../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyAuth(req);
    
    // Return mock recurring subscriptions data
    const mockData = {
      subscriptions: [
        {
          id: '1',
          merchant: 'Netflix',
          amount: 15.99,
          frequency: 'monthly',
          nextPayment: '2025-08-15',
          category: 'Entertainment',
          status: 'active'
        },
        {
          id: '2',
          merchant: 'Spotify',
          amount: 9.99,
          frequency: 'monthly', 
          nextPayment: '2025-08-20',
          category: 'Entertainment',
          status: 'active'
        },
        {
          id: '3',
          merchant: 'Adobe Creative Cloud',
          amount: 52.99,
          frequency: 'monthly',
          nextPayment: '2025-08-10',
          category: 'Professional Services',
          status: 'active'
        }
      ],
      totalMonthly: 78.97,
      totalAnnual: 947.64
    };

    return res.status(200).json(mockData);
  } catch (err) {
    console.error('recurring subscriptions error', err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to fetch recurring subscriptions',
      message: err.message,
    });
  }
}