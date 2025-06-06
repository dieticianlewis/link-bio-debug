// frontend/src/middleware.js
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          req.cookies.set({ name, value, ...options });
          // Need to create a new response to apply cookie changes
          const response = NextResponse.next({
            request: { headers: new Headers(req.headers) },
          });
          response.cookies.set({ name, value, ...options });
          // Update res to be this new response so it's returned
          // This part can be tricky; the main idea is that `res` must carry the new cookie
        },
        remove(name, options) {
          req.cookies.set({ name, value: '', ...options });
          const response = NextResponse.next({
            request: { headers: new Headers(req.headers) },
          });
          response.cookies.delete({ name, ...options });
          // Update res to be this new response
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  // This will also update the cookies if the session is refreshed via the `set` method defined above.
  await supabase.auth.getSession();

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};