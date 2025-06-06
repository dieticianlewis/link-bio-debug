// frontend/src/lib/supabaseClient.js
// This file mainly serves to export your Supabase URL and Anon Key for createBrowserClient.
// The actual client instance is often created within components using useState.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase URL or Anon Key is missing from .env.local. Frontend Supabase client might not initialize correctly."
  );
  // Consider throwing an error in development to catch this early
  // throw new Error("Supabase client critical environment variables are missing!");
}

// Note: With @supabase/ssr, you typically use createBrowserClient directly in your
// client components, like in the LoginPage example.
// So, this file might just export the URL and Key, or you could create a
// utility function here if needed, but direct use of createBrowserClient in components is common.