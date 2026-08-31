import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { User } from '../types';

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
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  inviteMember: (
    email: string,
    fullName: string,
    role?: 'admin' | 'member',
    jobTitle?: string
  ) => Promise<{ error: any; emailSent: boolean }>;
}

const LOCAL_STORAGE_USER_KEY = 'kanbanflow_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile details from Supabase or localStorage
  const syncUserProfile = async (supabaseUser: any) => {
    if (!supabaseUser) {
      setUser(null);
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      return;
    }

    const email = (supabaseUser.email || '').toLowerCase().trim();
    const metaFullName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name;
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
          const loadedUser: User = {
            id: supabaseUser.id,
            name: profile.full_name || fallbackName,
            email: profile.email || email,
            avatar: profile.avatar_url || fallbackAvatar,
            role: (profile.role as 'admin' | 'member') || resolvedRole,
            jobTitle: profile.job_title || resolvedJobTitle,
          };
          setUser(loadedUser);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loadedUser));
          return;
        } else {
          // If profile does not exist yet, create one
          await supabase.from('profiles').upsert({
            id: supabaseUser.id,
            full_name: fallbackName,
            email,
            avatar_url: fallbackAvatar,
            role: resolvedRole,
            job_title: resolvedJobTitle,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Error fetching Supabase profile:', err);
      }
    }

    // 2. Local fallback if Supabase table is unreachable or local mode
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
          const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
          if (stored) {
            try {
              setUser(JSON.parse(stored));
            } catch {
              setUser(null);
            }
          }
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
      const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    }
  }, []);

  // Sign In with Supabase (or local fallback)
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

      if (data?.user) {
        await syncUserProfile(data.user);
      }
      return { error: null };
    }

    // Local fallback authentication
    try {
      const storedUsersStr = localStorage.getItem('kf_users_v3');
      const users: User[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];
      const matched = users.find((u) => u.email.toLowerCase() === cleanEmail);

      const authedUser: User = matched || {
        id: `user-${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: '',
        role: users.length === 0 ? 'admin' : 'member',
        jobTitle: 'Team Member',
      };

      setUser(authedUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(authedUser));
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  };

  // Sign Up with Supabase (or local fallback)
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    jobTitle: string = 'Team Member'
  ) => {
    const cleanEmail = email.toLowerCase().trim();
    const trimmedName = fullName.trim() || cleanEmail.split('@')[0];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            job_title: jobTitle,
          },
        },
      });

      if (error) {
        return { error, needsEmailConfirmation: false };
      }

      const needsEmailConfirmation = Boolean(data.user && !data.session);

      if (data.user && data.session) {
        await syncUserProfile(data.user);
      }

      return { error: null, needsEmailConfirmation };
    }

    // Local fallback sign up
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: trimmedName,
      email: cleanEmail,
      avatar: '',
      role: 'member',
      jobTitle,
    };

    setUser(newUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
    return { error: null, needsEmailConfirmation: false };
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
  };

  // Reset Password via Supabase
  const resetPassword = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (isSupabaseConfigured && supabase) {
      const redirectUrl = `${window.location.origin}/#type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });
      return { error };
    }
    return { error: null };
  };

  // Update Password
  const updatePassword = async (newPassword: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    }
    return { error: null };
  };

  // Invite Team Member
  const inviteMember = async (
    email: string,
    fullName: string,
    role: 'admin' | 'member' = 'member',
    jobTitle: string = 'Team Member'
  ): Promise<{ error: any; emailSent: boolean }> => {
    const cleanEmail = email.toLowerCase().trim();
    let emailSent = false;

    if (isSupabaseConfigured && supabase) {
      try {
        const redirectUrl = `${window.location.origin}/#type=recovery`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl,
        });
        if (!error) emailSent = true;
      } catch (e) {
        console.warn('Supabase invite notice:', e);
      }
    }

    return { error: null, emailSent };
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
