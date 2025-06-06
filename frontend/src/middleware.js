import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next(); // Initialize res once

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          req.cookies.set({ name, value, ...options }); // Set on request for current lifecycle
          res.cookies.set({ name, value, ...options }); // Set on response for browser
        },
        remove(name, options) {
          req.cookies.set({ name, value: '', ...options }); // Clear from request
          res.cookies.delete({ name, ...options });      // Delete from response
        },
      },
    }
  );

  // This will refresh the session if needed and update cookies via `set`
  const { data: { user } } = await supabase.auth.getUser(); // Use getUser

  // Example: Route protection (optional, can also be done in layouts)
  // const { pathname } = req.nextUrl;
  // if (!user && pathname.startsWith('/dashboard')) {
  //   return NextResponse.redirect(new URL('/login', req.url));
  // }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};