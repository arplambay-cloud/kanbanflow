import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid CRON secret.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'Supabase credentials not configured in server environment.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase ping successful.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
