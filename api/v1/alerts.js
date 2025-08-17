import { verifyAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyAuth(req);
    
    // Return mock alerts data
    const mockAlerts = [
      {
        id: '1',
        type: 'budget',
        severity: 'warning',
        title: 'Budget Alert',
        message: 'You have spent 80% of your monthly dining budget',
        timestamp: new Date().toISOString(),
        acknowledged: false
      },
      {
        id: '2', 
        type: 'transaction',
        severity: 'info',
        title: 'Large Transaction',
        message: 'A transaction of $250 was detected',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        acknowledged: true
      }
    ];

    return res.status(200).json(mockAlerts);
  } catch (err) {
    console.error('alerts error', err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to fetch alerts',
      message: err.message,
    });
  }
}