// frontend/src/components/SendTipButton.js
'use client';

import { useState } from 'react';
import apiClient from '@/lib/api'; // Your client-side Axios helper
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe.js outside of the component to avoid re-creating on every render.
// Ensure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is in your .env.local
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function SendTipButton({ recipientUsername, recipientDisplayName }) {
  const [amount, setAmount] = useState(5); // Default tip amount in dollars
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTip = async () => {
    if (!recipientUsername) {
      setError("Recipient information is missing.");
      return;
    }
    if (!amount || parseFloat(amount) < 1) {
      setError("Please enter a valid amount of at least $1.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Call your backend to create a Stripe Checkout Session
      const response = await apiClient.post('/stripe/create-checkout-session', {
        amount: parseFloat(amount), // Send amount in dollars
        recipientUsername: recipientUsername,
      });

      const sessionId = response.data?.id;

      if (!sessionId) {
        throw new Error('Failed to create a checkout session ID.');
      }

      // 2. Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        console.error("Stripe redirect error:", stripeError);
        setError(stripeError.message || "Could not redirect to Stripe.");
        // setLoading(false) will be set in finally, but if redirect fails, user stays on page
      }
      // If redirectToCheckout is successful, the user is navigated away,
      // so setLoading(false) here might not be reached until they return.
    } catch (err) {
      console.error("Error initiating tip:", err);
      setError(err.response?.data?.message || err.message || 'Could not initiate payment. Please try again.');
      setLoading(false); // Ensure loading is false on error
    }
    // setLoading(false); // Typically, redirect handles this, but good for non-redirect errors.
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
        Support {recipientDisplayName || recipientUsername}!
      </h3>
      {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-100 rounded-md text-center">{error}</p>}
      
      <div className="flex items-center justify-center space-x-2 mb-5">
        <span className="text-2xl font-medium text-gray-700">$</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || (parseFloat(val) >= 0 && !val.includes('.')) || /^\d*\.?\d{0,2}$/.test(val)) {
                setAmount(val);
            }
          }}
          min="1" // Minimum $1 tip for Stripe
          step="1" // Or "0.01" if you want cents
          className="w-24 md:w-28 px-3 py-2.5 border border-gray-300 rounded-lg text-center text-xl font-medium text-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="5"
        />
      </div>
      <button
        onClick={handleTip}
        disabled={loading || !amount || parseFloat(amount) < 1}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 px-6 rounded-lg text-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : `Send $${amount || 0} Tip`}
      </button>
      <p className="text-xs text-gray-500 mt-3 text-center">Powered by Stripe</p>
    </div>
  );
}