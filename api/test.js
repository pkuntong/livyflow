module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    return res.status(200).json({
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (err) {
    console.error('test error', err.message);
    return res.status(500).json({
      error: 'Test endpoint failed',
      message: err.message,
    });
  }
}