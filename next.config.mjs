/**
 * Content Security Policy, report only for now.
 *
 * Built from Clerk's list of required hosts (docs: "Configure Clerk
 * Content-Security-Policy headers") plus our image hosts. It is sent as
 * Content-Security-Policy-Report-Only so nothing breaks while it is checked in
 * a browser across every portal; switching the header name to
 * Content-Security-Policy is a launch-checklist step once the console shows no
 * violations. The production Clerk host is assumed to be clerk.afrideal.co.bw.
 */
const CLERK_HOSTS = [
  'https://*.clerk.accounts.dev',
  'https://clerk.afrideal.co.bw',
  'https://challenges.cloudflare.com',
  'https://*.protect.clerk.com',
];

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // Next's inline bootstrap needs 'unsafe-inline' until a nonce is wired through.
  `script-src 'self' 'unsafe-inline' ${CLERK_HOSTS.join(' ')}`,
  `connect-src 'self' https://*.clerk.accounts.dev https://clerk.afrideal.co.bw https://*.protect.clerk.com:*`,
  "img-src 'self' data: blob: https://img.clerk.com https://images.unsplash.com https://cdn.sanity.io",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  'frame-src https://challenges.cloudflare.com https://*.protect.clerk.com',
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = [
  // Two years, subdomains included. Not `preload`: that is a commitment for the
  // domain the product owner makes, not something a header should sign up for.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()' },
  { key: 'Content-Security-Policy-Report-Only', value: CONTENT_SECURITY_POLICY },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // The Playwright journeys run their own dev server (on a throwaway Neon
  // branch) beside yours; a separate build folder keeps the two apart.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // instrumentation.ts raises Node's TCP handshake budget before the first
    // outbound call; see lib/postgres/network.mjs.
    instrumentationHook: true,

    // The JSON store is read/written with node:fs at request time.
    // Keep these out of the bundle trace optimisation so the files stay on disk.
    outputFileTracingIncludes: { '/api/**/*': ['./data/**/*'] },

    // Next spawns parallel workers for static generation. On Windows those
    // workers abort with STATUS_STACK_BUFFER_OVERRUN (0xC0000409) partway
    // through this build; generating in-process is slower but completes.
    workerThreads: false,
    cpus: 1,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
};

export default nextConfig;
