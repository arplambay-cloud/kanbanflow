import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'Supabase credentials not configured in server environment.',
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Authenticate the caller's JWT token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authorization token required.' });
  }

  const {
    data: { user: caller },
    error: authErr,
  } = await supabaseAdmin.auth.getUser(token);

  if (authErr || !caller) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  // 2. Check if caller has 'admin' role in Supabase profiles
  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (profileErr || callerProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
  }

  // 3. Handle admin profile updates or deletions
  const { action, userId, updates } = req.body || {};

  if (action === 'update-profile' && userId) {
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        ...(updates?.role ? { role: updates.role } : {}),
        ...(updates?.name ? { full_name: updates.name } : {}),
        ...(updates?.jobTitle ? { job_title: updates.jobTitle } : {}),
        ...(updates?.avatar ? { avatar_url: updates.avatar } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateErr) {
      return res.status(400).json({ error: updateErr.message });
    }

    if (updates?.role || updates?.name || updates?.jobTitle) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...(updates?.name ? { display_name: updates.name, full_name: updates.name, name: updates.name } : {}),
          ...(updates?.role ? { role: updates.role } : {}),
          ...(updates?.jobTitle ? { job_title: updates.jobTitle } : {}),
        },
      });
    }

    return res.status(200).json({ success: true });
  }

  if (action === 'delete-user' && userId) {
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return res.status(200).json({ success: true });
  }

  // 4. Process the user creation / invitation request
  const { email, password, fullName, role, jobTitle } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPassword = password ? String(password).trim() : '';
  const cleanRole = role === 'admin' ? 'admin' : 'member';
  const cleanTitle = jobTitle ? String(jobTitle).trim() : (cleanRole === 'admin' ? 'Workspace Admin' : 'Team Member');
  const cleanName = fullName ? String(fullName).trim() : cleanEmail.split('@')[0];

  try {
    if (cleanPassword) {
      // Create user directly with confirmed email and password
      const { data: authData, error: createErr } =
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

      if (createErr) {
        return res.status(400).json({ error: createErr.message });
      }

      const createdUser = authData?.user;

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
        message: 'User successfully created in Supabase with password.',
        user: {
          id: createdUser?.id || `user-${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          role: cleanRole,
          jobTitle: cleanTitle,
        },
      });
    } else {
      // Send official Supabase invitation email
      const siteUrl = process.env.PUBLIC_SITE_URL || 'https://kanban.theumair07.com';
      const redirectUrl = `${siteUrl}/set-password`;

      const { data: inviteData, error: inviteErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          data: {
            display_name: cleanName,
            full_name: cleanName,
            name: cleanName,
            role: cleanRole,
            job_title: cleanTitle,
          },
          redirectTo: redirectUrl,
        });

      if (inviteErr) {
        return res.status(400).json({ error: inviteErr.message });
      }

      const invitedUser = inviteData?.user;

      if (invitedUser?.id) {
        await supabaseAdmin.from('profiles').upsert({
          id: invitedUser.id,
          full_name: cleanName,
          email: cleanEmail,
          role: cleanRole,
          job_title: cleanTitle,
          updated_at: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Official invitation email sent via Supabase.',
        user: {
          id: invitedUser?.id || `user-${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          role: cleanRole,
          jobTitle: cleanTitle,
        },
      });
    }
  } catch (err: any) {
    console.error('Admin API error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error while processing user request.',
    });
  }
}
