// frontend/src/app/(dashboard)/dashboard/page.js
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

async function getAppUserProfile(supabaseClientForAuth) {
    const { data: { session } } = await supabaseClientForAuth.auth.getSession();
    if (!session) {
        console.log("getAppUserProfile (dashboard page): No Supabase session found.");
        return null; // Or perhaps { needsLogin: true }
    }

    try {
        console.log("getAppUserProfile (dashboard page): Fetching from /api/users/me");
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error("getAppUserProfile (dashboard page): Unauthorized to fetch /api/users/me");
                return { needsLogin: true }; // Or similar to trigger redirect
            }
            if (response.status === 404) {
                console.log("getAppUserProfile (dashboard page): /api/users/me returned 404 (profile not created in DB yet)");
                return { needsProfileSetup: true, email: session.user.email };
            }
            console.error("getAppUserProfile (dashboard page): Failed to fetch app user profile, status:", response.status, await response.text());
            return null; // Or throw new Error(...)
        }
        const profileData = await response.json();
        console.log("getAppUserProfile (dashboard page): Profile data received:", profileData);
        return profileData;
    } catch (error) {
        console.error("getAppUserProfile (dashboard page): Error fetching app user profile:", error);
        return null; // Or throw error
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

  // The layout already protects this, but fetching profile here is for content
  const userProfile = await getAppUserProfile(supabase);

  // If getAppUserProfile returns null (error) or needsLogin, the layout should have caught it,
  // but if it can return null for other reasons and layout didn't catch, redirect.
  if (!userProfile || userProfile.needsLogin) {
    redirect('/login');
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">
        Welcome, {userProfile.displayName || userProfile.username || userProfile.email || 'User'}!
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">This is your central hub. Manage your profile, links, and payment settings.</p>

      {(userProfile.needsProfileSetup || (!userProfile.username && !userProfile.displayName)) && (
        <div className="p-4 mb-6 bg-yellow-100 dark:bg-yellow-700/30 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300">
          <p className="font-bold">Profile Incomplete</p>
          <p>Please set up your username and other profile details to make your page public.</p>
          <Link href="/dashboard/profile" className="font-semibold hover:underline text-yellow-800 dark:text-yellow-200">Go to Profile Setup</Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-blue-600 dark:text-blue-400">Your Public Page</h2>
          {userProfile.username ? (
            <Link
              href={`/${userProfile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              View Your Page: /{userProfile.username}
            </Link>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Set a username in your profile to activate your public page.</p>
          )}
        </div>
        
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-green-600 dark:text-green-400">Manage Links</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">Add, edit, or remove links that appear on your public page.</p>
          <Link href="/dashboard/links" className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors">Go to Links</Link>
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-purple-600 dark:text-purple-400">Payment Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">Connect with Stripe to start receiving payments from your supporters.</p>
          <Link href="/connect-stripe" className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md transition-colors">Setup Payments</Link>
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">Edit Profile</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">Update your display name, bio, and other personal details.</p>
          <Link href="/dashboard/profile" className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md transition-colors">Go to Profile</Link>
        </div>
      </div>
    </div>
  );
}