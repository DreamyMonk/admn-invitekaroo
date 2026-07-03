/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone Invite Karoo admin panel — deployed on Vercel at
  // admin.invitekaroo.com. Needs the /api/otp routes (serverless) for email-OTP
  // login, so this is a normal Next.js app (not a static export).
  images: { unoptimized: true },
};

export default nextConfig;
