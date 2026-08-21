import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser, useClerk, useOrganization, useOrganizationList } from '@clerk/react';
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

  // Safety fallback so the app never gets permanently stuck on a loading screen
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (!isClerkLoaded) {
      return;
    }

    if (isSignedIn && clerkUser) {
      const email = (clerkUser.primaryEmailAddress?.emailAddress || '').toLowerCase().trim();
      const fullName =
        clerkUser.fullName ||
        clerkUser.firstName ||
        (email ? email.split('@')[0] : 'User');
      const avatar = clerkUser.imageUrl || '';

      // 1. Check if user already has an assigned role in local workspace users list
      let resolvedRole: 'admin' | 'member' = 'member';
      let resolvedJobTitle = 'Team Member';

      try {
        const storedUsersStr = localStorage.getItem('kf_users_v3');
        if (storedUsersStr) {
          const storedUsers: User[] = JSON.parse(storedUsersStr);
          const matchedUser = storedUsers.find((u) => u.email.toLowerCase() === email || u.id === clerkUser.id);
          if (matchedUser) {
            resolvedRole = matchedUser.role;
            resolvedJobTitle = matchedUser.jobTitle || 'Team Member';
          } else if (storedUsers.length === 0) {
            // First user to register in the workspace is the Admin
            resolvedRole = 'admin';
            resolvedJobTitle = 'Workspace Admin';
          }
        } else {
          // If no users exist yet, first creator is Admin
          resolvedRole = 'admin';
          resolvedJobTitle = 'Workspace Admin';
        }
      } catch (e) {
        console.error('Error checking local users', e);
      }

      // Check Clerk metadata override if present
      if (clerkUser.publicMetadata?.role) {
        resolvedRole = clerkUser.publicMetadata.role as 'admin' | 'member';
      }
      if (clerkUser.publicMetadata?.jobTitle) {
        resolvedJobTitle = clerkUser.publicMetadata.jobTitle as string;
      }

      const mappedUser: User = {
        id: clerkUser.id,
        name: fullName,
        email,
        avatar,
        role: resolvedRole,
        jobTitle: resolvedJobTitle,
      };

      setUser(mappedUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mappedUser));

      // 2. Sync to Supabase profiles if Supabase is connected
      if (isSupabaseConfigured && supabase) {
        supabase
          .from('profiles')
          .select('role, job_title')
          .eq('email', email)
          .maybeSingle()
          .then(({ data: existingProfile }) => {
            let finalRole = resolvedRole;
            let finalTitle = resolvedJobTitle;

            if (existingProfile) {
              finalRole = existingProfile.role;
              finalTitle = existingProfile.job_title || resolvedJobTitle;
              // If Supabase has a different role, update current state
              if (finalRole !== resolvedRole) {
                setUser((prev) => (prev ? { ...prev, role: finalRole, jobTitle: finalTitle } : null));
              }
            } else if (supabase) {
              // Insert into Supabase
              supabase
                .from('profiles')
                .upsert({
                  id: clerkUser.id,
                  full_name: fullName,
                  email,
                  avatar_url: avatar,
                  role: finalRole,
                  job_title: finalTitle,
                  updated_at: new Date().toISOString(),
                })
                .then();
            }
          });
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

  const { organization } = useOrganization();
  const { createOrganization, setActive } = useOrganizationList();

  const inviteMember = async (
    email: string,
    fullName: string,
    role: 'admin' | 'member' = 'member',
    jobTitle: string = 'Team Member'
  ): Promise<{ error: any; emailSent: boolean }> => {
    const cleanEmail = email.toLowerCase().trim();
    let emailSent = false;

    // 1. Send via Clerk Organization Invitations (native outbound email)
    if (organization) {
      try {
        const orgRole = role === 'admin' ? 'org:admin' : 'org:member';
        await organization.inviteMember({
          emailAddress: cleanEmail,
          role: orgRole,
        });
        emailSent = true;
      } catch (err: any) {
        console.log('Clerk organization invite info:', err?.errors?.[0]?.message || err);
      }
    }

    // 2. Supabase password reset / magic link fallback
    if (isSupabaseConfigured && supabase) {
      try {
        const redirectUrl = `${window.location.origin}/#type=recovery`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl,
        });
        if (!error) emailSent = true;
      } catch (e) {
        // ignore
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
