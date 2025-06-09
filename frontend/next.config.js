// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qpykmvmfpqitrhwoayya.supabase.co', // Your Supabase project hostname
        port: '', // Usually empty for HTTPS
        // This pathname allows images from ANY folder inside the 'avatars' bucket,
        // including directly in 'avatars/' or in 'avatars/banner/' or 'avatars/USER_ID/' etc.
        pathname: '/storage/v1/object/public/avatars/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com', // If you still use imgur links anywhere
        port: '',
        pathname: '/**', // Allow any path under this hostname for imgur
      },
      // Add other trusted hostnames if needed
    ],
  },
  // ... any other Next.js configurations you have
};

module.exports = nextConfig;