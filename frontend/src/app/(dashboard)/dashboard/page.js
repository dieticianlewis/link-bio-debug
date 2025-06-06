// frontend/src/app/(dashboard)/dashboard/page.js

import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

/**
 * Fetches the application user profile from your backend API.
 * This function is designed to run on the server.
 * @param {object} supabase - An initialized Supabase server client.
 * @returns {Promise<object|null>} The user profile object, an object with a needsProfileSetup flag, or null on a critical error.
 */
async function getAppUserProfile(supabase) {
  // This helper function's internal logic is already correct.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('getAppUserProfile: No Supabase session found.');
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
      console.error(`getAppUserProfile: Backend returned an error, status: ${response.status}`, errorText);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error('getAppUserProfile: A network error occurred.', error);
    return null;
  }
}

export default async function DashboardPage() {
  const cookieStore = cookies();

  // THIS IS THE CORRECTED PART
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        // These are required for the library to properly handle session
        // state across Server Components and Server Actions.
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This can happen in read-only environments, like when rendering statically.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // This can happen in read-only environments.
          }
        },
      },
    }
  );

  const userProfile = await getAppUserProfile(supabase);

  if (!userProfile || userProfile.needsProfileSetup) {
    redirect('/dashboard/profile');
  }

  // If the code reaches this point, we have a valid, existing user profile.
  // The rest of your component's JSX remains the same.
  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">
        Welcome, {userProfile?.displayName || userProfile?.username || 'User'}!
      </h1>
      <p className="text-gray-600 mb-8">This is your central hub. Manage your profile, links, and payment settings.</p>

      {!userProfile.username && (
        <div className="p-4 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
          <p className="font-bold">Profile Incomplete</p>
          <p>Please set up your username to make your page public.</p>
          <Link href="/dashboard/profile" className="font-semibold hover:underline">Go to Profile Setup</Link>
        </div>
      )}

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