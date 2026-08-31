import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, fullName, role, jobTitle } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPassword = String(password).trim();
  const cleanRole = role === 'admin' ? 'admin' : 'member';
  const cleanTitle = jobTitle || (cleanRole === 'admin' ? 'Workspace Admin' : 'Team Member');
  const cleanName = fullName || cleanEmail.split('@')[0];

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'Supabase credentials not configured in environment variables.',
    });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create user in Supabase Auth directly with password and metadata
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          display_name: cleanName,
          full_name: cleanName,
          name: cleanName,
          role: cleanRole,
          job_title: cleanTitle,
          has_set_password: true,
        },
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const createdUser = authData?.user;

    // 2. Upsert into public profiles table
    if (createdUser?.id) {
      await supabaseAdmin.from('profiles').upsert({
        id: createdUser.id,
        full_name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        job_title: cleanTitle,
        updated_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User successfully created in Supabase.',
      user: {
        id: createdUser?.id || `user-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        jobTitle: cleanTitle,
      },
    });
  } catch (err: any) {
    console.error('Error creating user via admin API:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error while creating user in Supabase.',
    });
  }
}
