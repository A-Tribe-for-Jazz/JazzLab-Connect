import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

  const profileRef = useRef<Profile | null>(null);

  useEffect(() => {
    let active = true;

    const handleAuthChange = async (session: Session | null) => {
      if (!active) return;
      console.log('AuthContext handleAuthChange session:', session?.user?.email, 'session ID:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Only trigger global loading UI if we don't have a profile yet (prevents unmounting of setup/recovery screens)
        if (!profileRef.current) {
          setLoading(true);
        }
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!active) return;
          if (error) throw error;
          const userProfile = data as Profile;
          console.log('AuthContext fetched profile:', userProfile);
          setProfile(userProfile);
          profileRef.current = userProfile;
          if (userProfile.password_set === false) {
            console.log('AuthContext: password_set is false, setting requiresPasswordSetup to true');
            setRequiresPasswordSetup(true);
          } else {
            console.log('AuthContext: password_set is true, setting requiresPasswordSetup to false');
            setRequiresPasswordSetup(false);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          if (active) {
            setProfile(null);
            profileRef.current = null;
            setRequiresPasswordSetup(false);
          }
        } finally {
          if (active) setLoading(false);
        }
      } else {
        console.log('AuthContext: no session user, clearing profile');
        setProfile(null);
        profileRef.current = null;
        setRequiresPasswordSetup(false);
        setLoading(false);
      }
    };

    // Listen for auth changes (handles both initial session and events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    sessionStorage.clear();
    setRequiresPasswordSetup(false);
    setProfile(null);
    profileRef.current = null;
    await supabase.auth.signOut();
  };

  const completePasswordSetup = () => {
    setRequiresPasswordSetup(false);
    setProfile(prev => {
      const val = prev ? { ...prev, password_set: true } : null;
      profileRef.current = val;
      return val;
    });
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, requiresPasswordSetup, signOut, completePasswordSetup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
