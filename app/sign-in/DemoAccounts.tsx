'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk, useSignIn, useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { cn } from '@/lib/utils';

import { DEMO_GROUPS, type DemoAccount } from './demo-accounts';

/**
 * One-click sign-in as any of the eight seeded roles.
 *
 * Signs in through Clerk's client SDK exactly as the form beside it does; the
 * only shortcut is that the credentials are pre-filled. If another demo
 * account is already signed in, it is signed out first so a presenter can hop
 * between roles without visiting the nav.
 */
export function DemoAccounts() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function quickLogin(account: DemoAccount) {
    if (!isLoaded || !signIn || !setActive) return;
    setPendingEmail(account.email);

    try {
      if (isSignedIn) await signOut();

      const attempt = await signIn.create({ identifier: account.email, password: account.password });

      if (attempt.status !== 'complete' || !attempt.createdSessionId) {
        toast.error(`Sign-in for ${account.name} needs another step (${attempt.status}).`);
        setPendingEmail(null);
        return;
      }

      await setActive({ session: attempt.createdSessionId });
      router.push('/after-sign-in');
      router.refresh();
    } catch (error) {
      const message =
        (error as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0]?.longMessage ??
        (error as Error)?.message ??
        'Could not sign in.';
      toast.error(message);
      setPendingEmail(null);
    }
  }

  const busy = pendingEmail !== null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="eyebrow whitespace-nowrap text-muted">Or sign in as</p>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <div className="space-y-5">
        {DEMO_GROUPS.map((group, groupIndex) => (
          <div key={group.heading}>
            <div className="mb-2 flex items-baseline gap-2">
              <p className="text-[12px] font-semibold text-ink">{group.heading}</p>
              <p className="text-[11.5px] text-muted">{group.caption}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {group.accounts.map((account, index) => {
                const isPending = pendingEmail === account.email;

                return (
                  <motion.button
                    key={account.email}
                    type="button"
                    disabled={busy || !isLoaded}
                    onClick={() => quickLogin(account)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.05 + groupIndex * 0.06 + index * 0.035,
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={cn(
                      'group relative flex items-center gap-3 overflow-hidden rounded border p-3 text-left',
                      'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      'disabled:cursor-wait',
                      isPending
                        ? 'border-forest/40 bg-forest-wash'
                        : 'border-hairline bg-white shadow-sm hover:border-hairline-strong hover:bg-surface-sunk',
                      busy && !isPending && 'opacity-40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[11.5px] font-semibold',
                        account.role === 'SUPPLIER_OWNER'
                          ? 'bg-forest-wash text-forest'
                          : account.role === 'CUSTOMER' || account.role === 'RUNNER'
                            ? 'bg-surface-sunk text-ink'
                            : 'bg-gold-50 text-gold-700',
                      )}
                    >
                      {account.avatar}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink">{account.name}</span>
                      <span className="block truncate text-[11.5px] text-muted">{account.blurb}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
