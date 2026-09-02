// Vercel Serverless Function: Visitor Session Disconnect Endpoint
// Updates visitor session status immediately when page exit or disconnect is detected via sendBeacon or keepalive fetch.

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let sessionId = null;

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      sessionId = body?.sessionId || body?.session_id;
    } else if (req.method === 'GET') {
      sessionId = req.query?.sessionId || req.query?.session_id;
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ ok: false, error: 'sessionId is required' });
    }

    console.log('=== VISITOR EXIT DETECTED ===');
    console.log('Server disconnect API received sessionId:', sessionId);

    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.VITE_PUBLIC_SUPABASE_URL ||
      process.env.PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase env vars missing in serverless disconnect function');
      return res.status(200).json({ ok: true, notice: 'Received disconnect signal locally' });
    }

    const now = new Date().toISOString();
    const updateUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/visitor_sessions?id=eq.${encodeURIComponent(sessionId)}`;

    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status: 'stopped_by_visitor',
        stopped_at: now,
        last_seen: now,
        stop_reason: 'Browser tab/window closed by visitor',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Failed to update visitor session disconnect status in Supabase:', errText);
      return res.status(500).json({ ok: false, error: 'Database update failed' });
    }

    console.log('Successfully updated session status to stopped_by_visitor for session:', sessionId);
    return res.status(200).json({ ok: true, sessionId, status: 'stopped_by_visitor' });
  } catch (error) {
    console.error('Error in session-disconnect endpoint:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
