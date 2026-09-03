import { MobileTabBar, StorefrontFooter, StorefrontNav } from '@/components/layout/StorefrontNav';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <StorefrontNav />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />

      {/*
        The tab bar floats over the page on phones, so the last section of every
        screen reserves its height plus the home indicator. `lg:pb-0` gives the
        space back on desktop, where the bar is not rendered at all.
      */}
      <div
        aria-hidden="true"
        className="h-[calc(64px+env(safe-area-inset-bottom))] shrink-0 lg:hidden"
      />
      <MobileTabBar />
    </div>
  );
}
