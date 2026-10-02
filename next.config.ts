import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(), microphone=(), payment=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/profil/lyubimi", destination: "/lyubimi", permanent: false },
      { source: "/profil/suobshteniya", destination: "/suobshteniya", permanent: false },
      { source: "/publikuvay", destination: "/publikuvai", permanent: true },
    ];
  },
};

export default nextConfig;
