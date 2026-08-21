import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/react';
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
  const { isLoaded: isClerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const clerk = useClerk();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isClerkLoaded) {
      setLoading(true);
      return;
    }

    if (isSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const fullName =
        clerkUser.fullName ||
        clerkUser.firstName ||
        (email ? email.split('@')[0] : 'User');
      const avatar = clerkUser.imageUrl || '';
      const role = ((clerkUser.publicMetadata?.role as string) || 'admin') as 'admin' | 'member';
      const jobTitle = (clerkUser.publicMetadata?.jobTitle as string) || 'Workspace Admin';

      const mappedUser: User = {
        id: clerkUser.id,
        name: fullName,
        email,
        avatar,
        role,
        jobTitle,
      };

      setUser(mappedUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mappedUser));

      // Sync to Supabase profiles if Supabase is connected
      if (isSupabaseConfigured && supabase) {
        supabase
          .from('profiles')
          .upsert({
            id: clerkUser.id,
            full_name: fullName,
            email,
            avatar_url: avatar,
            role,
            job_title: jobTitle,
            updated_at: new Date().toISOString(),
          })
          .then();
      }
      setLoading(false);
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [isClerkLoaded, isSignedIn, clerkUser]);

  const signIn = async (email: string, password: string) => {
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    jobTitle: string = 'Team Member'
  ) => {
    return { error: null, needsEmailConfirmation: false };
  };

  const signOut = async () => {
    try {
      await clerk.signOut();
    } catch (e) {
      console.error('Clerk signOut error', e);
    }
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  const resetPassword = async (email: string) => {
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    return { error: null };
  };

  const inviteMember = async (
    email: string,
    fullName: string,
    role: 'admin' | 'member' = 'member',
    jobTitle: string = 'Team Member'
  ): Promise<{ error: any; emailSent: boolean }> => {
    if (isSupabaseConfigured && supabase) {
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
