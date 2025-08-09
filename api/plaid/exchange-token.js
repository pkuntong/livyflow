import { getPlaidClient } from '../_plaidClient';
import { verifyAuth } from '../_auth';
import { setToken } from '../_tokenStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = await verifyAuth(req);
    const { public_token } = req.body || {};
    if (!public_token) return res.status(400).json({ error: 'Missing public_token' });

    const client = getPlaidClient();
    const exchange = await client.itemPublicTokenExchange({ public_token });

    await setToken(userId, {
      accessToken: exchange.data.access_token,
      itemId: exchange.data.item_id,
    });

    return res.status(200).json({
      access_token: exchange.data.access_token,
      item_id: exchange.data.item_id,
      stored: true,
    });
  } catch (err) {
    const data = err.response?.data;
    console.error('exchange-token error', data || err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to exchange public token',
      code: data?.error_code,
      request_id: data?.request_id,
      message: data?.error_message || data?.display_message,
    });
  }
}
