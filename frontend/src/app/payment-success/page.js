// frontend/src/app/payment-success/page.js
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // useRouter not used in this version but often useful
import Link from 'next/link';

// Content component to use Suspense with useSearchParams
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  // const sessionId = searchParams.get('session_id'); // Not displaying it
  const recipientUsername = searchParams.get('recipient');

  // Simplified: Assume success if on this page. Webhooks are the source of truth.
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 py-8 bg-gradient-to-br from-green-100 to-emerald-100">
      <div className="p-6 md:p-10 bg-white rounded-xl shadow-2xl max-w-lg">
        <svg className="w-24 h-24 text-green-500 mb-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h1 className="text-4xl font-extrabold text-green-600 mb-4">Payment Successful!</h1>
        <p className="text-xl text-gray-700 mb-8 max-w-md mx-auto">
          Thank you for your generous support{recipientUsername ? ` to ${recipientUsername}` : ''}! Your contribution is greatly appreciated.
        </p>
        
        <div className="space-y-4 md:space-y-0 md:space-x-4 flex flex-col md:flex-row items-center justify-center">
          {recipientUsername && (
            <Link 
              href={`/${recipientUsername}`} 
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-md hover:shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
            >
              Back to {recipientUsername}'s Page
            </Link>
          )}
          <Link 
            href="/" // Link to Homepage
            className="w-full md:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-8 rounded-lg text-lg shadow-md hover:shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
          >
            Go to Homepage
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-10">
          You should receive an email receipt from Stripe shortly.
        </p>
      </div>
    </div>
  );
}

// Wrap with Suspense because useSearchParams() must be used in a Client Component
// and Suspense is needed for Client Components that use it during initial server render.
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen text-lg text-gray-600">
        <p>Loading success information...</p>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}