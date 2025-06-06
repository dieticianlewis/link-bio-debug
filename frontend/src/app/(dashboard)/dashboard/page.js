// frontend/src/app/(dashboard)/dashboard/page.js

import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

// THIS FUNCTION WRAPS THE LOGIC, MAKING THE 'return' STATEMENTS VALID
async function getAppUserProfile(supabase) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.accessToken) {
    console.log('getAppUserProfile: No valid session or access token. Aborting.');
    return null;
  }

  const accessToken = session.accessToken;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        const errorData = await response.json();
        if (errorData.needsProfileSetup) {
          return errorData;
        }
      }
      const errorText = await response.text();
      console.error(`getAppUserProfile: Backend error, status: ${response.status}`, errorText);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('getAppUserProfile: Network error.', error);
    return null;
  }
}

export default async function DashboardPage() {
  const cookieStore = cookies();

  // THIS IS THE SECOND FIX: PROVIDE THE FULL COOKIE HANDLER
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { try { cookieStore.set({ name, value, ...options }); } catch (error) {} },
        remove(name, options) { try { cookieStore.set({ name, value: '', ...options }); } catch (error) {} },
      },
    }
  );

  const userProfile = await getAppUserProfile(supabase);

  if (!userProfile || userProfile.needsProfileSetup) {
    redirect('/dashboard/profile');
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">
        Welcome, {userProfile?.displayName || userProfile?.username || 'User'}!
      </h1>
      <p className="text-gray-600 mb-8">This is your central hub.</p>
      
      {/* ... The rest of your JSX remains the same ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-50 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-blue-600">Your Public Page</h2>
          {userProfile?.username ? (
            <Link
              href={`/${userProfile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              View Your Page: /{userProfile.username}
            </Link>
          ) : (
            <p className="text-gray-500">Set a username in your profile to activate your public page.</p>
          )}
        </div>
        {/* ... other divs ... */}
      </div>
    </div>
  );
}