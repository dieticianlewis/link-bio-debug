// frontend/src/app/(dashboard)/dashboard/page.js
import Link from 'next/link';
import { redirect } from 'next/navigation'; // Only needed if getAppUserProfile can signal a redirect
import { fetchFromServer } from '@/lib/server-api'; // Assuming server-api.js is in lib

// This function now uses fetchFromServer which handles Supabase client creation and auth
async function getAppUserProfile() {
  try {
    console.log("DashboardPage: Attempting to fetch app user profile via fetchFromServer...");
    const profileData = await fetchFromServer('/users/me'); // Your backend endpoint
    
    if (!profileData) { // fetchFromServer might return undefined or throw specific errors
        console.warn("DashboardPage: getAppUserProfile received no profileData from fetchFromServer.");
        // This could happen if /users/me returns 204 or non-JSON, or if fetchFromServer returns undefined
        // We should check for specific flags if profile setup is needed.
        // If it returned an error with status 404, fetchFromServer would throw.
        return { needsProfileSetupDueToEmptyResponse: true }; // Or some other indicator
    }
    console.log("DashboardPage: App user profile data:", profileData);
    return profileData; // This is your Prisma User object from the backend
  } catch (error) {
    console.error("DashboardPage: Error in getAppUserProfile:", error.message, "Status:", error.status);
    if (error.status === 404) {
      // This means your backend /api/users/me said "profile not found"
      console.log("DashboardPage: Backend indicated profile needs setup (404).");
      return { needsProfileSetup: true, email: error.body?.email }; // Pass email if backend provides it on 404
    }
    if (error.status === 401) {
      // This means the token was invalid or missing for the /api/users/me call
      console.log("DashboardPage: Backend indicated unauthorized (401). Needs login.");
      return { needsLogin: true };
    }
    // For other errors (e.g., 500 from backend, network error from fetchFromServer)
    return { error: true, message: error.message }; // Indicate a general error
  }
}

export default async function DashboardPage() {
  // The DashboardLayout already performs a session check.
  // Here, we fetch the application-specific user profile.
  const userProfile = await getAppUserProfile();

  if (userProfile?.needsLogin) {
    redirect('/login'); // Should be caught by layout, but as a safeguard
  }

  if (userProfile?.error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-red-500">
        <h1 className="text-2xl font-bold mb-4">Error Loading Dashboard</h1>
        <p>Could not load your profile data: {userProfile.message}</p>
        <p>Please try again later or contact support.</p>
        <Link href="/" className="text-blue-500 hover:underline mt-4 inline-block">Go to Homepage</Link>
      </div>
    );
  }

  // If userProfile is null but not needsLogin (e.g. unexpected null from getAppUserProfile)
  // or if needsProfileSetupDueToEmptyResponse is true
  if (!userProfile || userProfile.needsProfileSetupDueToEmptyResponse) {
     console.warn("DashboardPage: Rendering 'Profile Incomplete' due to missing profile or empty response from getAppUserProfile.");
     // This state indicates that even though the user is authenticated with Supabase,
     // their specific application profile (from your Prisma DB) is missing or couldn't be fetched.
     // The `needsProfileSetup` flag from a 404 is more explicit.
     return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">
                Welcome!
            </h1>
            <div className="p-4 mb-6 bg-yellow-100 dark:bg-yellow-700/30 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300">
                <p className="font-bold">Complete Your Profile</p>
                <p>It looks like your profile isn't fully set up yet. Please add your details to continue.</p>
                <Link href="/dashboard/profile" className="font-semibold hover:underline text-yellow-800 dark:text-yellow-200 mt-2 inline-block">
                    Go to Profile Setup
                </Link>
            </div>
        </div>
     );
  }


  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">
        Welcome, {userProfile.displayName || userProfile.username || userProfile.email || 'User'}!
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">This is your central hub. Manage your profile, links, and payment settings.</p>

      {userProfile.needsProfileSetup && ( // If backend /users/me explicitly returned 404
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