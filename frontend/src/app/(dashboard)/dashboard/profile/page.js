// frontend/src/app/(dashboard)/dashboard/profile/page.js

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api'; // We'll use our Axios instance for this

export default function ProfileSetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation... (this part is fine)
    if (!username.match(/^[a-zA-Z0-9_]{3,15}$/)) {
      setError('Username must be 3-15 characters and can only contain letters, numbers, and underscores.');
      setLoading(false);
      return;
    }

    try {
      console.log("Submitting profile to backend...");
      const response = await apiClient.post('/users/profile', {
        username,
        displayName,
      });

      // THIS IS THE SUCCESS BLOCK
      console.log("Backend responded with success!", response.status, response.data);
      console.log("Attempting to redirect to /dashboard...");
      
      // Stop the loading indicator BEFORE we navigate away
      setLoading(false);

      router.push('/dashboard');
      router.refresh(); // This is still important!

    } catch (err) {
      console.error("Profile setup failed in the catch block:", err);
      const errorMessage = err.response?.data?.message || 'An unexpected error occurred.';
      setError(errorMessage);
      setLoading(false); // Make sure to stop loading on error
		} 
	}

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Set Up Your Profile</h1>
      <p className="text-gray-600 mb-8">Choose a unique username to create your public page.</p>
      
      {error && <p className="text-red-500 mb-4 p-3 bg-red-100 rounded text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
              your.page/
            </span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-3 text-black"
              placeholder="your-cool-name"
            />
          </div>
        </div>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
            placeholder="Your Name"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Profile and Continue'}
        </button>
      </form>
    </div>
  );
}