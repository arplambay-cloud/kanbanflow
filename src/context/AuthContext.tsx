import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, jobTitle?: string) => Promise<{ error: any; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  inviteMember: (email: string, fullName: string, role?: 'admin' | 'member', jobTitle?: string) => Promise<{ error: any; emailSent: boolean }>;
}

const LOCAL_STORAGE_USER_KEY = 'kanbanflow_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // 1. Fetch initial session from Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          mapSupabaseUserToAppUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      // 2. Listen to Auth State Changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          mapSupabaseUserToAppUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Offline / Local storage fallback mode
      try {
        const savedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          // Default initial logged in user in local mode
          const defaultUser: User = {
            id: 'user-1',
            name: 'Emily Watson',
            email: 'emily@acme.inc',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            role: 'admin',
            jobTitle: 'QA & Operations',
          };
          setUser(defaultUser);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(defaultUser));
        }
      } catch (e) {
        console.error('Error loading local user', e);
      }
      setLoading(false);
    }
  }, []);

  const mapSupabaseUserToAppUser = async (authUser: any) => {
    try {
      if (!supabase) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser({
          id: profile.id,
          name: profile.full_name || authUser.email?.split('@')[0] || 'User',
          email: profile.email || authUser.email,
          avatar: profile.avatar_url || '',
          role: (profile.role as any) || 'member',
          jobTitle: profile.job_title || 'Team Member',
        });
      } else {
        setUser({
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          avatar: authUser.user_metadata?.avatar_url || '',
          role: 'member',
          jobTitle: authUser.user_metadata?.job_title || 'Team Member',
        });
      }
    } catch (e) {
      console.error('Error mapping Supabase user', e);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.user) {
        await mapSupabaseUserToAppUser(data.user);
      }
      return { error };
    } else {
      // Local fallback mode simulation
      const fallbackUser: User = {
        id: 'user-1',
        name: email.split('@')[0].replace('.', ' ').replace(/^./, (c) => c.toUpperCase()),
        email,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        role: 'admin',
        jobTitle: 'QA & Operations',
      };
      setUser(fallbackUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fallbackUser));
      return { error: null };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    jobTitle: string = 'Team Member'
  ) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            job_title: jobTitle,
          },
        },
      });
      const needsEmailConfirmation = !data.session && Boolean(data.user);
      return { error, needsEmailConfirmation };
    } else {
      // Local fallback mode
      const newUser: User = {
        id: 'user-' + Date.now(),
        name: fullName,
        email,
        avatar: '',
        role: 'member',
        jobTitle,
      };
      setUser(newUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
      return { error: null, needsEmailConfirmation: false };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return { error };
    }
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    }
    return { error: null };
  };

  const inviteMember = async (
    email: string,
    fullName: string,
    role: 'admin' | 'member' = 'member',
    jobTitle: string = 'Team Member'
  ): Promise<{ error: any; emailSent: boolean }> => {
    if (isSupabaseConfigured && supabase) {
      // Trigger a password reset / account setup email via Supabase Auth + configured SMTP
      const redirectUrl = `${window.location.origin}/#type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error, emailSent: !error };
    }
    return { error: null, emailSent: true };
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

