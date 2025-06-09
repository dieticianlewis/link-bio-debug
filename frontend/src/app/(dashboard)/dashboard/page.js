// frontend/src/app/(dashboard)/dashboard/page.js
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api'; // Your client-side Axios instance
import { 
  UserCircleIcon, 
  LinkIcon as LinkIconOutline, 
  Cog6ToothIcon, 
  CreditCardIcon,
  ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation'; // For potential redirects

export default function DashboardOverviewPage() {
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null); // Stores error object or message
  const [stripeLinkLoading, setStripeLinkLoading] = useState(false);
  const [stripeLinkError, setStripeLinkError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchInitialData() {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await apiClient.get('/users/me'); // Fetches from http://localhost:3001/api/users/me
        setUserProfile(response.data);
      } catch (error) {
        console.warn("DashboardOverviewPage Client: Error fetching app user profile:", error.response?.data?.message || error.message);
        // Store the actual error object or a simplified message
        setProfileError({ 
            message: error.response?.data?.message || error.message, 
            status: error.response?.status,
            code: error.response?.data?.code
        }); 
        if (error.response?.status === 401) { // Unauthorized, session might be bad
            router.push('/login'); // Force re-login
        }
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchInitialData();
  }, [router]); // Add router to dependency array if used inside useEffect

  const handleViewStripeDashboard = async () => {
    setStripeLinkLoading(true);
    setStripeLinkError(null);
    try {
      // Path is relative to apiClient's baseURL (http://localhost:3001/api)
      const response = await apiClient.post('/stripe/create-express-dashboard-link');
      if (response.data.url) {
        window.location.href = response.data.url; // Redirect to Stripe
      } else {
        throw new Error('Failed to get Stripe dashboard URL from backend.');
      }
    } catch (err) {
      console.error("Error getting Stripe dashboard link:", err.response?.data?.message || err.message);
      setStripeLinkError(err.response?.data?.message || 'Could not open Stripe dashboard at this time. Please ensure your Stripe account is fully set up.');
    } finally {
      setStripeLinkLoading(false);
    }
  };

  if (loadingProfile) {
    return <div className="p-8 text-center text-gray-600 text-lg">Loading dashboard data...</div>;
  }

  if (profileError && profileError.status !== 404) { // Show error if not the expected "PROFILE_NOT_FOUND"
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
        <p className="text-gray-700 mb-4">
          We couldn't load your details. Error: {profileError.message || "Please try again later."}
        </p>
        <button onClick={() => window.location.reload()} className="text-blue-500 hover:underline">
          Try Reloading
        </button>
      </div>
    );
  }
  
  const greetingName = userProfile?.displayName || userProfile?.username || 'User';
  // Profile is considered incomplete if it's null (error fetching that wasn't 404), 
  // or if the backend explicitly said PROFILE_NOT_FOUND (error.code),
  // or if we have a userProfile object but it's missing a username (essential field)
  const isProfileIncomplete = !userProfile || profileError?.code === 'PROFILE_NOT_FOUND' || (userProfile && !userProfile.username);

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-800">
        Welcome, {greetingName}!
      </h1>
      <p className="text-md md:text-lg text-gray-600 mb-10">
        This is your central hub. Manage your public page, links, and payment settings.
      </p>

      {isProfileIncomplete && (
        <div className="p-4 md:p-5 mb-8 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-md shadow">
          <h2 className="font-bold text-lg mb-2">Complete Your Profile</h2>
          <p className="mb-3 text-sm md:text-base">
            It looks like your profile isn't fully set up yet. Please add a username and other details to activate your public page and features.
          </p>
          <Link 
            href="/dashboard/profile" 
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-yellow-800 font-semibold py-2 px-4 rounded-md transition-colors text-sm"
          >
            Go to Profile Setup
          </Link>
        </div>
      )}

      {stripeLinkError && (
          <p className="text-red-500 text-sm mb-4 p-3 bg-red-100 rounded-md">{stripeLinkError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Card for Public Page */}
        <div className="group p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
          <UserCircleIcon className="h-10 w-10 text-blue-500 mb-3" />
          <h2 className="text-xl md:text-2xl font-semibold mb-2 text-gray-700 group-hover:text-blue-600 transition-colors">Your Public Page</h2>
          {userProfile?.username ? (
            <>
              <p className="text-gray-600 mb-4 text-sm md:text-base">View and share your page.</p>
              <Link href={`/${userProfile.username}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm">
                View Page (/{userProfile.username})
                <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" />
              </Link>
            </>
          ) : (<p className="text-gray-500 text-sm md:text-base">Set username in profile to activate.</p>)}
        </div>

        {/* Card for Manage Links */}
        <div className="group p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
          <LinkIconOutline className="h-10 w-10 text-green-500 mb-3" />
          <h2 className="text-xl md:text-2xl font-semibold mb-2 text-gray-700 group-hover:text-green-600 transition-colors">Manage Links</h2>
          <p className="text-gray-600 mb-4 text-sm md:text-base">Add or edit your links.</p>
          <Link href="/dashboard/links" className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm">Go to Links</Link>
        </div>

        {/* Card for Edit Profile */}
        <div className="group p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
          <Cog6ToothIcon className="h-10 w-10 text-indigo-500 mb-3" />
          <h2 className="text-xl md:text-2xl font-semibold mb-2 text-gray-700 group-hover:text-indigo-600 transition-colors">Edit Profile</h2>
          <p className="text-gray-600 mb-4 text-sm md:text-base">Update your personal details.</p>
          <Link href="/dashboard/profile" className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm">Go to Profile</Link>
        </div>
        
        {/* Card for Payment Settings */}
        <div className="group p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
          <CreditCardIcon className="h-10 w-10 text-purple-500 mb-3" />
          <h2 className="text-xl md:text-2xl font-semibold mb-2 text-gray-700 group-hover:text-purple-600 transition-colors">Payment Settings</h2>
          {userProfile?.stripeOnboardingComplete ? (
            <>
              <p className="text-green-600 font-medium mb-3 text-sm md:text-base">Stripe Account Connected!</p>
              <button
                onClick={handleViewStripeDashboard}
                disabled={stripeLinkLoading || !userProfile?.stripeAccountId} // Also disable if no stripeAccountId somehow
                className="inline-flex items-center bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm disabled:opacity-70"
              >
                {stripeLinkLoading ? 'Loading...' : 'View Stripe Dashboard'}
                <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4"/>
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-3 text-sm md:text-base">Connect Stripe to receive payments.</p>
              <Link
                href="/connect-stripe"
                className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 px-5 rounded-lg text-sm"
              >
                Setup Payments with Stripe
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}