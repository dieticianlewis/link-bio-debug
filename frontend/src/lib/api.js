// frontend/src/lib/api.js

import axios from 'axios';
import { createBrowserClient } from '@supabase/ssr';

// THIS IS THE FIX: We add the '/api' prefix to the baseURL so all
// requests from this client will go to the correct path.
const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api`,
});

// The rest of this file is already correct.
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
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