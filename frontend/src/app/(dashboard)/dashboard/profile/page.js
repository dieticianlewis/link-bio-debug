// frontend/src/app/(dashboard)/dashboard/profile/page.js
import { fetchProtectedDataFromServer } from '@/lib/server-api';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfilePageServer() {
  let initialProfileData = null; 
  let serverFetchError = null;

  try {
    // Path is relative to NEXT_PUBLIC_API_BASE_URL (which is http://localhost:3001/api)
    // So, this will call http://localhost:3001/api/users/me
    initialProfileData = await fetchProtectedDataFromServer('/users/me'); 
  } catch (e) {
    serverFetchError = e;
    if (e.status === 404 && e.body?.code === 'PROFILE_NOT_FOUND') {
      initialProfileData = {}; 
      serverFetchError = null; 
    } else {
      console.error("ProfilePageServer: Error fetching initial profile data:", e.message, "Status:", e.status);
    }
  }
  return <ProfileForm initialData={initialProfileData} serverError={serverFetchError} />;
}