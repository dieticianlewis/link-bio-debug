// frontend/src/app/(dashboard)/connect-stripe/page.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import apiClient from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ConnectStripeContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const status = searchParams.get('status');
    const reauth = searchParams.get('reauth');
    const stripeAccountIdParam = searchParams.get('stripe_account_id');

    const fetchAccountStatus = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/stripe/connect/account-status');
        setStripeAccountStatus(response.data);
        if (response.data?.onboardingComplete) {
          // If onboarding is complete, you might want to clear query params or navigate
          // router.replace('/connect-stripe', undefined, { shallow: true }); // Next 13+ with App Router
        }
      } catch (err) {
        console.error("Error fetching Stripe status:", err);
        setError(err.response?.data?.message || "Could not retrieve Stripe account status.");
      } finally {
        setLoading(false);
      }
    };

    fetchAccountStatus(); // Fetch status on initial load

    if (status === 'success' && stripeAccountIdParam) {
      // Optionally show a success message before fetching status again,
      // or let fetchAccountStatus handle showing the updated status.
      console.log("Returned from Stripe successfully for account:", stripeAccountIdParam);
      // Re-fetch status to confirm
      // fetchAccountStatus(); // Already called above
    } else if (reauth) {
      setError("Your previous session expired. Please try connecting again.");
    }

  }, [searchParams, router]);

  const handleConnectStripe = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/stripe/connect/onboard-user');
      if (response.data.url) {
        window.location.href = response.data.url; // Redirect to Stripe onboarding
      } else {
        throw new Error('Failed to get Stripe onboarding URL.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate Stripe connection.');
      setLoading(false);
    }
  };

  if (loading && !stripeAccountStatus) { // Show loading only if no status yet
    return <p className="text-center p-10">Loading Stripe connection status...</p>;
  }

  if (stripeAccountStatus?.onboardingComplete) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h1 className="text-2xl font-bold mb-3 text-gray-800">Stripe Account Connected!</h1>
        <p className="text-green-600 mb-6">Your Stripe account is successfully connected and ready to receive payments.</p>
        <p className="text-sm text-gray-500 mb-2">Stripe Account ID: {stripeAccountStatus.stripeAccountId}</p>
        <p className="text-sm text-gray-500 mb-2">Charges Enabled: {stripeAccountStatus.chargesEnabled ? 'Yes' : 'No'}</p>
        <p className="text-sm text-gray-500 mb-4">Payouts Enabled: {stripeAccountStatus.payoutsEnabled ? 'Yes' : 'No'}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-3 text-gray-800">Connect Stripe to Receive Payments</h1>
      <p className="text-gray-600 mb-6">
        To receive tips and payments from your supporters, you need to connect a Stripe account.
        We partner with Stripe for secure and reliable payment processing. Clicking the button below will redirect you to Stripe to complete the setup.
      </p>
      {error && <p className="text-red-500 mb-4 p-3 bg-red-100 rounded text-sm">{error}</p>}
      {stripeAccountStatus && !stripeAccountStatus.onboardingComplete && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded text-sm">
          <p>Your Stripe onboarding is not yet complete.</p>
          {stripeAccountStatus.detailsSubmitted === false && <p>- Please submit all required details to Stripe.</p>}
          {stripeAccountStatus.chargesEnabled === false && <p>- Charges are not yet enabled for your account.</p>}
          <p>Click the button below to continue or update your Stripe account information.</p>
        </div>
      )}
      <button
        onClick={handleConnectStripe}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:opacity-70"
      >
        {loading ? 'Processing...' : (stripeAccountStatus?.stripeAccountId ? 'Continue Stripe Onboarding' : 'Connect with Stripe')}
      </button>
      <p className="text-xs text-gray-500 mt-4 text-center">
        You will be redirected to Stripe to securely connect your account.
      </p>
    </div>
  );
}

// Wrap with Suspense because useSearchParams() needs it
export default function ConnectStripePage() {
  return (
    <Suspense fallback={<p>Loading page details...</p>}>
      <ConnectStripeContent />
    </Suspense>
  );
}