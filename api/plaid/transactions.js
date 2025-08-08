import { getPlaidClient, tokenStore, getUserIdFromAuthHeader } from '../_plaidClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = getPlaidClient();
    const userId = getUserIdFromAuthHeader(req);
    const token = tokenStore.get(userId)?.accessToken;
    if (!token) return res.status(400).json({ error: 'No bank account connected' });

    const { start_date, end_date, count } = req.query;

    const options = {};
    if (count) options.count = Math.min(Math.max(parseInt(count, 10) || 100, 1), 100);

    const request = {
      access_token: token,
      start_date: start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      end_date: end_date || new Date().toISOString().slice(0, 10),
      options: { include_personal_finance_category: true, ...options },
    };

    const response = await client.transactionsGet(request);
    return res.status(200).json({
      transactions: response.data.transactions,
      total: response.data.total_transactions,
    });
  } catch (err) {
    console.error('transactions error', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}
