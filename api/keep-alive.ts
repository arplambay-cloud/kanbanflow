import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function to ping Supabase and keep free-tier database from pausing
export default async function handler(req: any, res: any) {
  // Optional security: verify CRON_SECRET if set in Vercel environment variables
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'Supabase credentials not configured in server environment variables.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Run a lightweight query against workspaces or profiles table
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name')
      .limit(1);

    if (error) {
      console.error('Supabase keep-alive ping error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase keep-alive ping successful. Project active.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Unexpected error during keep-alive ping:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    });
  }
}
