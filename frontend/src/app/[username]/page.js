// frontend/src/app/[username]/page.js
import { notFound } from 'next/navigation';
import Image from 'next/image'; // Using Next.js Image component
import SendTipButton from '@/components/SendTipButton'; // Your client component for payments

// This function fetches public profile data from your backend
async function getPublicProfileData(username) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // Should be like http://localhost:3001/api
  if (!apiBaseUrl) {
    console.error("[FRONTEND SERVER] PublicProfilePage: CRITICAL - NEXT_PUBLIC_API_BASE_URL is not defined.");
    return null;
  }

  const specificPath = `/public/profile/${username}`; // Path relative to your API base
  const apiUrl = `${apiBaseUrl}${specificPath}`;
  // console.log(`[FRONTEND SERVER] PublicProfilePage: Attempting to fetch: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, { cache: 'no-store' }); // Fetch fresh data
    // console.log(`[FRONTEND SERVER] PublicProfilePage: Response status for ${username} from ${apiUrl}: ${res.status}`);

    if (!res.ok) {
      // const errorText = await res.text(); 
      if (res.status === 404) {
        // console.warn(`[FRONTEND SERVER] API returned 404 for ${username} from ${apiUrl}. User not found on backend.`);
      } else {
        // console.error(`[FRONTEND SERVER] API error for ${username} from ${apiUrl}. Status: ${res.status}. Response: ${errorText.substring(0,200)}`);
      }
      return null; 
    }

    const jsonData = await res.json();
    // console.log(`[FRONTEND SERVER] PublicProfilePage: Successfully fetched profile for ${username}`);
    return jsonData;
  } catch (error) {
    console.error(`[FRONTEND SERVER] CATCH BLOCK in getPublicProfileData for ${username} calling ${apiUrl}:`, error.message);
    return null;
  }
}

// The page component now accepts searchParams for the cancellation message
export default async function PublicProfilePage({ params, searchParams }) {
  const username = params.username; 
  const profileData = await getPublicProfileData(username);

  const paymentCancelled = searchParams?.payment_cancelled === 'true';

  if (!profileData) {
    notFound(); 
  }

  const displayName = profileData.displayName || username;
  const bio = profileData.bio || "";
  const profileImageUrl = profileData.profileImageUrl;
  const links = profileData.links || [];
  const stripeAccountId = profileData.stripeAccountId;
  const stripeOnboardingComplete = profileData.stripeOnboardingComplete;

  return (
    <div className="container mx-auto px-4 py-10 md:py-16 max-w-2xl text-center">
      {paymentCancelled && (
        <div 
          role="alert"
          className="mb-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow-md animate-pulse" // Added animate-pulse for slight attention
        >
          <p className="font-bold text-lg">Payment Cancelled</p>
          <p>Your previous payment attempt was cancelled. You can try again if you wish.</p>
        </div>
      )}

      {profileImageUrl ? (
        <Image
          src={profileImageUrl}
          alt={`Profile picture of ${displayName}`}
          width={160}
          height={160}
          className="rounded-full mx-auto mb-6 w-[160px] h-[160px] object-cover border-4 border-white shadow-xl bg-gray-200"
          priority
        />
      ) : (
        <div className="w-[160px] h-[160px] rounded-full mx-auto mb-6 bg-gray-300 flex items-center justify-center text-gray-500 text-6xl font-semibold shadow-xl">
          {displayName ? displayName.charAt(0).toUpperCase() : username.charAt(0).toUpperCase()}
        </div>
      )}

      <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-gray-900">{displayName}</h1>
      {profileData.displayName && <p className="text-xl text-gray-500 mb-4">@{username}</p>} 
      
      {bio && <p className="mt-2 text-lg text-gray-700 leading-relaxed max-w-xl mx-auto mb-8">{bio}</p>}

      {/* MOVED: Payment Button Area - now above links */}
      <div className="mb-10"> {/* Added margin-bottom for spacing */}
        {stripeAccountId && stripeOnboardingComplete ? (
          <SendTipButton 
              recipientUsername={username} 
              recipientDisplayName={displayName} 
            />
        ) : (
          profileData && 
          <div className="mt-8 p-4 bg-gray-100 rounded-md shadow text-center">
            <p className="text-sm text-gray-600">
              {displayName} is not currently set up to receive payments.
            </p>
          </div>
        )}
      </div>

      {/* Links Section */}
      <div className="w-full">
        {/* Conditionally render "Links" heading only if there are links to show */}
        {links.length > 0 && (
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">Links</h2>
        )}
        <div className="space-y-4">
            {links.length > 0 ? (
            links.map((link) => (
                <a
                key={link.id}
                href={link.url.startsWith('http://') || link.url.startsWith('https://') ? link.url : `//${link.url}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-lg text-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
                >
                {link.title}
                </a>
            ))
            ) : (
            <p className="text-gray-500 italic py-4 text-center">This user hasn't added any links yet.</p>
            )}
        </div>
      </div>
    </div>
  );
}

// For SEO and Tab Title
export async function generateMetadata({ params }) {
  const username = params.username;
  let profileData;
  try {
    profileData = await getPublicProfileData(username);
  } catch (error) {
    return { 
        title: 'Profile Unavailable',
        description: 'Could not load profile information at this time.' 
    };
  }

  if (!profileData) {
    return { 
        title: 'User Not Found',
        description: `The profile for ${username} could not be found.`
    };
  }

  const siteName = process.env.PLATFORM_DISPLAY_NAME || "Link In Bio"; // Use env var or default
  const title = `${profileData.displayName || profileData.username}'s Page | ${siteName}`;
  const description = profileData.bio || `Check out ${profileData.displayName || profileData.username}'s links and support them on ${siteName}.`;
  const imageUrl = profileData.profileImageUrl;
  const pageUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${username}`; // Ensure FRONTEND_URL is set in .env for production
  
  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: imageUrl ? [{ url: imageUrl, width: 800, height: 600, alt: `${profileData.displayName || profileData.username}'s profile picture` }] : [],
      type: 'profile',
      profile: {
        username: profileData.username,
      },
      url: pageUrl,
      siteName: siteName,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: title,
      description: description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}