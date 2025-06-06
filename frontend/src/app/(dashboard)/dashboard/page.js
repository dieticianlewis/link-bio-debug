// frontend/src/app/(dashboard)/dashboard/page.js (CORRECTED)

import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

// This helper function now correctly handles authentication for the backend API call
async function getAppUserProfile(supabase) {
  console.log('getAppUserProfile: Attempting to get session to fetch from backend...');
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.log('getAppUserProfile: No Supabase session found. Cannot fetch profile.');
    return null;
  }
  
  // This is the user's JWT, which your backend API needs
  const accessToken = session.accessToken;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`, {
      headers: {
        // Send the token to the backend
        'Authorization': `Bearer ${accessToken}`,
      },
      // Important for server-to-server fetches to avoid caching issues
      cache: 'no-store', 
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`getAppUserProfile: Failed to fetch app user profile, status: ${response.status}`, errorData);
      return null;
    }

    const userProfile = await response.json();
    console.log('getAppUserProfile: Successfully fetched profile from backend.');
    return userProfile;

  } catch (error) {
    console.error('getAppUserProfile: A network or fetch error occurred.', error);
    return null;
  }
}

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: { get: (name) => cookieStore.get(name)?.value },
    }
  );

  const userProfile = await getAppUserProfile(supabase);

  // If the profile couldn't be fetched (e.g., it doesn't exist yet for a new user),
  // we redirect them to the profile creation page.
  if (!userProfile) {
    console.log('DashboardPage: No user profile returned, redirecting to profile setup.');
    return redirect('/dashboard/profile');
  }

  // --- The rest of your component's JSX remains the same ---
  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">
        Welcome, {userProfile?.displayName || userProfile?.username || 'User'}!
      </h1>
      <p className="text-gray-600 mb-8">This is your central hub. Manage your profile, links, and payment settings.</p>

      {!userProfile.username && (
        <div className="p-4 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
          <p className="font-bold">Profile Incomplete</p>
          <p>Please set up your username and other profile details to make your page public.</p>
          <Link href="/dashboard/profile" className="font-semibold hover:underline">Go to Profile Setup</Link>
        </div>
      )}

      {/* ... Rest of your JSX is fine ... */}
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
        <div className="p-6 bg-gray-50 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-green-600">Manage Links</h2>
          <p className="text-gray-600 mb-3">Add, edit, or remove links that appear on your public page.</p>
          <Link href="/dashboard/links" className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors">Go to Links</Link>
        </div>
        <div className="p-6 bg-gray-50 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-purple-600">Payment Settings</h2>
          <p className="text-gray-600 mb-3">Connect with Stripe to start receiving payments from your supporters.</p>
          <Link href="/connect-stripe" className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md transition-colors">Setup Payments</Link>
        </div>
        <div className="p-6 bg-gray-50 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-indigo-600">Edit Profile</h2>
          <p className="text-gray-600 mb-3">Update your display name, bio, and other personal details.</p>
          <Link href="/dashboard/profile" className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md transition-colors">Go to Profile</Link>
        </div>
      </div>
    </div>
  );
}