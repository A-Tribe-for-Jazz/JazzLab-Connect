import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'master_admin' | 'partner' | 'educator';

interface Profile {
  id: string;
  role: UserRole;
  organization_id: string | null;
  full_name: string;
  password_set: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  requiresPasswordSetup: boolean;
  signOut: () => Promise<void>;
  completePasswordSetup: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  requiresPasswordSetup: false,
  signOut: async () => {},
  completePasswordSetup: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(
    () => window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery')
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setRequiresPasswordSetup(false);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRequiresPasswordSetup(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      const userProfile = data as Profile;
      setProfile(userProfile);
      
      // If the profile says password_set is false, force password setup
      if (userProfile.password_set === false) {
        setRequiresPasswordSetup(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    sessionStorage.clear();
    setRequiresPasswordSetup(false);
    await supabase.auth.signOut();
  };

  const completePasswordSetup = () => {
    setRequiresPasswordSetup(false);
    setProfile(prev => prev ? { ...prev, password_set: true } : null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, requiresPasswordSetup, signOut, completePasswordSetup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
