import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const missingEnv = !url || !anon;

export const SUPABASE_CONFIGURED = !missingEnv;

export const supabase = missingEnv
  ? (null as unknown as ReturnType<typeof createClient>)
  : createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

export const SUPABASE_URL = url || '';
export const SUPABASE_ANON_KEY = anon || '';
