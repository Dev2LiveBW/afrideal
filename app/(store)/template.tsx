import { PageTransition } from '@/components/motion/PageTransition';

/**
 * A template, not a layout: Next remounts this on every navigation, which is
 * what gives each storefront page its own entrance. A layout would persist and
 * animate once.
 */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition mode="marketplace">{children}</PageTransition>;
}
