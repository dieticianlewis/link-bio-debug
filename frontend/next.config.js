// NEW (in next.config.js - CommonJS)
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qpykmvmfpqitrhwoayya.supabase.co', // Your Supabase project hostname
        pathname: '/storage/v1/object/public/avatars/**', // Path to your avatars bucket
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com', // If you still use imgur
        pathname: '/**',
      },
      // Add other trusted hostnames if needed
    ],
  },
  // ... any other Next.js configurations you have
};

module.exports = nextConfig; // <--- This is CommonJS export