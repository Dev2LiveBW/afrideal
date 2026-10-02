'use server';

import { clerkClient } from '@clerk/nextjs/server';

import { ALL_DEMO_ACCOUNTS } from './demo-accounts';

/**
 * Demo cards only work against Clerk's development instance. A production
 * instance's secret key starts `sk_live_`, so this is off there no matter what
 * else is configured.
 */
export async function isDemoSignInEnabled(): Promise<boolean> {
  return (process.env.CLERK_SECRET_KEY ?? '').startsWith('sk_test_');
}

/**
 * A one-time sign-in ticket for one of the eight demo accounts.
 *
 * Password sign-in from a device Clerk has not seen before asks for an
 * emailed code, and the demo addresses are not ours to read, so the cards
 * sign in with a ticket instead. Only the listed demo e-mails are accepted.
 */
export async function demoSignInTicket(email: string): Promise<{ ticket: string } | { error: string }> {
  if (!(await isDemoSignInEnabled())) return { error: 'Demo sign-in is switched off here.' };
  if (!ALL_DEMO_ACCOUNTS.some((account) => account.email === email)) return { error: 'Not a demo account.' };

  // From Botswana a single Clerk API call fails now and then; one retry covers it.
  for (let attempt = 1; ; attempt++) {
    try {
      const clerk = await clerkClient();
      const { data } = await clerk.users.getUserList({ emailAddress: [email] });
      const user = data[0];
      if (!user) return { error: `${email} is not set up in Clerk yet. Run scripts/sync-users-to-clerk.mjs.` };
      const token = await clerk.signInTokens.createSignInToken({ userId: user.id, expiresInSeconds: 120 });
      return { ticket: token.token };
    } catch (error) {
      if (attempt >= 2) {
        console.error('[afrideal] demo sign-in ticket failed', error);
        return { error: 'Could not reach Clerk. Try again in a moment.' };
      }
    }
  }
}
