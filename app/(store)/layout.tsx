import { StorefrontFooter, StorefrontNav } from '@/components/layout/StorefrontNav';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <StorefrontNav />
      {/*
        The nav is fixed and detached from the top, so pages that do not open
        with a full-bleed dark hero add their own top padding. The landing page
        deliberately runs underneath it.
      */}
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  );
}
