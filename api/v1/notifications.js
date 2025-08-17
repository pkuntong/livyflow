import { verifyAuth } from '../_auth.js';

export default async function handler(req, res) {
  try {
    await verifyAuth(req);
    
    if (req.method === 'GET') {
      // Return mock notifications
      const mockNotifications = [
        {
          id: '1',
          type: 'welcome',
          title: 'Welcome to LivyFlow!',
          message: 'Your financial dashboard is ready.',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
      return res.status(200).json(mockNotifications);
      
    } else if (req.method === 'POST') {
      // Create notification - just return success
      const { type, title, message } = req.body || {};
      return res.status(201).json({
        id: Date.now().toString(),
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('notifications error', err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to process notification request',
      message: err.message,
    });
  }
}