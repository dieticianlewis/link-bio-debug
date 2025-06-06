// frontend/src/lib/api.js
import axios from 'axios';
// For client-side requests, we need a way to get the current session token.
// We can't use createBrowserClient here directly in a way that auto-updates
// because this module is imported globally. Instead, we get the token when needed.
// A better pattern might be to create an instance of Supabase client in a React context
// or pass the token explicitly to API functions.

// For simplicity, this interceptor will try to get the token on each request.
// In a larger app, manage the Supabase client instance more globally (e.g., React Context)
// or have API functions accept the token.
import { createBrowserClient } from '@supabase/ssr'; // For getting session on client-side

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

apiClient.interceptors.request.use(
  async (config) => {
    // This check ensures it only runs in the browser environment
    if (typeof window !== 'undefined') {
      // Create a temporary browser client instance just to get the session for this request
      // This is okay because createBrowserClient is lightweight.
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;