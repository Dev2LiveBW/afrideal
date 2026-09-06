'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getSession, signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { z } from 'zod';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { ActionButton } from '@/components/brand/ActionButton';
import { landingFor } from '@/lib/roles';
import { cn } from '@/lib/utils';

import { DEMO_GROUPS, type DemoAccount } from './demo-accounts';

const Credentials = z.object({
  email: z.string().min(1, 'Enter your email address.').email('That is not a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type CredentialValues = z.infer<typeof Credentials>;

const ROLE_TONE: Record<string, string> = {
  SUPER_ADMIN: 'bg-gold-50 text-gold-700 ring-gold/20',
  OPERATIONS_ADMIN: 'bg-gold-50 text-gold-700 ring-gold/20',
  FINANCE_ADMIN: 'bg-gold-50 text-gold-700 ring-gold/20',
  SUPPLIER_OWNER: 'bg-forest-wash text-forest ring-forest/20',
  RUNNER: 'bg-surface-sunk text-ink ring-hairline',
  CUSTOMER: 'bg-surface-sunk text-ink ring-hairline',
};

const ROLE_SHORT: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OPERATIONS_ADMIN: 'Operations',
  FINANCE_ADMIN: 'Finance',
  SUPPLIER_OWNER: 'Supplier',
  RUNNER: 'Runner',
  CUSTOMER: 'Customer',
};

export function LoginClient() {
  const router = useRouter();

  /*
   * Set by /signup when the account was created but the automatic sign-in that
   * follows it did not land. Without this the user arrives at a bare login form
   * and reasonably concludes the registration failed, when it did not.
   */
  const justRegistered = useSearchParams().get('registered') === '1';

  const [formError, setFormError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CredentialValues>({
    resolver: zodResolver(Credentials),
    defaultValues: { email: '', password: '' },
  });

  /**
   * One sign-in path for both the form and the demo cards. The landing route
   * comes from the session that comes back, not from a lookup table on the
   * client, so a manually typed login lands in the same place as a card click.
   */
  async function authenticate(email: string, password: string) {
    setFormError(null);

    const result = await signIn('credentials', { email, password, redirect: false });

    if (!result?.ok) {
      setFormError('That email and password combination does not match an active account.');
      return false;
    }

    const session = await getSession();
    const role = session?.user?.role;

    router.replace(role ? landingFor(role) : '/');
    router.refresh();
    return true;
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setPendingEmail(email);
    const ok = await authenticate(email, password);
    if (!ok) setPendingEmail(null);
  });

  async function quickLogin(account: DemoAccount) {
    setValue('email', account.email);
    setValue('password', account.password);
    setPendingEmail(account.email);

    const ok = await authenticate(account.email, account.password);
    if (!ok) setPendingEmail(null);
  }

  const busy = isSubmitting || pendingEmail !== null;

  return (
    <div className="relative mx-auto grid min-h-[100dvh] max-w-market gap-12 px-6 py-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:py-16">
      {/* ── Left: the argument ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:sticky lg:top-16 lg:self-start">
        <Link href="/" className="w-fit">
          <AfriDealLogo variant="light" size="md" />
        </Link>

        <p className="eyebrow mt-14 text-muted">Sign in</p>

        <h1 className="mt-3 font-display text-[34px] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[42px]">
          The price is on
          <br />
          the page already.
        </h1>

        <p className="measure mt-5 text-[15px] leading-7 text-body">
          AfriDeal publishes what a product costs at one unit and at fifty, so a buyer can compare
          before committing rather than after. Suppliers are verified before they can list, and
          orders route to whoever is most likely to deliver, not to whoever is cheapest.
        </p>

        <dl className="mt-10 grid grid-cols-3 gap-5 border-t border-hairline pt-7">
          {[
            ['5', 'verified suppliers'],
            ['17', 'live products'],
            ['60 / 44%', 'retail / bulk markup'],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="font-mono text-[19px] font-semibold tabular-nums text-gold-dark">
                {value}
              </dt>
              <dd className="mt-1 text-[12px] leading-4 text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Right: the form and the demo cards ─────────────────────────── */}
      <div className="flex flex-col">
        <div className="rounded-lg border border-hairline bg-white shadow-card p-6  sm:p-7">
          {justRegistered && (
            <div className="mb-5 flex items-start gap-2.5 rounded border border-forest/20 bg-forest-wash px-3.5 py-3">
              <CheckCircle2
                size={15}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0 text-forest"
              />
              <p className="text-[13px] leading-5 text-forest">
                Your account is ready. Sign in with the email and password you just chose.
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[13px] font-medium text-ink"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.co.bw"
                {...register('email')}
                aria-invalid={errors.email ? 'true' : undefined}
                className={cn(
                  'w-full rounded border bg-surface px-3.5 py-3 text-[14px] text-ink outline-none',
                  'placeholder:text-muted transition-colors duration-200',
                  'focus:border-gold/60 focus:bg-surface-sunk',
                  errors.email ? 'border-danger/60' : 'border-hairline',
                )}
              />
              {errors.email && (
                <p className="mt-1.5 text-[12px] text-danger">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[13px] font-medium text-ink"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                aria-invalid={errors.password ? 'true' : undefined}
                className={cn(
                  'w-full rounded border bg-surface px-3.5 py-3 text-[14px] text-ink outline-none',
                  'placeholder:text-muted transition-colors duration-200',
                  'focus:border-gold/60 focus:bg-surface-sunk',
                  errors.password ? 'border-danger/60' : 'border-hairline',
                )}
              />
              {errors.password && (
                <p className="mt-1.5 text-[12px] text-danger">{errors.password.message}</p>
              )}
            </div>

            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded border border-danger/30 bg-danger/10 px-3.5 py-3"
              >
                <AlertCircle size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger" />
                <p className="text-[13px] leading-5 text-danger">{formError}</p>
              </motion.div>
            )}

            <ActionButton type="submit" size="lg" className="w-full" loading={busy} withArrow>
              Sign in
            </ActionButton>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted">
            <Lock size={12} strokeWidth={1.5} />
            Sessions expire after 8 hours
          </p>

          <p className="mt-5 border-t border-hairline pt-4 text-center text-[13px] text-body">
            New to AfriDeal?{' '}
            <Link
              href="/signup"
              className="font-medium text-gold-dark underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>

        {/* ── Demo cards ───────────────────────────────────────────────── */}
        <div className="mt-9">
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
                        disabled={busy}
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

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium text-ink">
                              {account.name}
                            </span>
                          </span>
                          <span className="mt-1 flex items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                                ROLE_TONE[account.role],
                              )}
                            >
                              {ROLE_SHORT[account.role]}
                            </span>
                            <span className="truncate text-[11px] text-muted">{account.blurb}</span>
                          </span>
                        </span>

                        <span className="shrink-0 text-ink/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-gold-dark">
                          {isPending ? (
                            <Loader2 size={15} strokeWidth={1.5} className="animate-spin text-gold-dark" />
                          ) : (
                            <ArrowRight size={15} strokeWidth={1.5} />
                          )}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[11.5px] leading-5 text-muted">
            Demo accounts. Passwords are stored in plain text in the seed data and are listed in the
            README, which is fine for a demo and is the first thing to change before real users.
          </p>
        </div>
      </div>
    </div>
  );
}
