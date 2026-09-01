import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { User } from '../types';
import { persistableAvatar } from '../utils/avatar';

interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    jobTitle?: string
  ) => Promise<{ error: any; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string, fullName?: string) => Promise<{ error: any }>;
  inviteMember: (
    email: string,
    fullName: string,
    role?: 'admin' | 'member',
    jobTitle?: string,
    avatar?: string
  ) => Promise<{ error: any; emailSent: boolean }>;
  createMemberWithPassword: (
    email: string,
    password: string,
    fullName: string,
    role?: 'admin' | 'member',
    jobTitle?: string,
    avatar?: string
  ) => Promise<{ error: any; user?: User }>;
  deleteMember: (userId: string) => Promise<{ error?: unknown }>;
  updateMemberProfile: (
    userId: string,
    updates: { role?: 'admin' | 'member'; full_name?: string; job_title?: string; avatar_url?: string }
  ) => Promise<{ error?: any }>;
}

const LOCAL_STORAGE_USER_KEY = 'kanbanflow_auth_user';

// Clean legacy Clerk keys from localStorage once on boot
try {
  const keysToRemove = Object.keys(localStorage).filter(
    (key) => key.startsWith('__clerk') || key.startsWith('clerk-')
  );
  keysToRemove.forEach((key) => localStorage.removeItem(key));
} catch {
  // ignore
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile details from Supabase
  const syncUserProfile = async (supabaseUser: any) => {
    if (!supabaseUser) {
      setUser(null);
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      return;
    }

    const email = (supabaseUser.email || '').toLowerCase().trim();
    const metaFullName =
      supabaseUser.user_metadata?.display_name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name;
    const fallbackName = metaFullName || (email ? email.split('@')[0] : 'User');
    const fallbackAvatar = supabaseUser.user_metadata?.avatar_url || '';
    let resolvedRole: 'admin' | 'member' = (supabaseUser.user_metadata?.role as any) || 'member';
    let resolvedJobTitle = supabaseUser.user_metadata?.job_title || 'Team Member';

    // 1. Fetch from Supabase profiles table if available
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url, role, job_title')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (profile) {
          const resolvedName = profile.full_name || fallbackName;
          const loadedUser: User = {
            id: supabaseUser.id,
            name: resolvedName,
            email: profile.email || email,
            avatar: profile.avatar_url || fallbackAvatar,
            role: (profile.role as 'admin' | 'member') || resolvedRole,
            jobTitle: profile.job_title || resolvedJobTitle,
          };
          setUser(loadedUser);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loadedUser));

          // Auto-sync display_name to Supabase Auth metadata if missing
          if (!supabaseUser.user_metadata?.display_name || !supabaseUser.user_metadata?.full_name) {
            try {
              await supabase.auth.updateUser({
                data: {
                  display_name: resolvedName,
                  full_name: resolvedName,
                  name: resolvedName,
                },
              });
            } catch (e) {
              // ignore
            }
          }
          return;
        } else {
          // If first user in system, automatically promote to Admin
          try {
            const { count } = await supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true });

            if (count === 0 || count === null) {
              resolvedRole = 'admin';
              resolvedJobTitle = 'Workspace Owner';
            }
          } catch {
            // ignore
          }

          // Create new profile in Supabase
          await supabase.from('profiles').upsert({
            id: supabaseUser.id,
            full_name: fallbackName,
            email,
            avatar_url: persistableAvatar(fallbackAvatar),
            role: resolvedRole,
            job_title: resolvedJobTitle,
            updated_at: new Date().toISOString(),
          });

          // Sync display_name to Auth metadata
          try {
            await supabase.auth.updateUser({
              data: {
                display_name: fallbackName,
                full_name: fallbackName,
                name: fallbackName,
                role: resolvedRole,
                job_title: resolvedJobTitle,
              },
            });
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Error fetching Supabase profile:', err);
      }
    }

    // 2. Fallback
    const loadedUser: User = {
      id: supabaseUser.id,
      name: fallbackName,
      email,
      avatar: fallbackAvatar,
      role: resolvedRole,
      jobTitle: resolvedJobTitle,
    };
    setUser(loadedUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loadedUser));
  };

  useEffect(() => {
    let mounted = true;

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        if (!mounted) return;
        setSession(currentSession);
        if (currentSession?.user) {
          syncUserProfile(currentSession.user).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setUser(null);
          localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
          setLoading(false);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          if (!mounted) return;
          setSession(newSession);
          if (newSession?.user) {
            await syncUserProfile(newSession.user);
          } else {
            setUser(null);
            localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
          }
          setLoading(false);
        }
      );

      return () => {
        mounted = false;
        authListener?.subscription.unsubscribe();
      };
    } else {
      setUser(null);
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      setLoading(false);
    }
  }, []);

  // Sign In via Supabase Auth
  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        await syncUserProfile(data.user);
      }

      return { error: null };
    }

    return { error: new Error('Authentication service is not configured.') };
  };

  // Sign Up
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    jobTitle: string = 'Team Member'
  ) => {
    const cleanEmail = email.toLowerCase().trim();
    const trimmedName = fullName.trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: trimmedName,
            full_name: trimmedName,
            name: trimmedName,
            job_title: jobTitle,
            role: 'member',
          },
        },
      });

      if (error) {
        return { error };
      }

      const needsEmailConfirmation = !data.session;

      if (data.user && data.session) {
        await syncUserProfile(data.user);
      }

      return { error: null, needsEmailConfirmation };
    }

    return { error: new Error('Authentication service is not configured.'), needsEmailConfirmation: false };
  };

  // Sign Out
  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem('kf_current_user_id_v3');
    localStorage.removeItem('kf_require_password_setup');
  };

  // Reset Password via Supabase
  const resetPassword = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (isSupabaseConfigured && supabase) {
      const redirectUrl = `${window.location.origin}/set-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });
      return { error };
    }
    return { error: new Error('Supabase not configured.') };
  };

  // Update Password and Name in Supabase
  const updatePassword = async (newPassword: string, fullName?: string) => {
    if (isSupabaseConfigured && supabase) {
      const cleanName = fullName?.trim();
      const metaUpdates: any = {
        has_set_password: true,
        password_updated_at: new Date().toISOString(),
      };
      if (cleanName) {
        metaUpdates.display_name = cleanName;
        metaUpdates.full_name = cleanName;
        metaUpdates.name = cleanName;
      }

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
        data: metaUpdates,
      });

      if (!error && data?.user) {
        localStorage.removeItem('kf_require_password_setup');

        // Sync to profiles table as well
        if (cleanName) {
          try {
            await supabase
              .from('profiles')
              .update({
                full_name: cleanName,
                updated_at: new Date().toISOString(),
              })
              .eq('id', data.user.id);
          } catch (e) {
            console.warn('Error updating profile full_name:', e);
          }
        }

        await syncUserProfile(data.user);
      }

      return { error };
    }

    localStorage.removeItem('kf_require_password_setup');
    return { error: null };
  };

  // Invite Team Member via Authenticated Admin API
  const inviteMember = async (
    email: string,
    fullName: string,
    role: 'admin' | 'member' = 'member',
    jobTitle: string = 'Team Member',
    avatar: string = ''
  ): Promise<{ error: any; emailSent: boolean }> => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];

    try {
      const { data: sessionData } = (isSupabaseConfigured && supabase)
        ? await supabase.auth.getSession()
        : { data: { session: null } };

      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData?.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: cleanName,
          role,
          jobTitle,
          avatar,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        return { error: new Error(result.error || 'Failed to send invite.'), emailSent: false };
      }

      return { error: null, emailSent: true };
    } catch (err: any) {
      return { error: err, emailSent: false };
    }
  };

  // Create Team Member directly with Pre-set Password in Supabase via Admin API
  const createMemberWithPassword = async (
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'member' = 'member',
    jobTitle: string = 'Team Member',
    avatar: string = ''
  ): Promise<{ error: any; user?: User }> => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];
    const cleanPassword = password.trim();

    try {
      const { data: sessionData } = (isSupabaseConfigured && supabase)
        ? await supabase.auth.getSession()
        : { data: { session: null } };

      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData?.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          fullName: cleanName,
          role,
          jobTitle,
          avatar,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        return { error: new Error(result.error || 'Failed to create user in Supabase.') };
      }

      const createdUser: User = {
        id: result.user?.id || `user-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        role,
        jobTitle,
        avatar: '',
      };

      return { error: null, user: createdUser };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Update Member profile in Supabase
  /**
   * Delete a member for real.
   *
   * This MUST go through the admin API. A client-side
   * `from('profiles').delete()` is blocked by RLS — there is deliberately no
   * DELETE policy on profiles — and Supabase reports a blocked delete as zero
   * rows with NO error, so it looked like it worked and the member reappeared
   * on the next refresh.
   *
   * The endpoint removes the profile row AND the auth.users record. Deleting
   * only the profile is not enough: the account could still sign in and the
   * handle_new_user trigger would recreate the row.
   */
  const deleteMember = async (userId: string): Promise<{ error?: unknown }> => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      return { error: new Error('Authentication service is not configured.') };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        return { error: new Error('Your session has expired. Please sign in again.') };
      }

      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'delete-user', userId }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error) {
        return { error: new Error(result.error || 'Failed to remove the member.') };
      }
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const updateMemberProfile = async (
    userId: string,
    updates: { role?: 'admin' | 'member'; full_name?: string; job_title?: string; avatar_url?: string }
  ): Promise<{ error?: any }> => {
    if (isSupabaseConfigured && supabase && userId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (token) {
          const response = await fetch('/api/create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'update-profile',
              userId,
              updates: {
                role: updates.role,
                name: updates.full_name,
                jobTitle: updates.job_title,
                avatar: updates.avatar_url,
              },
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return { error: new Error(errData.error || 'Failed to update member profile.') };
          }
          return { error: null };
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) return { error };
      } catch (err) {
        return { error: err };
      }
    }
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        inviteMember,
        createMemberWithPassword,
        deleteMember,
        updateMemberProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
