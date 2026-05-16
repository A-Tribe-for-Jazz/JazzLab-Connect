import { createClient } from '@supabase/supabase-js';

// In a real application, these should be environment variables.
// Since we are mocking/testing, and standard Vercel deployments use these names:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
