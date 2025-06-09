// frontend/src/app/[username]/page.js
import { notFound } from 'next/navigation';
import Image from 'next/image';
import SendTipButton from '@/components/SendTipButton'; // Ensure this component exists

async function getPublicProfileData(username) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    console.error("[FRONTEND SERVER] PublicProfilePage: CRITICAL - NEXT_PUBLIC_API_BASE_URL is not defined.");
    return null;
  }

  // Assuming NEXT_PUBLIC_API_BASE_URL is "http://localhost:3001/api"
  // The path should be relative to this base.
  const specificPath = `/public/profile/${username}`;
  const apiUrl = `${apiBaseUrl}${specificPath}`;
  // console.log(`[FRONTEND SERVER] PublicProfilePage: Attempting to fetch: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    // console.log(`[FRONTEND SERVER] PublicProfilePage: Response status for ${username} from ${apiUrl}: ${res.status}`);

    if (!res.ok) {
      // const errorBody = await res.text(); // For debugging
      // console.warn(`[FRONTEND SERVER] API Error for ${username}. Status: ${res.status}. Body: ${errorBody.substring(0,100)}`);
      return null; 
    }
    return await res.json();
  } catch (error) {
    console.error(`[FRONTEND SERVER] CATCH BLOCK in getPublicProfileData for ${username} calling ${apiUrl}:`, error.message);
    return null;
  }
}

export default async function PublicProfilePage({ params, searchParams }) {
  const username = params.username; // Provided by Next.js for dynamic routes
  const profileData = await getPublicProfileData(username);

  // console.log(`[PublicProfilePage for ${username}] Profile Data Received on Server:`, JSON.stringify(profileData, null, 2));

  const paymentCancelled = searchParams?.payment_cancelled === 'true'; // searchParams also provided

  if (!profileData) {
    notFound();
  }

  const { 
    displayName = username, 
    bio = "", 
    profileImageUrl, 
    bannerImageUrl, // Make sure this is selected and returned by your backend
    links = [], 
    stripeAccountId, 
    stripeOnboardingComplete 
  } = profileData;

  return (
    <div className="container mx-auto max-w-3xl flex flex-col items-center pb-10">
      {/* Banner Image */}
      <div className="w-full h-48 md:h-64 lg:h-72 relative shadow-lg bg-gray-200">
        {bannerImageUrl ? (
          <Image
            src={bannerImageUrl}
            alt={`${displayName}'s banner`}
            layout="fill" // Changed from "fill" to "responsive" if aspect ratio is known, or keep fill with parent dimensions
            objectFit="cover"
            priority={true} // Banner is likely important for LCP
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Example sizes, adjust as needed
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center text-gray-500">
            {/* Optional: <p>No banner image</p> */}
          </div>
        )}
      </div>

      {/* Profile content area */}
      <div className="w-full max-w-2xl bg-white p-6 md:p-8 shadow-xl relative z-10 -mt-12 md:-mt-16 rounded-lg mx-4 sm:mx-0">
        <div className="flex justify-center -mt-20 md:-mt-24 mb-4">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={`Profile picture of ${displayName}`}
              width={160} height={160}
              className="rounded-full w-32 h-32 md:w-40 md:h-40 object-cover border-4 border-white shadow-2xl bg-gray-200"
              priority
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-5xl md:text-6xl font-semibold shadow-2xl border-4 border-white">
              {displayName ? displayName.charAt(0).toUpperCase() : username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        {paymentCancelled && (
          <div role="alert" className="mb-6 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm">
            <p className="font-semibold text-center">Payment Cancelled.</p>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2 mb-1 text-gray-900">{displayName}</h1>
          {profileData.displayName && <p className="text-lg text-gray-500 mb-3">@{username}</p>}
          {bio && <p className="text-md text-gray-600 leading-relaxed max-w-lg mx-auto mb-6">{bio}</p>}
        </div>

        <div className="mb-8 px-4 md:px-0">
          {stripeAccountId && stripeOnboardingComplete ? (
            <SendTipButton recipientUsername={username} recipientDisplayName={displayName} />
          ) : ( profileData && 
            <div className="mt-6 p-3 bg-gray-100 rounded-md shadow text-center text-sm text-gray-600">
              {displayName} is not currently set up to receive payments.
            </div>
          )}
        </div>

        <div className="w-full px-4 md:px-0">
          {links.length > 0 && (<h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Links</h2>)}
          <div className="space-y-3">
            {links.length > 0 ? (
              links.map((link) => ( <a key={link.id} href={link.url.startsWith('http') ? link.url : `//${link.url}`} target="_blank" rel="noopener noreferrer nofollow" className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-5 rounded-md text-md shadow hover:shadow-md transition-all"> {link.title} </a> ))
            ) : ( <p className="text-gray-500 italic py-3 text-center">This user hasn't added any links yet.</p> )}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const username = params.username;
  let profileData;
  try { profileData = await getPublicProfileData(username); } catch (error) { return { title: 'Profile Unavailable' }; }
  if (!profileData) { return { title: 'User Not Found' }; }
  
  const siteName = process.env.PLATFORM_DISPLAY_NAME || "YourLinkSite"; // Set PLATFORM_DISPLAY_NAME in .env
  const title = `${profileData.displayName || profileData.username}'s Page | ${siteName}`;
  const description = profileData.bio || `Check out ${profileData.displayName || profileData.username}'s links on ${siteName}.`;
  
  const imagesForMeta = [];
  if (profileData.bannerImageUrl) imagesForMeta.push({ url: profileData.bannerImageUrl, alt: `${profileData.displayName || profileData.username}'s banner`});
  else if (profileData.profileImageUrl) imagesForMeta.push({ url: profileData.profileImageUrl, alt: 'Profile Picture' });

  const twitterImages = imagesForMeta.length > 0 ? [imagesForMeta[0].url] : [];
  const pageUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${username}`; 

  return {
    title, description,
    openGraph: { title, description, images: imagesForMeta, type: 'profile', url: pageUrl, siteName },
    twitter: { card: imagesForMeta.length > 0 ? 'summary_large_image' : 'summary', title, description, images: twitterImages },
  };
}