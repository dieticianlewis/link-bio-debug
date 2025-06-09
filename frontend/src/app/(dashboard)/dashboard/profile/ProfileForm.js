// frontend/src/app/(dashboard)/dashboard/profile/ProfileForm.js
'use client';

import { useState } from 'react';
import { updateProfile } from '@/app/actions'; // Import the server action

// This is a Client Component for interactivity
export default function ProfileForm({ profile }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // The form's submit action handler
  async function handleSubmit(formData) {
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await updateProfile(formData);

    if (result.success) {
      setSuccess(result.message);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {success && <div className="p-3 bg-green-100 text-green-700 rounded-md">{success}</div>}
      
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">your-page.com/</span>
          <input
            type="text"
            name="username"
            id="username"
            defaultValue={profile?.username || ''}
            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
            placeholder="your-unique-username"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
        <input
          type="text"
          name="displayName"
          id="displayName"
          defaultValue={profile?.displayName || ''}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Your Full Name"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
        <textarea
          name="bio"
          id="bio"
          rows="3"
          defaultValue={profile?.bio || ''}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="A short description about yourself."
        ></textarea>
      </div>

      <div>
        <label htmlFor="profileImageUrl" className="block text-sm font-medium text-gray-700">Profile Image URL</label>
        <input
          type="url"
          name="profileImageUrl"
          id="profileImageUrl"
          defaultValue={profile?.profileImageUrl || ''}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="https://your-image-host.com/image.png"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}