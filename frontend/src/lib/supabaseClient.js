// frontend/src/lib/supabaseClient.js
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL is missing from .env.local (NEXT_PUBLIC_SUPABASE_URL)");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key is missing from .env.local (NEXT_PUBLIC_SUPABASE_ANON_KEY)");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);