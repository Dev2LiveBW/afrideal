// The v4 page is a "use client" component and cannot export route segment
// config itself. This layout carries the config for the whole segment.
// force-dynamic prevents Next from prerendering the page at build time,
// which would throw because ClerkProvider needs NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
export const dynamic = 'force-dynamic';

export default function V4Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
