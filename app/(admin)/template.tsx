import { PageTransition } from '@/components/motion/PageTransition';

/** Console mode: opacity only, fast. See PageTransition for why. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition mode="console">{children}</PageTransition>;
}
