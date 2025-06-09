// frontend/src/lib/server-api.js
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function fetchProtectedDataFromServer(relativePath, options = {}) {
  const cookieStore = cookies(); 
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, opts) { try { cookieStore.set({ name, value, ...opts }); } catch (error) {} },
        remove(name, opts) { try { cookieStore.set({ name, value: '', ...opts }); } catch (error) {} },
      },
    }
  );

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.warn("[fetchProtectedDataFromServer] Supabase session error or no session:", sessionError?.message || "No session");
    const error = new Error('User not authenticated for server API call.');
    error.status = 401;
    throw error;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // e.g., http://localhost:3001/api
  if (!apiBaseUrl) {
    console.error("[fetchProtectedDataFromServer] CRITICAL: NEXT_PUBLIC_API_BASE_URL is not defined.");
    const error = new Error('API base URL not configured.');
    error.status = 500;
    throw error;
  }

  // Construct the full URL: http://localhost:3001/api + /users/me (if relativePath is /users/me)
  const url = `${apiBaseUrl}${relativePath}`; 
  // console.log(`[fetchProtectedDataFromServer] Calling: ${options.method || 'GET'} ${url}`);

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': options.headers?.['Content-Type'] || 'application/json',
      },
      cache: 'no-store',
    });
  } catch (networkError) {
      console.error(`[fetchProtectedDataFromServer] Network error calling ${url}:`, networkError);
      const error = new Error(`Network error calling API: ${networkError.message}`);
      error.status = 503; 
      throw error;
  }

  if (!response) {
    console.error(`[fetchProtectedDataFromServer] Fetch returned undefined response for ${url}`);
    const error = new Error(`No response from API for ${url}`);
    error.status = 500;
    throw error;
  }
  
  // console.log(`[fetchProtectedDataFromServer] Response status for ${relativePath}: ${response.status}`);

  if (!response.ok) {
    let errorBodyText = `API Error (${response.status}) for ${url}. Response not OK.`;
    let errorJson = null;
    try { 
      const tempBody = await response.text();
      try {
        errorJson = JSON.parse(tempBody);
        errorBodyText = errorJson.message || tempBody.substring(0, 200);
      } catch (parseError) {
        errorBodyText = tempBody.substring(0, 200) || `Status ${response.status}`;
      }
    } catch (e) { /* ignore if can't get body */ }
    
    console.error(`[fetchProtectedDataFromServer] API Error (${response.status}) for ${url}: ${errorBodyText}`);
    const error = new Error(`API call to ${relativePath} failed: ${errorBodyText}`);
    error.status = response.status;
    error.body = errorJson; 
    error.bodyText = errorBodyText; 
    throw error;
  }

  if (response.status === 204) return null;
  
  try {
    const jsonData = await response.json();
    return jsonData;
  } catch (jsonError) {
    console.error(`[fetchProtectedDataFromServer] Error parsing JSON response for ${url}:`, jsonError);
    const error = new Error(`Invalid JSON response from API for ${url}`);
    error.status = 502;
    throw error;
  }
}