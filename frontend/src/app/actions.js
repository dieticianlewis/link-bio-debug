// frontend/src/app/actions.js
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

export async function handleLogout() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.delete({ name, ...options }); }, // or cookieStore.set({ name, value: '', ...options})
      },
    }
  );
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    // Optionally, handle error (e.g., redirect to an error page or return an error object)
    // For now, we still redirect to login.
  }
  return redirect('/login'); // Use return for redirect in Server Actions
}