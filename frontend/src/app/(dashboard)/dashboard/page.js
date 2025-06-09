// frontend/src/app/(dashboard)/dashboard/page.js
import Link from 'next/link';
import { fetchProtectedDataFromServer } from '@/lib/server-api';
import { 
  UserCircleIcon, 
  LinkIcon as LinkIconOutline, 
  Cog6ToothIcon, 
  CreditCardIcon 
} from '@heroicons/react/24/outline';

async function getAppUserProfileDataForOverview() {
  try {
    // Path is relative to NEXT_PUBLIC_API_BASE_URL (which is http://localhost:3001/api)
    // So, this will call http://localhost:3001/api/users/me
    const profileData = await fetchProtectedDataFromServer('/users/me'); 
    return { userProfile: profileData, error: null };
  } catch (error) {
    console.warn("DashboardOverviewPage: Error fetching app user profile:", error.message, "Status:", error.status);
    return { userProfile: null, error };
  }
}

export default async function DashboardOverviewPage() {
  const { userProfile, error } = await getAppUserProfileDataForOverview();

  // ... (rest of the component logic for rendering, error handling, links - no change from previous version)
  if (error && error.status !== 404 && error.status !== 401) { 
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
        <p className="text-gray-700 mb-4">
          Details: {error.bodyText || error.message || "Please try again later."}
        </p>
        <Link href="/dashboard/profile" className="text-blue-500 hover:underline">
          Try setting up your profile
        </Link>
      </div>
    );
  }
  
  const greetingName = userProfile?.displayName || userProfile?.username || 'User';

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-4xl font-bold mb-3 text-gray-800">Welcome, {greetingName}!</h1>
      <p className="text-lg text-gray-600 mb-10">Manage your public presence and payment settings.</p>
      {(!userProfile || error?.status === 404) && (
        <div className="p-5 mb-8 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-md shadow">
          <h2 className="font-bold text-lg mb-2">Complete Your Profile</h2>
          <p className="mb-3">Set up your username and other details to activate your public page.</p>
          <Link href="/dashboard/profile" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-yellow-800 font-semibold py-2 px-4 rounded-md transition-colors text-sm">
            Go to Profile Setup
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="group p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <UserCircleIcon className="h-10 w-10 text-blue-500 mb-3" />
          <h2 className="text-2xl font-semibold mb-2 text-gray-700 group-hover:text-blue-600">Your Public Page</h2>
          {userProfile?.username ? (
            <>
              <p className="text-gray-600 mb-4">View and share your page.</p>
              <Link href={`/${userProfile.username}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm">
                View Page (/{userProfile.username})
                <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
              </Link>
            </>
          ) : (<p className="text-gray-500">Set username in profile to activate.</p>)}
        </div>
        <div className="group p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <LinkIconOutline className="h-10 w-10 text-green-500 mb-3" />
          <h2 className="text-2xl font-semibold mb-2 text-gray-700 group-hover:text-green-600">Manage Links</h2>
          <p className="text-gray-600 mb-4">Add or edit your links.</p>
          <Link href="/dashboard/links" className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm">Go to Links</Link>
        </div>
        <div className="group p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <Cog6ToothIcon className="h-10 w-10 text-indigo-500 mb-3" />
          <h2 className="text-2xl font-semibold mb-2 text-gray-700 group-hover:text-indigo-600">Edit Profile</h2>
          <p className="text-gray-600 mb-4">Update your personal details.</p>
          <Link href="/dashboard/profile" className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm">Go to Profile</Link>
        </div>
        <div className="group p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <CreditCardIcon className="h-10 w-10 text-purple-500 mb-3" />
          <h2 className="text-2xl font-semibold mb-2 text-gray-700 group-hover:text-purple-600">Payment Settings</h2>
          <p className="text-gray-600 mb-4">Connect Stripe for payments.</p>
          <Link href="/connect-stripe" className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm">Setup Payments</Link>
        </div>
      </div>
    </div>
  );
}