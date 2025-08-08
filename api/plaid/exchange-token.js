import { getPlaidClient, tokenStore, getUserIdFromAuthHeader } from '../_plaidClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { public_token } = req.body || {};
    if (!public_token) return res.status(400).json({ error: 'Missing public_token' });

    const client = getPlaidClient();
    const userId = getUserIdFromAuthHeader(req);

    const exchange = await client.itemPublicTokenExchange({ public_token });

    tokenStore.set(userId, {
      accessToken: exchange.data.access_token,
      itemId: exchange.data.item_id,
      storedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      access_token: exchange.data.access_token,
      item_id: exchange.data.item_id,
      stored: true,
    });
  } catch (err) {
    console.error('exchange-token error', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to exchange public token' });
  }
}
