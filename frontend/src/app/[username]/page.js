// frontend/src/app/[username]/page.js
import { notFound } from 'next/navigation';
import Image from 'next/image';
import SendTipButton from '@/components/SendTipButton';

async function getPublicProfileData(username) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // e.g., http://localhost:3001/api
  if (!apiBaseUrl) {
    console.error("[FRONTEND SERVER] PublicProfilePage: CRITICAL - NEXT_PUBLIC_API_BASE_URL is not defined.");
    return null;
  }

  // Path is relative to apiBaseUrl
  // So, this will call http://localhost:3001/api/public/profile/samiam
  const specificPath = `/public/profile/${username}`; 
  const apiUrl = `${apiBaseUrl}${specificPath}`;
  // console.log(`[FRONTEND SERVER] PublicProfilePage: Attempting to fetch: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) {
      // const errorText = await res.text();
      if (res.status === 404) { /* console.warn(`[FRONTEND SERVER] API 404 for ${username} from ${apiUrl}.`); */ } 
      // else { console.error(`[FRONTEND SERVER] API error for ${username} from ${apiUrl}. Status: ${res.status}. Resp: ${errorText.substring(0,200)}`); }
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`[FRONTEND SERVER] CATCH in getPublicProfileData for ${username} @ ${apiUrl}:`, error.message);
    return null;
  }
}

export default async function PublicProfilePage({ params }) {
  // const { username } = params; // This is correct, Next.js provides params directly
  const username = params.username; // Being explicit
  const profileData = await getPublicProfileData(username);

  if (!profileData) {
    notFound();
  }

  const { displayName = username, bio = "", profileImageUrl, links = [], stripeAccountId, stripeOnboardingComplete } = profileData;

  return (
    <div className="container mx-auto px-4 py-10 md:py-16 max-w-2xl text-center">
      {profileImageUrl ? (
        <Image
          src={profileImageUrl}
          alt={`Profile picture of ${displayName}`}
          width={150} height={150}
          className="rounded-full mx-auto mb-6 w-[150px] h-[150px] object-cover border-4 border-white shadow-xl bg-gray-200"
          priority
          // onError prop removed for Server Component
        />
      ) : (
        <div className="w-[150px] h-[150px] rounded-full mx-auto mb-6 bg-gray-300 flex items-center justify-center text-gray-500 text-6xl font-semibold shadow-xl">
          {displayName ? displayName.charAt(0).toUpperCase() : username.charAt(0).toUpperCase()}
        </div>
      )}
      <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-gray-800">{displayName}</h1>
      {profileData.displayName && <p className="text-xl text-gray-500 mb-1">@{username}</p>}
      {bio && <p className="mt-4 text-lg text-gray-700 leading-relaxed max-w-xl mx-auto">{bio}</p>}
      <div className="mt-10 space-y-4 mb-12 w-full">
        {links.length > 0 ? (
          links.map((link) => (
            <a key={link.id} href={link.url.startsWith('http') ? link.url : `//${link.url}`} target="_blank" rel="noopener noreferrer nofollow"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg text-lg shadow-md hover:shadow-lg transition-all">
              {link.title}
            </a>
          ))
        ) : (<p className="text-gray-500 italic py-4">No links yet.</p>)}
      </div>
      {stripeAccountId && stripeOnboardingComplete ? (
         <SendTipButton recipientUsername={username} recipientDisplayName={displayName} />
      ) : ( profileData && <p className="text-sm text-gray-500 mt-8 p-4 bg-gray-100 rounded-md shadow">{displayName} not set up for payments.</p> )}
    </div>
  );
}

export async function generateMetadata({ params }) {
  // const { username } = params; // This is correct
  const username = params.username;
  let profileData;
  try {
    profileData = await getPublicProfileData(username);
  } catch (error) { return { title: 'Profile Unavailable' }; }
  if (!profileData) { return { title: 'User Not Found' }; }
  const title = `${profileData.displayName || profileData.username}'s Page | YourLinkSite`;
  const description = profileData.bio || `Links for ${profileData.displayName || profileData.username}.`;
  return { title, description, openGraph: { title, description, images: profileData.profileImageUrl ? [{ url: profileData.profileImageUrl }] : [] } };
}