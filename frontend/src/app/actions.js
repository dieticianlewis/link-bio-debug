// frontend/src/app/actions.js
'use server';

import { revalidatePath } from 'next/cache';
import { fetchFromServer } from '@/lib/server-api'; // <-- CORRECT PATH

export async function updateProfile(formData) {
  const profileData = {
    username: formData.get('username'),
    displayName: formData.get('displayName'),
    bio: formData.get('bio'),
    profileImageUrl: formData.get('profileImageUrl'),
  };

  try {
    await fetchFromServer('/api/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });

    // Revalidate paths to show updated data immediately
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile');
    if (profileData.username) {
        revalidatePath(`/${profileData.username}`);
    }

    return { success: true, message: 'Profile updated successfully!' };
  } catch (error) {
    console.error("Error in updateProfile action:", error);
    return { success: false, message: error.body?.message || 'An unknown error occurred.' };
  }
}