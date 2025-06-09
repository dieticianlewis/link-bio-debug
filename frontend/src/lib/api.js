// frontend/src/lib/api.js
import axios from 'axios';
import { supabase } from './supabaseClient';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL; // e.g., http://localhost:3001/api

if (!baseURL) {
  console.error("CRITICAL: NEXT_PUBLIC_API_BASE_URL is not set in .env.local for client-side API calls.");
  // Potentially throw an error or use a default to prevent app from breaking entirely
  // For now, Axios will try to use an undefined baseURL if not set, which will fail.
}

const apiClient = axios.create({
  baseURL: baseURL, // Uses the full base URL including /api
});

apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    // Ensure relative paths passed to apiClient calls don't start with /api
    // e.g., apiClient.get('/users/me') not apiClient.get('/api/users/me')
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;