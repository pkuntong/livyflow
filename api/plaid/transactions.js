import { getPlaidClient } from '../_plaidClient';
import { verifyAuth } from '../_auth';
import { getToken } from '../_tokenStore';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = await verifyAuth(req);
    const tokenData = await getToken(userId);
    const accessToken = tokenData?.accessToken;
    if (!accessToken) return res.status(400).json({ error: 'No bank account connected' });

    const client = getPlaidClient();

    const { start_date, end_date, count } = req.query;
    let clampedCount = Number.isFinite(Number(count)) ? Math.max(1, Math.min(100, parseInt(count, 10))) : 100;

    const request = {
      access_token: accessToken,
      start_date: start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      end_date: end_date || new Date().toISOString().slice(0, 10),
      options: { include_personal_finance_category: true, count: clampedCount },
    };

    const response = await client.transactionsGet(request);
    return res.status(200).json({
      transactions: response.data.transactions,
      total: response.data.total_transactions,
    });
  } catch (err) {
    const data = err.response?.data;
    console.error('transactions error', data || err.message);
    return res.status((err.statusCode || 500)).json({
      error: 'Failed to fetch transactions',
      code: data?.error_code,
      request_id: data?.request_id,
      message: data?.error_message || data?.display_message,
    });
  }
}
