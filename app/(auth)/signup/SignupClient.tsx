'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Lock, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { z } from 'zod';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { GoldButton } from '@/components/brand/GoldButton';
import { cn } from '@/lib/utils';

/**
 * Buyer registration.
 *
 * The rules here restate the ones in app/api/auth/register/route.ts, and that
 * duplication is deliberate: this copy exists to answer while the user is still
 * typing, the server copy is the one that actually decides. A form validated
 * only in the browser is a suggestion, not a constraint.
 *
 * Only buyer accounts are created here. Suppliers and runners are verified
 * before they can trade, so those stay a conversation rather than a form — the
 * panel on the left says so and links accordingly.
 */

const SignupSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name.').max(80, 'That name is too long.'),
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address.')
      .email('That is not a valid email address.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirm: z.string().min(1, 'Re-enter your password.'),
  })
  .refine((values) => values.password === values.confirm, {
    message: 'Both passwords must match.',
    path: ['confirm'],
  });

type SignupValues = z.infer<typeof SignupSchema>;

const PROMISES = [
  {
    icon: Wallet,
    title: 'Escrow by default',
    body: 'Your payment is held by AfriDeal and released to the supplier only once you confirm the goods arrived.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified suppliers only',
    body: 'Every supplier is checked for registration, tax and banking details before a single listing goes live.',
  },
  {
    icon: Truck,
    title: 'Tracked to the door',
    body: 'Orders route to the supplier most likely to deliver on time, and a runner carries the last mile.',
  },
];

/** The three password rules the server enforces, shown as they are met. */
function strengthChecks(password: string) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'A letter', met: /[A-Za-z]/.test(password) },
    { label: 'A number', met: /[0-9]/.test(password) },
  ];
}

export function SignupClient() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  });

  const password = watch('password');
  const checks = strengthChecks(password);

  const onSubmit = handleSubmit(async ({ name, email, password: chosen }) => {
    setFormError(null);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: chosen }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setFormError(body?.error ?? 'That did not work. Try again in a moment.');
      return;
    }

    /*
     * Sign in with the credentials just registered rather than making them type
     * the same thing twice. If this leg fails the account still exists, so send
     * them to /login with a note rather than implying the signup failed.
     */
    const result = await signIn('credentials', { email, password: chosen, redirect: false });

    if (!result?.ok) {
      router.replace('/login?registered=1');
      return;
    }

    // Buyers always land on the storefront, so this needs no role lookup.
    router.replace('/');
    router.refresh();
  });

  return (
    <div className="relative mx-auto grid min-h-[100dvh] max-w-market gap-12 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:py-16">
      {/* ── Left: what an account is for ───────────────────────────────── */}
      <div className="flex flex-col lg:sticky lg:top-16 lg:self-start">
        <Link href="/" className="w-fit">
          <AfriDealLogo variant="dark" size="md" />
        </Link>

        <p className="eyebrow mt-14 text-white/35">Create an account</p>

        <h1 className="mt-3 font-display text-[34px] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-[42px]">
          Buy from suppliers
          <br />
          you have not met yet.
        </h1>

        <p className="measure mt-5 text-[15px] leading-7 text-white/55">
          An AfriDeal account takes a minute and costs nothing. It is what lets you check out, track
          an order, raise a dispute, and ask for a quote on a quantity nobody has published a price
          for.
        </p>

        <ul className="mt-10 space-y-6 border-t border-white/10 pt-8">
          {PROMISES.map(({ icon: Icon, title, body }, index) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex gap-4"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-light">
                <Icon size={15} strokeWidth={1.5} />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-white">{title}</span>
                <span className="measure mt-1 block text-[13px] leading-6 text-white/50">
                  {body}
                </span>
              </span>
            </motion.li>
          ))}
        </ul>

        <p className="mt-9 text-[12.5px] leading-6 text-white/35">
          Selling instead of buying?{' '}
          <Link href="/login" className="text-gold-light underline-offset-4 hover:underline">
            Supplier accounts
          </Link>{' '}
          are verified before they can list, so they are opened with our team rather than from this
          form.
        </p>
      </div>

      {/* ── Right: the form ────────────────────────────────────────────── */}
      <div className="flex flex-col">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm sm:p-7">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field
              id="name"
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Thabo Modise"
              error={errors.name?.message}
              {...register('name')}
            />

            <Field
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@company.co.bw"
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Field
                id="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              {/*
                Shown only once there is something to judge. An empty field with
                three unmet rules under it reads as failure before the user has
                done anything wrong.
              */}
              {password.length > 0 && (
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                  {checks.map((check) => (
                    <li
                      key={check.label}
                      className={cn(
                        'flex items-center gap-1.5 text-[11.5px] transition-colors duration-200',
                        check.met ? 'text-[#8FD69F]' : 'text-white/35',
                      )}
                    >
                      <Check
                        size={11}
                        strokeWidth={2}
                        className={check.met ? 'opacity-100' : 'opacity-30'}
                      />
                      {check.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field
              id="confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.confirm?.message}
              {...register('confirm')}
            />

            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded border border-danger/30 bg-danger/10 px-3.5 py-3"
              >
                <AlertCircle
                  size={15}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0 text-[#F2A9A2]"
                />
                <p className="text-[13px] leading-5 text-[#F2A9A2]">{formError}</p>
              </motion.div>
            )}

            <GoldButton
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              loading={isSubmitting}
              withArrow
            >
              Create account
            </GoldButton>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-white/35">
            <Lock size={12} strokeWidth={1.5} />
            Sessions expire after 8 hours
          </p>
        </div>

        <div className="mt-7 rounded-lg border border-white/10 bg-white/[0.02] px-5 py-4">
          <p className="text-[13px] text-white/55">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-gold-light underline-offset-4 hover:underline"
            >
              Sign in instead
            </Link>
          </p>
          <p className="mt-1.5 text-[12px] leading-5 text-white/30">
            The sign-in page also carries the eight demo accounts, if you are here to look around
            rather than to buy.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * One labelled input.
 *
 * `forwardRef` is load-bearing: `register()` returns a ref along with the
 * change handlers, and React does not pass `ref` through a plain function
 * component. Without this the field would never register and the form would
 * submit empty.
 */
const Field = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(function Field({ id, label, error, ...props }, ref) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-white/80">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
        className={cn(
          'w-full rounded border bg-white/[0.04] px-3.5 py-3 text-[14px] text-white outline-none',
          'placeholder:text-white/30 transition-colors duration-200',
          'focus:border-gold/60 focus:bg-white/[0.06]',
          error ? 'border-danger/60' : 'border-white/12',
        )}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-[#F2A9A2]">
          {error}
        </p>
      )}
    </div>
  );
});
