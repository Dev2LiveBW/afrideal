export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="grain relative min-h-[100dvh] bg-ink">{children}</div>;
}
